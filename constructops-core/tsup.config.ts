import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["cjs"],
  outDir: "dist",
  clean: true,
  sourcemap: true,
  noExternal: ["@constructops/shared"],
});
