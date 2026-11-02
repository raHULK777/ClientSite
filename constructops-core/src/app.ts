import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import pino from "pino";
import pinoHttp from "pino-http";
import { ZodError } from "zod";

import { EstimateError } from "@constructops/shared";

import { getDatabase, type Database } from "./config/database";
import { env } from "./config/env";
import { AppError } from "./lib/errors";
import { requireCsrf } from "./middleware/auth";
import { auditRouter } from "./modules/audit/audit.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { changeOrderRouter } from "./modules/change-orders/change-order.routes";
import { projectRouter } from "./modules/projects/project.routes";
import { publicRouter } from "./modules/public/public.routes";
import { TenantCache } from "./modules/tenant/tenant.cache";
import { tenantResolver } from "./modules/tenant/tenant.middleware";
import { TenantRepository } from "./modules/tenant/tenant.repository";
import { tenantAdminRouter } from "./modules/tenant/tenant.routes";

const unsafe = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (origin === env.WEB_ORIGIN) return true;
  if (env.NODE_ENV === "production") return false;

  try {
    const allowed = new URL(env.WEB_ORIGIN);
    const candidate = new URL(origin);
    const localHost = allowed.hostname === "localhost" || allowed.hostname === "127.0.0.1";
    if (!localHost) return false;
    if (candidate.protocol !== allowed.protocol || candidate.port !== allowed.port) return false;
    return candidate.hostname === allowed.hostname || candidate.hostname.endsWith(`.${allowed.hostname}`);
  } catch {
    return false;
  }
}

function originGuard(req: Request, _res: Response, next: NextFunction) {
  if (!unsafe.has(req.method)) return next();
  if (!isAllowedOrigin(req.header("origin"))) {
    return next(new AppError(403, "This origin is not allowed to make changes.", "origin_rejected"));
  }
  next();
}

function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message,
      code: error.code,
      details: error.details,
      timestamp: new Date().toISOString(),
    });
  }

  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: "Check the submitted fields.",
      details: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      timestamp: new Date().toISOString(),
    });
  }

  if (error instanceof EstimateError) {
    return res.status(400).json({
      success: false,
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString(),
    });
  }

  const pgCode = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (pgCode === "23505") {
    return res.status(409).json({
      success: false,
      error: "That record already exists.",
      code: "conflict",
      timestamp: new Date().toISOString(),
    });
  }
  if (pgCode === "23503") {
    return res.status(400).json({
      success: false,
      error: "A related record is missing or cannot be changed.",
      code: "invalid_reference",
      timestamp: new Date().toISOString(),
    });
  }

  const clientStatus =
    typeof error === "object" && error
      ? Number((error as { status?: unknown; statusCode?: unknown }).status ?? (error as { statusCode?: unknown }).statusCode)
      : Number.NaN;
  if (Number.isInteger(clientStatus) && clientStatus >= 400 && clientStatus < 500) {
    const tooLarge = clientStatus === 413;
    return res.status(clientStatus).json({
      success: false,
      error: tooLarge ? "That request is too large." : "That request could not be processed.",
      code: tooLarge ? "payload_too_large" : "bad_request",
      timestamp: new Date().toISOString(),
    });
  }

  if (env.NODE_ENV !== "test") {
    console.error("Unhandled API error", { path: req.path, error });
  }

  res.status(500).json({
    success: false,
    error: "Something went wrong. Try again.",
    code: "internal_error",
    timestamp: new Date().toISOString(),
  });
}

export function createApp(db: Database = getDatabase()) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  const cache = new TenantCache(env.TENANT_CACHE_TTL_SECONDS, env.REDIS_URL || undefined);
  const tenants = new TenantRepository(db);
  const logger = pino({
    level: env.NODE_ENV === "test" ? "silent" : "info",
    redact: {
      paths: ["req.headers.cookie", "req.headers.authorization", "res.headers['set-cookie']"],
      censor: "[redacted]",
    },
  });

  app.use(pinoHttp({ logger, autoLogging: env.NODE_ENV !== "test" }));
  app.use(helmet());
  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "X-Tenant-Host"],
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use(originGuard);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "constructops-core", timestamp: new Date().toISOString() });
  });

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => env.RATE_LIMIT_DISABLED || env.NODE_ENV === "test",
  });
  app.use("/api/v1", apiLimiter, tenantResolver(tenants, cache));

  app.use("/api/v1/public", publicRouter());
  app.use("/api/v1/auth", authRouter(db));
  app.use("/api/v1/protected/tenant", requireCsrf, tenantAdminRouter(db, cache));
  app.use("/api/v1/protected/audit", requireCsrf, auditRouter(db));
  app.use("/api/v1/protected/projects", requireCsrf, projectRouter(db));
  app.use("/api/v1/protected/change-orders", requireCsrf, changeOrderRouter(db));

  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: "Route not found.",
      code: "not_found",
      timestamp: new Date().toISOString(),
    });
  });
  app.use(errorHandler);

  app.locals.tenantCache = cache;
  app.locals.database = db;
  app.locals.logger = logger;
  return app;
}
