import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@kidase/shared": fileURLToPath(new URL("../../packages/shared/src", import.meta.url)),
    },
  },
  test: {
    // mongodb-memory-server downloads a binary on first run; allow generous time.
    testTimeout: 60000,
    hookTimeout: 120000,
  },
});
