import { z } from "zod";

export const messageIdParamSchema = z.object({ id: z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  "Must be a UUIDv4.",
)});

export const messageSendSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export type MessageSendInput = z.infer<typeof messageSendSchema>;

export type MessageRow = {
  id: string;
  tenant_id: string;
  project_id: string;
  author_id: string;
  body: string;
  created_at: string | Date;
  author_first_name?: string | null;
  author_last_name?: string | null;
};

export type MessageDto = {
  id: string;
  projectId: string;
  authorId: string;
  authorName: string | null;
  body: string;
  createdAt: string;
};