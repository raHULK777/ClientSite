import type { RequestHandler } from "express";

import type { Role } from "@constructops/shared";

import type { Database } from "../config/database";
import { asyncHandler } from "../lib/asyncHandler";
import { SESSION_COOKIE } from "../lib/cookies";
import { forbidden, unauthorized } from "../lib/errors";
import { verifySession } from "../lib/jwt";
import { UserRepository } from "../modules/auth/user.repository";
import { publicUser } from "../modules/auth/user.types";

function bearer(req: Parameters<RequestHandler>[0]): string | null {
  const header = req.header("authorization");
  return header?.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : null;
}

export function authenticate(db: Database): RequestHandler {
  const users = new UserRepository(db);
  return asyncHandler(async (req, _res, next) => {
    const token = req.cookies?.[SESSION_COOKIE] ?? bearer(req);
    if (!token) throw unauthorized();

    const payload = verifySession(token);
    if (!payload) throw unauthorized("Your session has expired.");
    if (!req.tenant || payload.tenantId !== req.tenant.id) {
      throw forbidden("This session does not belong to this workspace.");
    }

    const user = await users.findById(payload.tenantId, payload.sub);
    if (!user) throw unauthorized("Your session is no longer valid.");

    req.user = { ...publicUser(user) };
    next();
  });
}

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}

export function requireCsrf(req: Parameters<RequestHandler>[0], _res: Parameters<RequestHandler>[1], next: Parameters<RequestHandler>[2]) {
  const safe = ["GET", "HEAD", "OPTIONS"];
  if (safe.includes(req.method) || bearer(req) || !req.cookies?.[SESSION_COOKIE]) return next();

  const cookie = req.cookies?.co_csrf;
  const header = req.header("x-csrf-token");
  if (!cookie || !header || cookie !== header) return next(forbidden("Invalid CSRF token."));
  next();
}
