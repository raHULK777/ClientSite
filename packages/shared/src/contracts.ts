import { z } from "zod";

export const roleSchema = z.enum(["admin", "field_staff", "client"]);
export type Role = z.infer<typeof roleSchema>;

export const projectStatusSchema = z.enum(["planning", "active", "completed"]);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export const changeOrderStatusSchema = z.enum(["pending", "approved", "rejected"]);
export type ChangeOrderStatus = z.infer<typeof changeOrderStatusSchema>;

export const uuidSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    "Must be a UUIDv4.",
  );

const moneySchema = z.number().finite().min(-99_999_999.99).max(99_999_999.99);

export const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(200),
});

export const stageStatusSchema = z.enum(["pending", "active", "completed"]);
export type StageStatus = z.infer<typeof stageStatusSchema>;

export const stageNameSchema = z.string().trim().min(1).max(100);

export const projectCreateSchema = z.object({
  clientId: uuidSchema.nullish(),
  projectName: z.string().trim().min(2).max(255),
  status: projectStatusSchema.default("planning"),
  currentPhase: z.string().trim().min(1).max(100).default("Permitting"),
  progressPercentage: z.number().int().min(0).max(100).default(0),
  estimatedCost: moneySchema.min(0).default(0),
  stages: z.array(stageNameSchema).min(1).max(30).optional(),
});

export const projectUpdateSchema = z
  .object({
    clientId: uuidSchema.nullish(),
    projectName: z.string().trim().min(2).max(255).optional(),
    status: projectStatusSchema.optional(),
    currentPhase: z.string().trim().min(1).max(100).optional(),
    progressPercentage: z.number().int().min(0).max(100).optional(),
    estimatedCost: moneySchema.min(0).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

export const fieldStaffProjectUpdateSchema = projectUpdateSchema.refine(
  (value) =>
    Object.keys(value).every((key) => key === "currentPhase" || key === "progressPercentage"),
  { message: "Field staff may only update phase and progress." },
);

export const stagePlanSchema = z.object({
  stages: z.array(stageNameSchema).min(1).max(30),
});

export const stageStatusUpdateSchema = z.object({
  status: stageStatusSchema,
  comment: z.string().trim().min(2).max(2000),
});

export const changeOrderCreateSchema = z.object({
  title: z.string().trim().min(2).max(255),
  description: z.string().trim().max(4000).optional(),
  costImpact: moneySchema,
});

export const changeOrderUpdateSchema = z
  .object({
    title: z.string().trim().min(2).max(255).optional(),
    description: z.string().trim().max(4000).nullable().optional(),
    costImpact: moneySchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

export const changeOrderApprovalSchema = z.object({
  signerName: z.string().trim().min(2).max(120),
  consent: z.literal(true),
});

export const changeOrderRejectSchema = z.object({
  reason: z.string().trim().max(1000).optional(),
});

export const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-f]{6}$/i, "Use a six-digit hex color, for example #0B1220.");

const assetUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => value.startsWith("/") || /^https?:\/\//i.test(value),
    "Use a site path or an http(s) URL.",
  );

export const tenantBrandingUpdateSchema = z
  .object({
    companyName: z.string().trim().min(2).max(255).optional(),
    logoUrl: assetUrlSchema.nullable().optional(),
    palette: z
      .object({
        primary: hexColorSchema.optional(),
        secondary: hexColorSchema.optional(),
        background: hexColorSchema.optional(),
        surface: hexColorSchema.optional(),
      })
      .optional(),
    typography: z
      .object({
        fontFamily: z.string().trim().min(1).max(120).optional(),
        baseSize: z
          .string()
          .trim()
          .regex(/^\d{2}(\.\d+)?px$/, "Use a pixel size, for example 16px.")
          .optional(),
      })
      .optional(),
    layout: z
      .object({
        navbarStyle: z.enum(["ruled", "solid", "minimal"]).optional(),
        sidebarPosition: z.enum(["left", "right"]).optional(),
        borderRadius: z.enum(["0", "2px", "4px", "8px"]).optional(),
      })
      .optional(),
    assets: z
      .object({
        faviconUrl: assetUrlSchema.optional(),
        emailBannerUrl: assetUrlSchema.optional(),
      })
      .optional(),
  })
  .refine(
    (value) =>
      Object.values(value).some(
        (entry) =>
          entry === null || typeof entry === "string" || (entry && Object.keys(entry).length > 0),
      ),
    { message: "Provide at least one branding field to update." },
  );

export const tenantFeaturesUpdateSchema = z
  .object({
    estimator: z.boolean().optional(),
    clientPortal: z.boolean().optional(),
    changeOrders: z.boolean().optional(),
    projectChat: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one feature to update.",
  });

export const auditQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

export const idParamSchema = z.object({ id: uuidSchema });
export const projectIdParamSchema = z.object({ projectId: uuidSchema });
export const stageIdParamSchema = z.object({ id: uuidSchema, stageId: uuidSchema });

export type LoginInput = z.infer<typeof loginSchema>;
export type StagePlanInput = z.infer<typeof stagePlanSchema>;
export type StageStatusUpdateInput = z.infer<typeof stageStatusUpdateSchema>;
export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
export type ChangeOrderCreateInput = z.infer<typeof changeOrderCreateSchema>;
export type ChangeOrderUpdateInput = z.infer<typeof changeOrderUpdateSchema>;
export type TenantBrandingUpdateInput = z.infer<typeof tenantBrandingUpdateSchema>;
export type TenantFeaturesUpdateInput = z.infer<typeof tenantFeaturesUpdateSchema>;
export type AuditQueryInput = z.infer<typeof auditQuerySchema>;
