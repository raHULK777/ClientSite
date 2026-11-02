import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import {
  EstimateError,
  estimateProject,
  estimateRequestSchema,
  publicEstimatorOptions,
} from "@constructops/shared";

import { env } from "../../config/env";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/errors";
import { ok } from "../../lib/http";
import { validateBody } from "../../middleware/validate";
import { publicTenant } from "../tenant/tenant.mapper";

const estimateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.RATE_LIMIT_DISABLED || env.NODE_ENV === "test",
  message: { success: false, error: "Too many estimates. Try again in a few minutes." },
});

export function publicRouter(): Router {
  const router = Router();

  router.get(
    "/tenant",
    asyncHandler(async (req, res) => {
      const tenant = req.tenant!;
      ok(res, {
        tenant: publicTenant(tenant),
        estimator: {
          enabled: tenant.features.estimator && Boolean(tenant.pricingMatrix),
          options: tenant.pricingMatrix ? publicEstimatorOptions(tenant.pricingMatrix) : null,
        },
      });
    }),
  );

  router.post(
    "/estimate",
    estimateLimiter,
    validateBody(estimateRequestSchema),
    asyncHandler(async (req, res) => {
      const tenant = req.tenant!;
      if (!tenant.features.estimator) {
        throw new AppError(503, "Estimates are not available for this workspace.", "estimator_disabled");
      }
      if (!tenant.pricingMatrix) {
        throw new AppError(503, "Estimating is temporarily unavailable.", "estimator_unavailable");
      }

      try {
        const result = estimateProject(req.body, tenant.pricingMatrix);
        ok(res, result);
      } catch (error) {
        if (error instanceof EstimateError) {
          throw new AppError(400, error.message, error.code);
        }
        throw error;
      }
    }),
  );

  return router;
}
