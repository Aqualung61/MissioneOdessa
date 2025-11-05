import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'tests/**/*.test.ts',
      'src/tests/**/*.test.ts',
    ],
    // Escludi test E2E Playwright dalla run di Vitest e altre cartelle di build
    exclude: [
      'node_modules',
      'dist',
      'build',
      'deploy/**',
      '**/e2e/**',
      '**/*.e2e.*'
    ]
  },
});
