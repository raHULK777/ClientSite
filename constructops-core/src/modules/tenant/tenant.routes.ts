import { Router } from "express";

import {
  pricingMatrixSchema,
  tenantBrandingUpdateSchema,
  tenantFeaturesUpdateSchema,
  type PricingMatrix,
  type TenantBrandingUpdateInput,
  type TenantFeaturesUpdateInput,
} from "@constructops/shared";

import type { Database } from "../../config/database";
import { asyncHandler } from "../../lib/asyncHandler";
import { notFound } from "../../lib/errors";
import { ok } from "../../lib/http";
import { authenticate, requireRole } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { normalizeHost } from "./tenant.middleware";
import { adminTenant } from "./tenant.mapper";
import type { TenantCache } from "./tenant.cache";
import { TenantRepository } from "./tenant.repository";
import { recordAudit } from "../audit/audit.repository";
import type { TenantBranding, TenantContext } from "./tenant.types";

function mergeBranding(current: TenantBranding, input: TenantBrandingUpdateInput): TenantBranding {
  return {
    typography: {
      fontFamily: input.typography?.fontFamily ?? current.typography.fontFamily,
      baseSize: input.typography?.baseSize ?? current.typography.baseSize,
    },
    layout: {
      navbarStyle: input.layout?.navbarStyle ?? current.layout.navbarStyle,
      sidebarPosition: input.layout?.sidebarPosition ?? current.layout.sidebarPosition,
      borderRadius: input.layout?.borderRadius ?? current.layout.borderRadius,
    },
    assets: {
      faviconUrl: input.assets?.faviconUrl ?? current.assets.faviconUrl,
      emailBannerUrl: input.assets?.emailBannerUrl ?? current.assets.emailBannerUrl,
    },
    palette: {
      background: input.palette?.background ?? current.palette.background,
      surface: input.palette?.surface ?? current.palette.surface,
    },
  };
}

function hasBrandingChanges(input: TenantBrandingUpdateInput): boolean {
  return Boolean(input.palette || input.typography || input.layout || input.assets);
}

async function invalidate(cache: TenantCache, host: string, tenant: TenantContext): Promise<void> {
  const keys = new Set([host, tenant.subdomain, `${tenant.subdomain}.localhost`]);
  if (tenant.customDomain) keys.add(tenant.customDomain);
  await Promise.all([...keys].filter(Boolean).map((key) => cache.clear(key)));
}

export function tenantAdminRouter(db: Database, cache: TenantCache): Router {
  const router = Router();
  const tenants = new TenantRepository(db);

  router.use(authenticate(db), requireRole("admin"));

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      ok(res, { tenant: adminTenant(req.tenant!) });
    }),
  );

  router.patch(
    "/branding",
    validateBody(tenantBrandingUpdateSchema),
    asyncHandler(async (req, res) => {
      const tenant = req.tenant!;
      const input = req.body as TenantBrandingUpdateInput;
      const branding = hasBrandingChanges(input) ? mergeBranding(tenant.branding, input) : undefined;

      const updated = await tenants.updateBranding(tenant.id, {
        companyName: input.companyName,
        logoUrl: input.logoUrl,
        primaryColor: input.palette?.primary,
        secondaryColor: input.palette?.secondary,
        branding,
      });
      if (!updated) throw notFound("Workspace not found.");

      await invalidate(cache, normalizeHost(req.headers.host), updated);
      await recordAudit(db, {
        tenantId: tenant.id,
        actorId: req.user!.id,
        action: "tenant.branding_updated",
        entityType: "tenant",
        entityId: tenant.id,
        metadata: { fields: Object.keys(input) },
        ip: req.ip ?? null,
      });
      ok(res, { tenant: adminTenant(updated) });
    }),
  );

  router.patch(
    "/features",
    validateBody(tenantFeaturesUpdateSchema),
    asyncHandler(async (req, res) => {
      const tenant = req.tenant!;
      const input = req.body as TenantFeaturesUpdateInput;
      const updated = await tenants.updateFeatures(tenant.id, input);
      if (!updated) throw notFound("Workspace not found.");

      await invalidate(cache, normalizeHost(req.headers.host), updated);
      await recordAudit(db, {
        tenantId: tenant.id,
        actorId: req.user!.id,
        action: "tenant.features_updated",
        entityType: "tenant",
        entityId: tenant.id,
        metadata: input,
        ip: req.ip ?? null,
      });
      ok(res, { tenant: adminTenant(updated) });
    }),
  );

  router.put(
    "/pricing",
    validateBody(pricingMatrixSchema),
    asyncHandler(async (req, res) => {
      const tenant = req.tenant!;
      const matrix = req.body as PricingMatrix;
      const updated = await tenants.updatePricingMatrix(tenant.id, matrix);
      if (!updated) throw notFound("Workspace not found.");

      await invalidate(cache, normalizeHost(req.headers.host), updated);
      await recordAudit(db, {
        tenantId: tenant.id,
        actorId: req.user!.id,
        action: "tenant.pricing_updated",
        entityType: "tenant",
        entityId: tenant.id,
        metadata: { projectTypes: Object.keys(matrix.project_types), addons: Object.keys(matrix.addons) },
        ip: req.ip ?? null,
      });
      ok(res, { tenant: adminTenant(updated) });
    }),
  );

  return router;
}
