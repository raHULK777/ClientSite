import type { Role } from "@constructops/shared";

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

export type MessageActor = { id: string; role: Role };