import { defineConfig } from 'vitest/config';

// Configurazione Vitest per test unitari
// Aggiornamento per fix lint

export default defineConfig({
  test: {
    include: [
      'tests/**/*.test.ts',
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
    // Copertura attiva solo con --coverage (#63, lotto 0 v1.4.2); npm test non cambia.
    // TD: docs/20261019 - TD Lotto 0 Rete di caratterizzazione - v1.0.md, §3.6.
    // Reporter 'json' aggiunto in Fase 1B-2: deroga a TD §3.6 autorizzata da Mauro,
    // per leggere coverage/coverage-final.json (dettaglio dei rami per riga/indice)
    // senza una copertura diagnostica separata.
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: ['src/tests/**', 'src/git-sync.*'],
      reporter: ['text', 'json-summary', 'json'],
      reportsDirectory: 'coverage',
    },
  },
});
