import "dotenv/config";

import { z } from "zod";

const DEV_SECRET = "dev-only-constructops-secret-change-before-production";

const emptyToUndefined = (value: unknown): unknown => (value === "" ? undefined : value);

const booleanish = z.preprocess(
  emptyToUndefined,
  z.enum(["true", "false", "1", "0"]).transform((value) => value === "true" || value === "1").default(false),
);

const envSchema = z.object({
  NODE_ENV: z.preprocess(emptyToUndefined, z.enum(["development", "test", "production"]).default("development")),
  API_PORT: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().default(4000)),
  WEB_ORIGIN: z.preprocess(emptyToUndefined, z.string().url().default("http://localhost:3000")),
  DATABASE_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  REDIS_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  JWT_SECRET: z.preprocess((value) => (value === "" || value === undefined ? DEV_SECRET : value), z.string().min(32)),
  JWT_EXPIRES_IN: z.preprocess(emptyToUndefined, z.string().default("8h")),
  COOKIE_DOMAIN: z.preprocess(emptyToUndefined, z.string().optional()),
  COOKIE_SECURE: booleanish,
  TENANT_CACHE_TTL_SECONDS: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().default(3600)),
  DEV_TENANT_HOST: z.preprocess(emptyToUndefined, z.string().default("santos.localhost")),
  PGLITE_DATA_DIR: z.preprocess(emptyToUndefined, z.string().default(".data/pglite")),
  RATE_LIMIT_DISABLED: booleanish,
});

export type Env = z.infer<typeof envSchema>;

function load(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid environment: ${details}`);
  }

  const env = parsed.data;
  if (env.NODE_ENV === "production") {
    if (!env.DATABASE_URL) throw new Error("DATABASE_URL is required in production.");
    if (env.JWT_SECRET === DEV_SECRET) throw new Error("JWT_SECRET must be set in production.");
    if (!env.COOKIE_SECURE) throw new Error("COOKIE_SECURE must be true in production.");
  }

  return env;
}

export const env = load();
