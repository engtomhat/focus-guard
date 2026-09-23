// End-to-end tests: run the built extension in real browsers.
// Build first: `npm run test:e2e` does it for you.
import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': resolve(import.meta.dirname, 'src') } },
  test: {
    include: ['tests/e2e/**/*.e2e.ts'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    // One browser at a time: the tests share a local port range and are CPU-heavy
    fileParallelism: false,
  },
});
