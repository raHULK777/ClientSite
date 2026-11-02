import type { DailyLogDto, DailyLogRow } from "./daily-log.types";

function isoDate(value: string | Date): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

export function mapDailyLog(row: DailyLogRow): DailyLogDto {
  const authorName = [row.author_first_name, row.author_last_name].filter(Boolean).join(" ").trim();
  return {
    id: row.id,
    projectId: row.project_id,
    authorId: row.author_id,
    authorName: authorName || null,
    date: isoDate(row.log_date),
    summary: row.summary,
    details: row.details,
    weather: row.weather,
    crewSize: row.crew_size,
    createdAt: new Date(row.created_at).toISOString(),
  };
}