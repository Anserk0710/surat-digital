import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export function createBaseConfig() {
  return tseslint.config(
    {
      ignores: [
        '**/node_modules/**',
        '**/dist/**',
        '**/coverage/**',

        'docs/baseline/**',
        'docs/traceability/**',
        'docs/evidence/**',
      ],
    },

    js.configs.recommended,

    ...tseslint.configs.recommended,

    {
      files: ['**/*.{js,mjs,cjs,ts,tsx}'],

      languageOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },

      linterOptions: {
        reportUnusedDisableDirectives: 'error',
      },

      rules: {
        curly: ['error', 'all'],

        eqeqeq: ['error', 'always'],

        'no-debugger': 'error',

        '@typescript-eslint/consistent-type-imports': [
          'error',
          {
            prefer: 'type-imports',
          },
        ],

        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
          },
        ],
      },
    },

    {
      files: [
        'scripts/**/*.{js,mjs,cjs,ts}',
        'tests/**/*.{js,mjs,cjs,ts,tsx}',

        'apps/api/**/*.{js,mjs,cjs,ts}',
        'apps/document-worker/**/*.{js,mjs,cjs,ts}',

        '*.{js,mjs,cjs,ts}',
      ],

      languageOptions: {
        globals: globals.node,
      },
    },

    {
      files: ['apps/web/**/*.{js,ts,tsx}'],

      languageOptions: {
        globals: globals.browser,
      },
    },

    {
      files: ['apps/{web,api,document-worker}/src/**/*.{js,ts,tsx}'],

      rules: {
        'no-console': [
          'warn',
          {
            allow: ['warn', 'error'],
          },
        ],
      },
    },
  );
}
