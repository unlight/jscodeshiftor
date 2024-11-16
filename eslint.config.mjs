import 'eslint-plugin-only-warn';

import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier/recommended';
import * as unicorn from 'eslint-plugin-unicorn';

/** @type {import('eslint').Linter.Config} */
export default [
  pluginJs.configs.recommended,
  // ...tseslint.configs.recommended,
  // ...tseslint.configs.recommendedTypeChecked,
  prettier,
  {
    ignores: [
      'dist/',
      'coverage/',
      '@generated/**',
      '*.config.[cm]js',
      '.*rc.js',
    ],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        project: ['./tsconfig.json'],
        warnOnUnsupportedTypeScriptVersion: false,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'max-lines': [1, { max: 300 }],
      'max-params': [1, { max: 5 }],
      'no-unneeded-ternary': [1],
    },
  },

  {
    ...unicorn.configs['flat/recommended'],
    rules: {
      'unicorn/prevent-abbreviations': [
        'warn',
        {
          replacements: {
            args: false,
          },
        },
      ],
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
    rules: {
      'consistent-return': 0,
      'max-lines': 0,
    },
  },
];
