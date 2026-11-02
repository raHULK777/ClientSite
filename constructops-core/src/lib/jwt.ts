import jwt, { type SignOptions } from "jsonwebtoken";

import { env } from "../config/env";
import type { Role } from "@constructops/shared";

export type SessionPayload = {
  sub: string;
  tenantId: string;
  role: Role;
};

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (typeof decoded === "string") return null;
    const { sub, tenantId, role } = decoded;
    if (typeof sub !== "string" || typeof tenantId !== "string") return null;
    if (role !== "admin" && role !== "field_staff" && role !== "client") return null;
    return { sub, tenantId, role };
  } catch {
    return null;
  }
}
