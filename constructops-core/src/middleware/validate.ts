import type { RequestHandler } from "express";
import type { ZodType } from "zod";

import { badRequest } from "../lib/errors";

function issues(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  return error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
}

export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return next(badRequest("Check the submitted fields.", issues(parsed.error)));
    req.body = parsed.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return next(badRequest("Check the query parameters.", issues(parsed.error)));
    _res.locals.query = parsed.data;
    next();
  };
}

export function validateParams<T>(schema: ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.params);
    if (!parsed.success) return next(badRequest("Invalid resource identifier.", issues(parsed.error)));
    req.params = parsed.data as typeof req.params;
    next();
  };
}
