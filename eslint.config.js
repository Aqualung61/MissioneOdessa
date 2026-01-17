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
