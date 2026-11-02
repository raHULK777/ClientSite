import type { Role } from "@constructops/shared";

export type DailyLogRow = {
  id: string;
  tenant_id: string;
  project_id: string;
  author_id: string;
  log_date: string | Date;
  summary: string;
  details: string | null;
  weather: string | null;
  crew_size: number | null;
  created_at: string | Date;
  author_first_name?: string | null;
  author_last_name?: string | null;
};

export type DailyLogDto = {
  id: string;
  projectId: string;
  authorId: string;
  authorName: string | null;
  date: string;
  summary: string;
  details: string | null;
  weather: string | null;
  crewSize: number | null;
  createdAt: string;
};

export type DailyLogCreate = {
  projectId: string;
  logDate: string;
  summary: string;
  details?: string | null;
  weather?: string | null;
  crewSize?: number | null;
};

export type DailyLogActor = { id: string; role: Role };