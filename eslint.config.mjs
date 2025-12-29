import 'eslint-plugin-only-warn';

import pluginJs from '@eslint/js';
import { globalIgnores, defineConfig } from 'eslint/config';
import * as importx from 'eslint-plugin-import-x';
import perfectionist from 'eslint-plugin-perfectionist';
import prettier from 'eslint-plugin-prettier/recommended';
import unicorn from 'eslint-plugin-unicorn';
import globals from 'globals';
import * as tseslint from 'typescript-eslint';

export default defineConfig(
  pluginJs.configs.recommended,
  tseslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  unicorn.configs.recommended,
  prettier,
  globalIgnores(['dist/**', 'coverage/**', '@generated/**']),
  {
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.node,
      parserOptions: {
        projectService: true,
      },
      sourceType: 'module',
    },
    rules: {
      'max-lines': [1, { max: 300 }],
      'max-params': [1, { max: 3 }],
      'no-unneeded-ternary': [1],
    },
    settings: {
      node: {
        version: '>=24',
      },
    },
  },
  {
    rules: {
      'unicorn/no-array-callback-reference': 0,
      'unicorn/no-array-for-each': 0,
      'unicorn/no-array-method-this-argument': 0,
      'unicorn/prevent-abbreviations': 0,
    },
  },
  {
    extends: [importx.flatConfigs.recommended, importx.flatConfigs.typescript],
    rules: {
      'import-x/order': [
        'warn',
        {
          alphabetize: {
            caseInsensitive: false,
            order: 'asc',
            orderImportKind: 'asc',
          },
          groups: [
            'builtin', // Node.js built-in modules (e.g., `fs`)
            'external', // Packages from `node_modules`
            'internal', // Absolute imports (via path aliases)
            ['parent', 'sibling', 'index'], // Relative imports
            'object', // Type imports (if using TypeScript)
            'type', // Side-effect imports
          ],
          'newlines-between': 'always', // Add newlines between groups
          pathGroups: [
            {
              // The predefined group this PathGroup is defined in relation to
              group: 'external',
              // Minimatch pattern used to match against specifiers
              pattern: '@/**',
              // How matching imports will be positioned relative to "group"
              position: 'after',
            },
          ],
        },
      ],
    },
  },
  {
    plugins: {
      perfectionist,
    },
    rules: {
      'perfectionist/sort-objects': [
        'warn',
        {
          order: 'asc',
          type: 'natural',
        },
      ],
    },
  },
  {
    extends: [tseslint.configs.disableTypeChecked],
    files: ['*.config.mjs', '*.config.mts'],
  },
  {
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
    rules: {
      '@typescript-eslint/camelcase': 0,
      '@typescript-eslint/no-explicit-any': 0,
      '@typescript-eslint/no-floating-promises': 0,
      '@typescript-eslint/no-non-null-assertion': 0,
      'consistent-return': 0,
      'import/max-dependencies': 0,
      'max-lines': 0,
    },
  },
);
