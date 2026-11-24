import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: [
      "test/emulator/**/*.test.ts",
      "test/integration/**/*.test.ts",
    ],
    // Both suites talk to the same emulator project; never run them in parallel.
    fileParallelism: false,
    setupFiles: ["test/integration/setup.ts"],
    testTimeout: 30_000,
    hookTimeout: 40_000,
  },
});
