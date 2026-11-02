import { z } from "zod";

export const dailyLogCreateSchema = z.object({
  projectId: z.string().regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    "Must be a UUIDv4.",
  ),
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2026-11-01."),
  summary: z.string().trim().min(2).max(500),
  details: z.string().trim().max(4000).optional(),
  weather: z.string().trim().max(120).optional(),
  crewSize: z.number().int().min(0).max(999).optional(),
});

export type DailyLogFormValues = z.infer<typeof dailyLogCreateSchema>;