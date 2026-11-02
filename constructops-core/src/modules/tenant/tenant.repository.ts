import type { PricingMatrix } from "@constructops/shared";

import { one, type Database } from "../../config/database";
import { mapTenant } from "./tenant.mapper";
import type { TenantBranding, TenantContext, TenantRow } from "./tenant.types";

const COLUMNS = `id, company_name, subdomain, custom_domain, logo_url, primary_color, secondary_color,
                 enable_estimator, enable_client_portal, enable_change_orders,
                 estimator_pricing_matrix, branding_config`;

export type BrandingUpdate = {
  companyName?: string;
  logoUrl?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  branding?: TenantBranding;
};

export type FeaturesUpdate = {
  estimator?: boolean;
  clientPortal?: boolean;
  changeOrders?: boolean;
};

function serializeBranding(branding: TenantBranding): Record<string, unknown> {
  return {
    typography: {
      font_family: branding.typography.fontFamily,
      base_size: branding.typography.baseSize,
    },
    layout: {
      navbar_style: branding.layout.navbarStyle,
      sidebar_position: branding.layout.sidebarPosition,
      border_radius: branding.layout.borderRadius,
    },
    assets: {
      favicon_url: branding.assets.faviconUrl,
      email_banner_url: branding.assets.emailBannerUrl,
    },
    palette: {
      background: branding.palette.background,
      surface: branding.palette.surface,
    },
  };
}

export class TenantRepository {
  constructor(private readonly db: Database) {}

  async findByHost(host: string, subdomain: string | null): Promise<TenantContext | null> {
    const row = await one<TenantRow>(
      this.db,
      `SELECT ${COLUMNS}
       FROM tenants
       WHERE custom_domain = $1 OR ($2::text IS NOT NULL AND subdomain = $2)
       LIMIT 1`,
      [host, subdomain],
    );
    return row ? mapTenant(row) : null;
  }

  async findById(id: string): Promise<TenantContext | null> {
    const row = await one<TenantRow>(this.db, `SELECT ${COLUMNS} FROM tenants WHERE id = $1 LIMIT 1`, [id]);
    return row ? mapTenant(row) : null;
  }

  async updateBranding(id: string, input: BrandingUpdate): Promise<TenantContext | null> {
    const fields: string[] = [];
    const values: unknown[] = [id];
    const set = (column: string, value: unknown) => {
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    };

    if (input.companyName !== undefined) set("company_name", input.companyName);
    if (input.logoUrl !== undefined) set("logo_url", input.logoUrl);
    if (input.primaryColor !== undefined) set("primary_color", input.primaryColor);
    if (input.secondaryColor !== undefined) set("secondary_color", input.secondaryColor);
    if (input.branding !== undefined) set("branding_config", JSON.stringify(serializeBranding(input.branding)));

    if (!fields.length) return this.findById(id);

    const row = await one<TenantRow>(
      this.db,
      `UPDATE tenants SET ${fields.join(", ")} WHERE id = $1 RETURNING ${COLUMNS}`,
      values,
    );
    return row ? mapTenant(row) : null;
  }

  async updateFeatures(id: string, input: FeaturesUpdate): Promise<TenantContext | null> {
    const fields: string[] = [];
    const values: unknown[] = [id];
    const set = (column: string, value: boolean) => {
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    };

    if (input.estimator !== undefined) set("enable_estimator", input.estimator);
    if (input.clientPortal !== undefined) set("enable_client_portal", input.clientPortal);
    if (input.changeOrders !== undefined) set("enable_change_orders", input.changeOrders);

    if (!fields.length) return this.findById(id);

    const row = await one<TenantRow>(
      this.db,
      `UPDATE tenants SET ${fields.join(", ")} WHERE id = $1 RETURNING ${COLUMNS}`,
      values,
    );
    return row ? mapTenant(row) : null;
  }

  async updatePricingMatrix(id: string, matrix: PricingMatrix): Promise<TenantContext | null> {
    const row = await one<TenantRow>(
      this.db,
      `UPDATE tenants SET estimator_pricing_matrix = $2::jsonb WHERE id = $1 RETURNING ${COLUMNS}`,
      [id, JSON.stringify(matrix)],
    );
    return row ? mapTenant(row) : null;
  }
}
