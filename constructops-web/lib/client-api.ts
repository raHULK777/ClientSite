"use client";

export class ClientApiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ClientApiError";
    this.status = status;
    this.details = details;
  }
}

function readCookie(name: string): string | null {
  const prefix = `${name}=`;
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return null;
}

type MutateOptions = {
  redirectOn401?: boolean;
};

export async function apiMutate<T>(
  path: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  body?: unknown,
  options: MutateOptions = {},
): Promise<T> {
  const requestHeaders: Record<string, string> = { Accept: "application/json" };
  const csrf = readCookie("co_csrf");
  if (csrf) requestHeaders["X-CSRF-Token"] = csrf;
  if (body !== undefined) requestHeaders["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(`/api/core${path}`, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new ClientApiError("The workspace service is not responding.", 503);
  }

  if (response.status === 401 && options.redirectOn401 !== false) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.assign(`/login?next=${next}`);
    throw new ClientApiError("Your session has ended. Sign in again.", 401);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? ((await response.json().catch(() => null)) as unknown)
    : null;
  const record =
    payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};

  if (!response.ok) {
    throw new ClientApiError(
      typeof record.error === "string" ? record.error : "The change could not be saved.",
      response.status,
      record.details,
    );
  }

  if (!record || !("data" in record)) return undefined as T;
  return record.data as T;
}
