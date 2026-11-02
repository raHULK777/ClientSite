import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    clearMocks: true,
    testTimeout: 15_000,
    hookTimeout: 30_000,
    env: {
      NODE_ENV: "test",
      PGLITE_DATA_DIR: "memory",
    },
  },
});
