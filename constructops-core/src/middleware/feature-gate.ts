import type { RequestHandler } from "express";

import type { TenantContext } from "../modules/tenant/tenant.types";
import { forbidden } from "../lib/errors";

export function featureGate(feature: keyof TenantContext["features"]): RequestHandler {
  return (req, _res, next) => {
    if (!req.tenant?.features[feature]) {
      return next(forbidden("This feature is not enabled for this workspace."));
    }
    next();
  };
}
