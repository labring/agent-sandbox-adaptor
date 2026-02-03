import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier';

const nodeGlobals = {
  ...globals.node
};

const jsRecommended = js.configs.recommended;

export default [
  {
    ignores: ['dist', 'node_modules', 'coverage']
  },
  {
    ...jsRecommended,
    files: ['**/*.{js,cjs,mjs}'],
    languageOptions: {
      ...jsRecommended.languageOptions,
      globals: nodeGlobals
    },
    rules: {
      ...jsRecommended.rules,
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: nodeGlobals
    },
    plugins: {
      '@typescript-eslint': tseslint
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ]
    }
  },
  eslintConfigPrettier
];
