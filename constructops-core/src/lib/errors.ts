export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
    readonly code = "request_failed",
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function badRequest(message: string, details?: unknown): AppError {
  return new AppError(400, message, "bad_request", details);
}

export function unauthorized(message = "Sign in to continue."): AppError {
  return new AppError(401, message, "unauthorized");
}

export function forbidden(message = "You do not have access to this resource."): AppError {
  return new AppError(403, message, "forbidden");
}

export function notFound(message = "Not found."): AppError {
  return new AppError(404, message, "not_found");
}

export function conflict(message: string): AppError {
  return new AppError(409, message, "conflict");
}
