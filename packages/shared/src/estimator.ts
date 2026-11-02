import { z } from "zod";

const money = z.number().finite().min(0).max(100_000_000);
const multiplier = z.number().finite().min(0.1).max(10);

export const pricingMatrixSchema = z.object({
  currency: z.string().length(3).default("USD"),
  minimum_charge: money.default(0),
  contingency_rate: z.number().min(0).max(0.25).default(0.08),
  range_spread: z.number().min(0).max(0.25).default(0.07),
  project_types: z.record(
    z.string(),
    z.object({
      label: z.string().min(1),
      base: money,
      rate_per_sf: money,
      min_sf: z.number().int().positive(),
      max_sf: z.number().int().positive(),
    }),
  ),
  material_tiers: z.record(z.string(), z.object({ label: z.string().min(1), multiplier })),
  complexity: z.record(z.string(), z.object({ label: z.string().min(1), multiplier })),
  addons: z.record(z.string(), z.object({ label: z.string().min(1), flat: money })),
});

export type PricingMatrix = z.infer<typeof pricingMatrixSchema>;

export const estimateRequestSchema = z.object({
  projectType: z.string().min(1).max(60),
  squareFeet: z.number().finite().positive().max(100_000),
  materialTier: z.string().min(1).max(60),
  complexity: z.string().min(1).max(60).optional(),
  addons: z.array(z.string().min(1).max(60)).max(20).default([]),
});

export type EstimateRequest = z.infer<typeof estimateRequestSchema>;

export type EstimateLineItem = {
  key: string;
  label: string;
  amountCents: number;
};

export type EstimateResult = {
  currency: string;
  lineItems: EstimateLineItem[];
  subtotalCents: number;
  contingencyCents: number;
  totalCents: number;
  range: { lowCents: number; highCents: number };
  assumptions: string[];
};

export class EstimateError extends Error {
  constructor(
    message: string,
    readonly code: "UNKNOWN_PROJECT_TYPE" | "UNKNOWN_TIER" | "UNKNOWN_COMPLEXITY" | "UNKNOWN_ADDON" | "OUT_OF_RANGE",
  ) {
    super(message);
    this.name = "EstimateError";
  }
}

function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

function multiplierAdjustment(baseCents: number, factor: number): number {
  return Math.round(baseCents * (factor - 1));
}

export function estimateProject(input: EstimateRequest, matrix: PricingMatrix): EstimateResult {
  const type = matrix.project_types[input.projectType];
  if (!type) throw new EstimateError(`Unknown project type "${input.projectType}".`, "UNKNOWN_PROJECT_TYPE");

  const tier = matrix.material_tiers[input.materialTier];
  if (!tier) throw new EstimateError(`Unknown material tier "${input.materialTier}".`, "UNKNOWN_TIER");

  const complexityKey = input.complexity ?? "standard";
  const complexity = matrix.complexity[complexityKey];
  if (!complexity) throw new EstimateError(`Unknown complexity "${complexityKey}".`, "UNKNOWN_COMPLEXITY");

  if (input.squareFeet < type.min_sf || input.squareFeet > type.max_sf) {
    throw new EstimateError(
      `${type.label} is priced between ${type.min_sf} and ${type.max_sf} square feet.`,
      "OUT_OF_RANGE",
    );
  }

  const addonKeys = [...new Set(input.addons)];
  const addons = addonKeys.map((key) => {
    const addon = matrix.addons[key];
    if (!addon) throw new EstimateError(`Unknown add-on "${key}".`, "UNKNOWN_ADDON");
    return { key, ...addon };
  });

  const baseCents = toCents(type.base);
  const areaCents = toCents(input.squareFeet * type.rate_per_sf);
  const tierCents = multiplierAdjustment(baseCents + areaCents, tier.multiplier);
  const complexityCents = multiplierAdjustment(baseCents + areaCents + tierCents, complexity.multiplier);
  const addonCents = addons.reduce((sum, addon) => sum + toCents(addon.flat), 0);

  const rawSubtotal = baseCents + areaCents + tierCents + complexityCents + addonCents;
  const subtotalCents = Math.max(toCents(matrix.minimum_charge), rawSubtotal);
  const contingencyCents = Math.round(subtotalCents * matrix.contingency_rate);
  const totalCents = subtotalCents + contingencyCents;
  const lowCents = Math.round(totalCents * (1 - matrix.range_spread));
  const highCents = Math.round(totalCents * (1 + matrix.range_spread));

  const lineItems: EstimateLineItem[] = [
    { key: "base", label: `${type.label} base`, amountCents: baseCents },
    {
      key: "area",
      label: `${type.label} · ${input.squareFeet.toLocaleString("en-US")} sf`,
      amountCents: areaCents,
    },
  ];

  if (tierCents !== 0) {
    lineItems.push({ key: "tier", label: `${tier.label} finishes`, amountCents: tierCents });
  }
  if (complexityCents !== 0) {
    lineItems.push({ key: "complexity", label: `${complexity.label} complexity`, amountCents: complexityCents });
  }
  for (const addon of addons) {
    lineItems.push({ key: `addon:${addon.key}`, label: addon.label, amountCents: toCents(addon.flat) });
  }
  if (subtotalCents !== rawSubtotal) {
    lineItems.push({
      key: "minimum",
      label: "Minimum project charge",
      amountCents: subtotalCents - rawSubtotal,
    });
  }
  lineItems.push({ key: "contingency", label: "Contingency", amountCents: contingencyCents });

  return {
    currency: matrix.currency,
    lineItems,
    subtotalCents,
    contingencyCents,
    totalCents,
    range: { lowCents, highCents },
    assumptions: [
      "Pricing is an early estimate, not a contract.",
      "Site conditions, permits, and finish selections can change the final scope.",
      `A ${(matrix.contingency_rate * 100).toFixed(0)}% contingency is included.`,
    ],
  };
}

export function publicEstimatorOptions(matrix: PricingMatrix) {
  return {
    currency: matrix.currency,
    projectTypes: Object.entries(matrix.project_types).map(([key, value]) => ({
      key,
      label: value.label,
      minSquareFeet: value.min_sf,
      maxSquareFeet: value.max_sf,
    })),
    materialTiers: Object.entries(matrix.material_tiers).map(([key, value]) => ({ key, label: value.label })),
    complexity: Object.entries(matrix.complexity).map(([key, value]) => ({ key, label: value.label })),
    addons: Object.entries(matrix.addons).map(([key, value]) => ({ key, label: value.label })),
  };
}
