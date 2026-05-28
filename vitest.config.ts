import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      enabled: true,
      include: ["src/**/*.ts"],
      exclude: ["src/types.ts"],
      reporter: ["text", "json-summary", "html"],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
