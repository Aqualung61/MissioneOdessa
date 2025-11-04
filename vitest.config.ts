import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Escludi test E2E Playwright dalla run di Vitest
    exclude: [
      'node_modules',
      'dist',
      'build',
      'deploy/**',
      '**/e2e/**',
      '**/*.e2e.*'
    ]
  }
});
