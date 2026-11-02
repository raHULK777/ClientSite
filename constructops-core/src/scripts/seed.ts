import { createHash } from "node:crypto";

import bcrypt from "bcryptjs";

import { closeDatabase, getDatabase } from "../config/database";
import type { PricingMatrix } from "@constructops/shared";
import { migrate } from "./migrate";

const TENANT_ID = "11111111-1111-4111-8111-111111111111";
const ADMIN_ID = "22222222-2222-4222-8222-222222222222";
const FIELD_ID = "33333333-3333-4333-8333-333333333333";
const CLIENT_ID = "44444444-4444-4444-8444-444444444444";
const CLIENT_TWO_ID = "55555555-5555-4555-8555-555555555555";
const PROJECT_KITCHEN_ID = "66666666-6666-4666-8666-666666666666";
const PROJECT_BATH_ID = "77777777-7777-4777-8777-777777777777";
const PROJECT_ADDITION_ID = "88888888-8888-4888-8888-888888888888";
const CO_ELECTRICAL_ID = "99999999-9999-4999-8999-999999999999";
const CO_HARDWARE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CO_BEAM_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

export const DEMO_PASSWORD = "SantosDemo!23";

export const santosPricingMatrix: PricingMatrix = {
  currency: "USD",
  minimum_charge: 3500,
  contingency_rate: 0.08,
  range_spread: 0.07,
  project_types: {
    kitchen: { label: "Kitchen remodel", base: 8500, rate_per_sf: 210, min_sf: 40, max_sf: 600 },
    bath: { label: "Bath remodel", base: 7200, rate_per_sf: 260, min_sf: 20, max_sf: 180 },
    addition: { label: "Addition", base: 12000, rate_per_sf: 185, min_sf: 80, max_sf: 1200 },
    structural: { label: "Structural repair", base: 5000, rate_per_sf: 145, min_sf: 20, max_sf: 400 },
  },
  material_tiers: {
    standard: { label: "Standard", multiplier: 1 },
    premium: { label: "Premium", multiplier: 1.28 },
    luxury: { label: "Luxury", multiplier: 1.55 },
  },
  complexity: {
    low: { label: "Straightforward", multiplier: 0.94 },
    standard: { label: "Standard", multiplier: 1 },
    high: { label: "Complex", multiplier: 1.16 },
  },
  addons: {
    structural: { label: "Structural changes", flat: 4200 },
    electrical: { label: "Electrical upgrade", flat: 1900 },
    plumbing: { label: "Plumbing relocation", flat: 2600 },
    permit: { label: "Permit and inspection", flat: 850 },
    design: { label: "Design and selections", flat: 2400 },
  },
};

const brandingConfig = {
  typography: { font_family: "Archivo", base_size: "16px" },
  layout: { navbar_style: "ruled", sidebar_position: "left", border_radius: "0" },
  assets: { favicon_url: "/favicon.ico", email_banner_url: "/email-banner.png" },
  palette: { background: "#F6F3ED", surface: "#FFFFFF" },
};

