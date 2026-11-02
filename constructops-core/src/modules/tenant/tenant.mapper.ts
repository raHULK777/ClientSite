import { pricingMatrixSchema } from "@constructops/shared";

import type { TenantBranding, TenantContext, TenantRow } from "./tenant.types";

const DEFAULT_BRANDING: TenantBranding = {
  typography: { fontFamily: "Archivo", baseSize: "16px" },
  layout: { navbarStyle: "ruled", sidebarPosition: "left", borderRadius: "0" },
  assets: { faviconUrl: "/favicon.ico", emailBannerUrl: "/email-banner.png" },
  palette: { background: "#F8F9F9", surface: "#FFFFFF" },
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function parseBranding(value: unknown): TenantBranding {
  if (typeof value === "string") {
    try {
      return parseBranding(JSON.parse(value));
    } catch {
      return DEFAULT_BRANDING;
    }
  }

  const root = record(value);
  const typography = record(root.typography);
  const layout = record(root.layout);
  const assets = record(root.assets);
  const palette = record(root.palette);

  return {
    typography: {
      fontFamily: text(typography.font_family, DEFAULT_BRANDING.typography.fontFamily),
      baseSize: text(typography.base_size, DEFAULT_BRANDING.typography.baseSize),
    },
    layout: {
      navbarStyle: text(layout.navbar_style, DEFAULT_BRANDING.layout.navbarStyle),
      sidebarPosition: text(layout.sidebar_position, DEFAULT_BRANDING.layout.sidebarPosition),
      borderRadius: text(layout.border_radius, DEFAULT_BRANDING.layout.borderRadius),
    },
    assets: {
      faviconUrl: text(assets.favicon_url, DEFAULT_BRANDING.assets.faviconUrl),
      emailBannerUrl: text(assets.email_banner_url, DEFAULT_BRANDING.assets.emailBannerUrl),
    },
    palette: {
      background: text(palette.background, DEFAULT_BRANDING.palette.background),
      surface: text(palette.surface, DEFAULT_BRANDING.palette.surface),
    },
  };
}

function parseMatrix(value: unknown): TenantContext["pricingMatrix"] {
  const candidate = typeof value === "string" ? safeJson(value) : value;
  const parsed = pricingMatrixSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function mapTenant(row: TenantRow): TenantContext {
  const branding = parseBranding(row.branding_config);
  return {
    id: row.id,
    companyName: row.company_name,
    subdomain: row.subdomain,
    customDomain: row.custom_domain,
    logoUrl: row.logo_url,
    palette: {
      primary: row.primary_color ?? "#15202B",
      secondary: row.secondary_color ?? "#B3261E",
      background: branding.palette.background,
      surface: branding.palette.surface,
    },
    features: {
      estimator: row.enable_estimator,
      clientPortal: row.enable_client_portal,
      changeOrders: row.enable_change_orders,
      projectChat: row.enable_project_chat,
    },
    branding,
    pricingMatrix: parseMatrix(row.estimator_pricing_matrix),
  };
}

export function adminTenant(tenant: TenantContext) {
  return {
    ...publicTenant(tenant),
    pricingMatrix: tenant.pricingMatrix,
  };
}

export function publicTenant(tenant: TenantContext) {
  return {
    id: tenant.id,
    companyName: tenant.companyName,
    subdomain: tenant.subdomain,
    customDomain: tenant.customDomain,
    logoUrl: tenant.logoUrl,
    palette: tenant.palette,
    features: tenant.features,
    branding: tenant.branding,
  };
}
