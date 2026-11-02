import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { closeDatabase, getDatabase } from "../config/database";

function findMigrationsDir(): string {
  const candidates = [
    path.resolve(process.cwd(), "infra/migrations"),
    path.resolve(process.cwd(), "../infra/migrations"),
    path.resolve(process.cwd(), "../../infra/migrations"),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error("Could not locate infra/migrations.");
  return found;
}

const migrationsDir = findMigrationsDir();

export async function migrate(): Promise<void> {
  const db = getDatabase();
  await db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT NOW());",
  );

  const applied = new Set(
    (await db.query<{ name: string }>("SELECT name FROM schema_migrations")).map((row) => row.name),
  );
  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    await db.exec(sql);
    await db.query("INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING", [file]);
    console.log(`Applied migration ${file}`);
  }
}

if (process.env.NODE_ENV !== "test" && require.main === module) {
  migrate()
    .then(() => closeDatabase())
    .then(() => console.log("Migrations complete."))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