function signatureHash(payload: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export async function seed(): Promise<void> {
  await migrate();
  const db = getDatabase();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  await db.query(
    `INSERT INTO tenants (
      id, company_name, subdomain, custom_domain, logo_url, primary_color, secondary_color,
      enable_estimator, enable_client_portal, enable_change_orders, enable_project_chat,
      estimator_pricing_matrix, branding_config
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    ON CONFLICT (id) DO UPDATE SET
      company_name = EXCLUDED.company_name,
      subdomain = EXCLUDED.subdomain,
      custom_domain = EXCLUDED.custom_domain,
      primary_color = EXCLUDED.primary_color,
      secondary_color = EXCLUDED.secondary_color,
      enable_estimator = EXCLUDED.enable_estimator,
      enable_client_portal = EXCLUDED.enable_client_portal,
      enable_change_orders = EXCLUDED.enable_change_orders,
      enable_project_chat = EXCLUDED.enable_project_chat,
      estimator_pricing_matrix = EXCLUDED.estimator_pricing_matrix,
      branding_config = EXCLUDED.branding_config`,
    [
      TENANT_ID,
      "Santos Construction",
      "santos",
      "santos.constructops.test",
      null,
      "#0B1220",
      "#C2410C",
      true,
      true,
      true,
      false,
      JSON.stringify(santosPricingMatrix),
      JSON.stringify(brandingConfig),
    ],
  );

  const users = [
    [ADMIN_ID, "owner@santos.test", "admin", "Marisol", "Santos"],
    [FIELD_ID, "field@santos.test", "field_staff", "Danny", "Ortiz"],
    [CLIENT_ID, "client@santos.test", "client", "Avery", "Chen"],
    [CLIENT_TWO_ID, "client2@santos.test", "client", "Priya", "Raman"],
  ] as const;

  for (const [id, email, role, firstName, lastName] of users) {
    await db.query(
      `INSERT INTO users (id, tenant_id, email, password_hash, role, first_name, last_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (tenant_id, email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name`,
      [id, TENANT_ID, email, passwordHash, role, firstName, lastName],
    );
  }

  const projects = [
    [PROJECT_KITCHEN_ID, CLIENT_ID, "Elm Street Kitchen", "active", "Cabinets", 62, "48200.00"],
    [PROJECT_BATH_ID, CLIENT_ID, "Harbor Bath", "planning", "Permitting", 10, "26400.00"],
    [PROJECT_ADDITION_ID, CLIENT_TWO_ID, "Ridge Addition", "active", "Framing", 35, "128900.00"],
  ] as const;

  for (const [id, clientId, name, status, phase, progress, cost] of projects) {
    await db.query(
      `INSERT INTO projects (id, tenant_id, client_id, project_name, status, current_phase, progress_percentage, estimated_cost)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET
         client_id = EXCLUDED.client_id,
         project_name = EXCLUDED.project_name,
         status = EXCLUDED.status,
         current_phase = EXCLUDED.current_phase,
         progress_percentage = EXCLUDED.progress_percentage,
         estimated_cost = EXCLUDED.estimated_cost,
         updated_at = NOW()`,
      [id, TENANT_ID, clientId, name, status, phase, progress, cost],
    );
  }

  const orders = [
    [CO_ELECTRICAL_ID, PROJECT_KITCHEN_ID, "Island electrical upgrade", "Add two circuits and a vented hood for the island.", "2450.00", "pending"],
    [CO_HARDWARE_ID, PROJECT_KITCHEN_ID, "Cabinet hardware allowance", "Upgrade to brushed brass hardware throughout.", "380.00", "approved"],
    [CO_BEAM_ID, PROJECT_ADDITION_ID, "Structural beam", "Replace the rear header with an engineered beam.", "8900.00", "pending"],
  ] as const;

  for (const [id, projectId, title, description, cost, status] of orders) {
    await db.query(
      `INSERT INTO change_orders (id, tenant_id, project_id, title, description, cost_impact, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         cost_impact = EXCLUDED.cost_impact,
         status = EXCLUDED.status`,
      [id, TENANT_ID, projectId, title, description, cost, status],
    );
  }

  await db.query(
    `DELETE FROM change_order_signatures
     WHERE tenant_id = $1
       AND change_order_id IN (
         SELECT id FROM change_orders WHERE tenant_id = $1 AND status = 'pending'
       )`,
    [TENANT_ID],
  );

  await db.query(
    `UPDATE change_orders
     SET signed_by = NULL, signed_at = NULL, ip_address = NULL
     WHERE tenant_id = $1 AND status = 'pending'`,
    [TENANT_ID],
  );

  const approvedAt = "2026-10-18T15:42:00.000Z";
  const payload = {
    changeOrderId: CO_HARDWARE_ID,
    tenantId: TENANT_ID,
    projectId: PROJECT_KITCHEN_ID,
    userId: CLIENT_ID,
    signerName: "Avery Chen",
    costImpact: 380,
    signedAt: approvedAt,
  };

  await db.query(
    `UPDATE change_orders
     SET status = 'approved', signed_by = $1, signed_at = $2, ip_address = $3
     WHERE id = $4 AND tenant_id = $5`,
    [CLIENT_ID, approvedAt, "203.0.113.10", CO_HARDWARE_ID, TENANT_ID],
  );

  await db.query(
    `INSERT INTO change_order_signatures (
       id, tenant_id, change_order_id, user_id, signer_name, consent_text, signature_hash, ip_address, user_agent, signed_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (change_order_id) DO NOTHING`,
    [
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      TENANT_ID,
      CO_HARDWARE_ID,
      CLIENT_ID,
      "Avery Chen",
      "I approve this change order and the revised contract amount.",
      signatureHash(payload),
      "203.0.113.10",
      "Seed fixture",
      approvedAt,
    ],
  );

  await db.query(
    `INSERT INTO audit_events (id, tenant_id, actor_id, action, entity_type, entity_id, metadata, ip_address)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (id) DO NOTHING`,
    [
      "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      TENANT_ID,
      CLIENT_ID,
      "change_order.approved",
      "change_order",
      CO_HARDWARE_ID,
      JSON.stringify({ costImpact: 380, signatureHash: signatureHash(payload) }),
      "203.0.113.10",
    ],
  );

  console.log("Seeded demo tenant santos (Santos Construction).");
  console.log(`Demo logins use password ${DEMO_PASSWORD}; rotate before production.`);
  console.log("owner@santos.test (admin) · field@santos.test (field staff) · client@santos.test (client)");
}

if (process.env.NODE_ENV !== "test" && require.main === module) {
  seed()
    .then(() => closeDatabase())
    .then(() => console.log("Seed complete."))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
