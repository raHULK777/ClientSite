import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";

import type { TenantPalette } from "@constructops/shared";

import { coreRequest, readJson, type CoreResponse } from "./core-request";

export type PublicTenant = {
  id: string;
  companyName: string;
  subdomain: string;
  customDomain: string | null;
  logoUrl: string | null;
  palette: TenantPalette;
  features: {
    estimator: boolean;
    clientPortal: boolean;
    changeOrders: boolean;
    projectChat: boolean;
  };
  branding: {
    typography: { fontFamily: string; baseSize: string };
    layout: { navbarStyle: string; sidebarPosition: string; borderRadius: string };
    assets: { faviconUrl: string; emailBannerUrl: string };
    palette: { background: string; surface: string };
  };
};

export type EstimatorOptions = {
  currency: string;
  projectTypes: { key: string; label: string; minSquareFeet: number; maxSquareFeet: number }[];
  materialTiers: { key: string; label: string }[];
  complexity: { key: string; label: string }[];
  addons: { key: string; label: string }[];
};

export type TenantPayload = {
  tenant: PublicTenant;
  estimator: {
    enabled: boolean;
    options: EstimatorOptions | null;
  };
};

const FALLBACK_TENANT: PublicTenant = {
  id: "demo",
  companyName: "Santos Construction",
  subdomain: "santos",
  customDomain: null,
  logoUrl: null,
  palette: {
    primary: "#0B1220",
    secondary: "#C2410C",
    background: "#F6F3ED",
    surface: "#FFFFFF",
  },
  features: { estimator: true, clientPortal: true, changeOrders: true, projectChat: false },
  branding: {
    typography: { fontFamily: "Archivo", baseSize: "16px" },
    layout: { navbarStyle: "ruled", sidebarPosition: "left", borderRadius: "0" },
    assets: { faviconUrl: "/favicon.ico", emailBannerUrl: "/email-banner.png" },
    palette: { background: "#F6F3ED", surface: "#FFFFFF" },
  },
};

const FALLBACK_OPTIONS: EstimatorOptions = {
  currency: "USD",
  projectTypes: [
    { key: "kitchen", label: "Kitchen remodel", minSquareFeet: 40, maxSquareFeet: 600 },
    { key: "bath", label: "Bath remodel", minSquareFeet: 20, maxSquareFeet: 180 },
    { key: "addition", label: "Addition", minSquareFeet: 80, maxSquareFeet: 1200 },
    { key: "structural", label: "Structural repair", minSquareFeet: 20, maxSquareFeet: 400 },
  ],
  materialTiers: [
    { key: "standard", label: "Standard" },
    { key: "premium", label: "Premium" },
    { key: "luxury", label: "Luxury" },
  ],
  complexity: [
    { key: "low", label: "Straightforward" },
    { key: "standard", label: "Standard" },
    { key: "high", label: "Complex" },
  ],
  addons: [
    { key: "structural", label: "Structural changes" },
    { key: "electrical", label: "Electrical upgrade" },
    { key: "plumbing", label: "Plumbing relocation" },
    { key: "permit", label: "Permit and inspection" },
    { key: "design", label: "Design and selections" },
  ],
};

const FALLBACK: TenantPayload = {
  tenant: FALLBACK_TENANT,
  estimator: { enabled: true, options: FALLBACK_OPTIONS },
};

export async function requestHost(): Promise<string> {
  const store = await headers();
  const forwarded = store.get("x-forwarded-host");
  const host = forwarded?.split(",")[0]?.trim() || store.get("host") || "";
  return host;
}

export async function fetchTenantPayload(): Promise<TenantPayload> {
  const host = await requestHost();

  let response: CoreResponse;
  try {
    response = await coreRequest({
      path: "/api/v1/public/tenant",
      headers: { Accept: "application/json" },
      tenantHost: host || undefined,
      timeoutMs: 2500,
    });
  } catch {
    return FALLBACK;
  }

  const body = readJson(response) as {
    success?: boolean;
    data?: TenantPayload;
    code?: string;
  } | null;

  if (response.status === 404 && body?.code === "tenant_not_found") {
    notFound();
  }

  if (response.status !== 200) return FALLBACK;
  if (!body?.success || !body.data?.tenant) return FALLBACK;

  return {
    tenant: body.data.tenant,
    estimator: body.data.estimator ?? { enabled: false, options: null },
  };
}


export const getTenantPayload = cache(fetchTenantPayload);
