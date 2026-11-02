import { mkdirSync } from "node:fs";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";

import { env } from "./env";

export interface Queryable {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

export interface Database extends Queryable {
  kind: "pglite" | "postgres";
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

function createPglite(dataDir: string): Database {
  const resolved = dataDir === "memory" ? null : path.resolve(dataDir);
  if (resolved) mkdirSync(path.dirname(resolved), { recursive: true });
  const client = new PGlite(resolved ?? undefined);

  const query = async <T>(sql: string, params: unknown[] = []): Promise<T[]> => {
    const result = await client.query<T>(sql, params);
    return result.rows;
  };

  return {
    kind: "pglite",
    query,
    async exec(sql: string) {
      await client.exec(sql);
    },
    async transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T> {
      return client.transaction(async (tx) =>
        fn({
          query: (sql, params = []) =>
            tx.query(sql, params).then((result) => result.rows as unknown as never[]),
        }),
      );
    },
    async close() {
      await client.close();
    },
  };
}

function createPostgres(connectionString: string): Database {
  const pool = new Pool({ connectionString });

  const query = async <T>(sql: string, params: unknown[] = []): Promise<T[]> => {
    const result = await pool.query(sql, params);
    return result.rows as T[];
  };

  return {
    kind: "postgres",
    query,
    async exec(sql: string) {
      await pool.query(sql);
    },
    async transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T> {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await fn({
          query: (sql, params = []) => client.query(sql, params).then((r) => r.rows),
        });
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    async close() {
      await pool.end();
    },
  };
}

let database: Database | null = null;

export function getDatabase(): Database {
  if (!database) {
    database = env.DATABASE_URL ? createPostgres(env.DATABASE_URL) : createPglite(env.PGLITE_DATA_DIR);
  }
  return database;
}

export async function closeDatabase(): Promise<void> {
  if (database) {
    await database.close();
    database = null;
  }
}

export async function one<T>(db: Queryable, sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await db.query<T>(sql, params);
  return rows[0] ?? null;
}
