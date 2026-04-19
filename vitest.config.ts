import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.ts', 'tests/**/*.ts', '**/*.spec.ts', '**/*.test.ts'],
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
  },
  resolve: {
    conditions: ['node'],
  },
});
