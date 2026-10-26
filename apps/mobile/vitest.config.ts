import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Only pure modules (date helpers, strings, cache logic) are tested here; screens are checked on devices.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@kidase/shared': fileURLToPath(new URL('../../packages/shared/src', import.meta.url)),
    },
  },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
