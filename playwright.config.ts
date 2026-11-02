import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

const root = __dirname;
const API_URL = "http://localhost:4100";
const WEB_URL = "http://localhost:3100";

const serverEnv = {
  NODE_ENV: "development",
  API_PORT: "4100",
  WEB_ORIGIN: WEB_URL,
  DATABASE_URL: "",
  REDIS_URL: "",
  JWT_SECRET: "",
  COOKIE_SECURE: "false",
  RATE_LIMIT_DISABLED: "true",
  DEV_TENANT_HOST: "santos.localhost",
  PGLITE_DATA_DIR: path.join(root, "constructops-core", ".data", "pglite-e2e"),
  NEXT_PUBLIC_API_URL: API_URL,
  API_INTERNAL_URL: API_URL,
  NEXT_PUBLIC_ROOT_DOMAIN: "localhost:3100",
};

export default defineConfig({
  testDir: "./e2e",
  outputDir: "test-results",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: WEB_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command:
        "npm run db:migrate -w @constructops/core && npm run db:seed -w @constructops/core && npm run start:e2e -w @constructops/core",
      url: `${API_URL}/health`,
      timeout: 180_000,
      reuseExistingServer: false,
      env: serverEnv,
    },
    {
      command: "npm run dev:e2e -w @constructops/web",
      url: WEB_URL,
      timeout: 180_000,
      reuseExistingServer: false,
      env: serverEnv,
    },
  ],
});
