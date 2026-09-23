import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    restoreMocks: true,
    // End-to-end tests have their own config (vitest.e2e.config.ts)
    exclude: ['**/node_modules/**', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
    },
  },
});
