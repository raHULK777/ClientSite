import type { MessageDto, MessageRow } from "./message.types";

export function mapMessage(row: MessageRow): MessageDto {
  const authorName = [row.author_first_name, row.author_last_name].filter(Boolean).join(" ").trim();
  return {
    id: row.id,
    projectId: row.project_id,
    authorId: row.author_id,
    authorName: authorName || null,
    body: row.body,
    createdAt: new Date(row.created_at).toISOString(),
  };
}