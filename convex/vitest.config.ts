import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: [
        'graph.ts',
        'categories.ts',
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.spec.ts',
        '_generated/**',
        'node_modules/**',
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      './_generated/server': path.resolve(__dirname, './_generated/server'),
      './_generated/dataModel': path.resolve(__dirname, './_generated/dataModel'),
      './_generated/api': path.resolve(__dirname, './_generated/api'),
    },
  },
});
