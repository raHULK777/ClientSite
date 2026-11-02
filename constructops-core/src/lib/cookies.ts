import { randomBytes } from "node:crypto";

import type { CookieOptions, Response } from "express";

import { env } from "../config/env";

export const SESSION_COOKIE = "co_session";
export const CSRF_COOKIE = "co_csrf";

const maxAgeMs = 8 * 60 * 60 * 1000;

function baseOptions(): CookieOptions {
  return {
    path: "/",
    sameSite: "lax",
    secure: env.COOKIE_SECURE,
    domain: env.COOKIE_DOMAIN || undefined,
  };
}

export function issueSession(res: Response, token: string): string {
  const csrfToken = randomBytes(32).toString("base64url");
  res.cookie(SESSION_COOKIE, token, { ...baseOptions(), httpOnly: true, maxAge: maxAgeMs });
  res.cookie(CSRF_COOKIE, csrfToken, { ...baseOptions(), httpOnly: false, maxAge: maxAgeMs });
  return csrfToken;
}

export function clearSession(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { ...baseOptions(), httpOnly: true });
  res.clearCookie(CSRF_COOKIE, { ...baseOptions(), httpOnly: false });
}
