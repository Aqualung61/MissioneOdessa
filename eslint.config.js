// ESLint flat config (v9+)
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default [
  // Ignori globali
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      'deploy/',
      'disassembly/',
      'src/git-sync.*',
      'ddl/',
      'docs/ddl*/',
      'coverage/',
      'test-results/',
      'backup/',
      'dbbuild/',
      '*.min.js',
      'web/js/marked.min.js',
      'web/js/odessa1.js',
      'types/**/*.d.ts',
      'scripts/**/*.cjs',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,ts,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'no-empty': ['warn', { allowEmptyCatch: false }],
      'keyword-spacing': ['warn', { before: true, after: true }],
      'space-infix-ops': 'warn',
      'no-multiple-empty-lines': ['warn', { max: 2 }],
      // Lasciamo la formattazione a Prettier (script dedicato)
    },
  },
  // Regole di complessità in modalità avviso (#63, lotto 0 v1.4.2).
  // TD: docs/20261019 - TD Lotto 0 Rete di caratterizzazione - v1.0.md, §3.6.
  {
    files: ['src/**/*.js'],
    ignores: ['src/tests/**'],
    rules: {
      complexity: ['warn', 15],
      'max-lines-per-function': ['warn', { max: 80, skipBlankLines: true, skipComments: true }],
      'max-depth': ['warn', 4],
    },
  },
  // Disabilita regole per file minificati
  {
    files: ['**/*.min.js'],
    rules: {
      'no-undef': 'off',
      'no-unused-expressions': 'off',
      'no-useless-escape': 'off',
    },
  },
];
