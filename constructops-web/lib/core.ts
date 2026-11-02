import type { Role } from "@constructops/shared";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import type { SessionUser } from "./api-types";
import { coreApiBase, coreRequest, readJson, type CoreResponse } from "./core-request";

export { coreApiBase };

export class CoreApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly details: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "CoreApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type CoreFetchOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

export async function coreFetch<T>(path: string, options: CoreFetchOptions = {}): Promise<T> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const forwardedHost = headerStore.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || headerStore.get("host") || "";

  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    ...options.headers,
  };

  const cookieHeader = cookieStore.toString();
  if (cookieHeader) requestHeaders.Cookie = cookieHeader;

  let body: string | undefined;
  if (options.body !== undefined) {
    body = JSON.stringify(options.body);
    requestHeaders["Content-Type"] = "application/json";
  }

  let response: CoreResponse;
  try {
    response = await coreRequest({
      path: `/api/v1${path}`,
      method: options.method ?? "GET",
      headers: requestHeaders,
      body,
      tenantHost: host || undefined,
      signal: options.signal,
    });
  } catch {
    throw new CoreApiError("The workspace service is not responding.", 503, "unreachable");
  }

  const payload = readJson(response);

  if (response.status < 200 || response.status >= 300) {
    const record =
      payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    const message =
      typeof record.error === "string" ? record.error : `Request failed (${response.status}).`;
    throw new CoreApiError(
      message,
      response.status,
      typeof record.code === "string" ? record.code : undefined,
      record.details,
    );
  }

  if (!payload || typeof payload !== "object" || !("data" in payload)) {
    return undefined as T;
  }
  return (payload as { data: T }).data;
}

export const getSession = cache(async (): Promise<SessionUser | null> => {
  try {
    const data = await coreFetch<{ user: SessionUser }>("/auth/me");
    return data.user;
  } catch (error) {
    if (error instanceof CoreApiError && error.status === 401) return null;
    throw error;
  }
});

export function homeForRole(role: Role): string {
  return role === "client" ? "/portal" : "/app";
}

export async function requireSession(allowed?: Role[]): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  if (allowed && !allowed.includes(user.role)) redirect(homeForRole(user.role));
  return user;
}
