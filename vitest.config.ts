import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',

    include: ['tests/**/*.test.{ts,js}', 'apps/**/*.test.ts', 'packages/**/*.test.ts'],

    exclude: ['**/node_modules/**', '**/dist/**'],

    clearMocks: true,
    restoreMocks: true,

    passWithNoTests: false,

    reporters: ['default'],
  },
});
