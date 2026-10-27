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
      'Claude decompiler/',
      'scripts/baselines/',
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
  // Regole di complessità bloccanti (#63, lotto 5 v1.4.2, D-5-5): erano 'warn' dal lotto 0
  // (TD Lotto 0 Rete di caratterizzazione, §3.6). Soglie invariate; lo script `lint` usa
  // `--max-warnings 0`. Nessuna deroga `eslint-disable` ammessa per queste regole in src/.
  {
    files: ['src/**/*.js'],
    ignores: ['src/tests/**'],
    rules: {
      complexity: ['error', 15],
      'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
      'max-depth': ['error', 4],
    },
  },
  // Dipendenze del motore generico (#63, lotto 4a v1.4.2; TD Lotto 4a, §5.2; TD 0 §4.7):
  // `src/logic/core/**` non importa da `src/game/**`.
  {
    files: ['src/logic/core/**/*.js'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/game/**'],
              message: 'src/logic/core non deve dipendere da un gioco specifico (src/game/**).',
            },
          ],
        },
      ],
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
