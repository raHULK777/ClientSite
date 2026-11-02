import { z } from "zod";

export const dailyLogCreateSchema = z.object({
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2026-11-01."),
  summary: z.string().trim().min(2).max(500),
  details: z.string().trim().max(4000).optional(),
  weather: z.string().trim().max(120).optional(),
  crewSize: z.number().int().min(0).max(999).optional(),
});

export type DailyLogCreateInput = z.infer<typeof dailyLogCreateSchema>;