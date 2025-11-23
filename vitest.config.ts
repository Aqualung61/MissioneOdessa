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
      // Escludi in modo esplicito eventuali e2e sotto src/tests
      'src/tests/e2e/**',
      '**/e2e/**',
      '**/*.e2e.*'
    ],
    setupFiles: ['tests/setup.ts'],
  },
});
