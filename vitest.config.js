import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: './tests/unit/setup.js',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: ['**/*.test.js']
    }
  }
});
