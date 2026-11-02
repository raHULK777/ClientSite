import { createApp } from "./app";
import { closeDatabase } from "./config/database";
import { env } from "./config/env";
import type { TenantCache } from "./modules/tenant/tenant.cache";
import { migrate } from "./scripts/migrate";

async function main(): Promise<void> {
  await migrate();
  const app = createApp();
  const cache = app.locals.tenantCache as TenantCache;

  const server = app.listen(env.API_PORT, () => {
    console.log(`ConstructOps API listening on http://localhost:${env.API_PORT}`);
  });

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received, shutting down`);
    server.close(async () => {
      await cache.close();
      await closeDatabase();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

void main().catch(async (error) => {
  console.error("Failed to start ConstructOps API", error);
  await closeDatabase().catch(() => undefined);
  process.exit(1);
});
