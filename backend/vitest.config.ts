import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fileParallelism: false,
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/**/*.test.ts"],
          globalSetup: ["tests/setup/globalSetup.ts"],
          setupFiles: ["tests/setup/setupFile.ts"],
          fileParallelism: false,
          testTimeout: 10_000,
        },
      },
    ],
  },
});
