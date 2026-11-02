import bcrypt from "bcryptjs";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import { loginSchema } from "@constructops/shared";

import type { Database } from "../../config/database";
import { env } from "../../config/env";
import { asyncHandler } from "../../lib/asyncHandler";
import { clearSession, issueSession } from "../../lib/cookies";
import { unauthorized } from "../../lib/errors";
import { ok } from "../../lib/http";
import { signSession } from "../../lib/jwt";
import { authenticate, requireCsrf } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { recordAudit } from "../audit/audit.repository";
import { UserRepository } from "./user.repository";
import { publicUser } from "./user.types";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.RATE_LIMIT_DISABLED || env.NODE_ENV === "test",
  message: { success: false, error: "Too many sign-in attempts. Try again later." },
});

export function authRouter(db: Database): Router {
  const router = Router();
  const users = new UserRepository(db);

  router.post(
    "/login",
    loginLimiter,
    validateBody(loginSchema),
    asyncHandler(async (req, res) => {
      const tenant = req.tenant;
      if (!tenant) throw unauthorized();

      const { email, password } = req.body as { email: string; password: string };
      const user = await users.findByEmail(tenant.id, email);
      const valid = user ? await bcrypt.compare(password, user.password_hash) : false;
      if (!user || !valid) throw unauthorized("Email or password is incorrect.");

      const token = signSession({ sub: user.id, tenantId: tenant.id, role: user.role });
      const csrfToken = issueSession(res, token);

      await recordAudit(db, {
        tenantId: tenant.id,
        actorId: user.id,
        action: "auth.login",
        entityType: "session",
        entityId: null,
        ip: req.ip ?? null,
      });

      ok(res, { user: publicUser(user), csrfToken });
    }),
  );

  router.get(
    "/me",
    authenticate(db),
    asyncHandler(async (req, res) => {
      ok(res, { user: req.user });
    }),
  );

  router.post(
    "/logout",
    requireCsrf,
    authenticate(db),
    asyncHandler(async (req, res) => {
      await recordAudit(db, {
        tenantId: req.tenant!.id,
        actorId: req.user!.id,
        action: "auth.logout",
        entityType: "session",
        entityId: null,
        ip: req.ip ?? null,
      });
      clearSession(res);
      ok(res, { signedOut: true });
    }),
  );

  return router;
}
