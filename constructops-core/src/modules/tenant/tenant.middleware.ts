import type { RequestHandler } from "express";

import { env } from "../../config/env";
import { AppError } from "../../lib/errors";
import { asyncHandler } from "../../lib/asyncHandler";
import type { TenantCache } from "./tenant.cache";
import type { TenantRepository } from "./tenant.repository";

export function normalizeHost(raw: string | undefined): string {
  let host = (raw ?? "").trim().toLowerCase();
  if (!host) return "";
  if (host.includes(",")) host = host.split(",")[0]!.trim();
  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    host = end >= 0 ? host.slice(0, end + 1) : host;
  } else {
    host = host.split(":")[0]!;
  }

  if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") {
    return env.DEV_TENANT_HOST.trim().toLowerCase();
  }
  return host;
}

export function tenantResolver(repo: TenantRepository, cache: TenantCache): RequestHandler {
  return asyncHandler(async (req, _res, next) => {
    const override = env.NODE_ENV === "production" ? undefined : req.header("x-tenant-host");
    const host = normalizeHost(override || req.headers.host);

    if (!host) throw new AppError(400, "A workspace host is required.", "tenant_required");

    const cached = await cache.get(host);
    if (cached) {
      req.tenant = cached;
      return next();
    }

    const subdomain = host.endsWith(".localhost") ? host.slice(0, -".localhost".length) : host.split(".")[0]!;
    const tenant = await repo.findByHost(host, subdomain || null);
    if (!tenant) throw new AppError(404, "Workspace not found.", "tenant_not_found");

    await cache.set(host, tenant);
    req.tenant = tenant;
    next();
  });
}
