import type { PricingMatrix } from "@constructops/shared";

export type TenantPalette = {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
};

export type TenantBranding = {
  typography: { fontFamily: string; baseSize: string };
  layout: { navbarStyle: string; sidebarPosition: string; borderRadius: string };
  assets: { faviconUrl: string; emailBannerUrl: string };
  palette: { background: string; surface: string };
};

export type TenantContext = {
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
  };
  branding: TenantBranding;
  pricingMatrix: PricingMatrix | null;
};

export type TenantRow = {
  id: string;
  company_name: string;
  subdomain: string;
  custom_domain: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  enable_estimator: boolean;
  enable_client_portal: boolean;
  enable_change_orders: boolean;
  estimator_pricing_matrix: unknown;
  branding_config: unknown;
};
