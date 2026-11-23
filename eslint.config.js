import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'dist-beta/**',
      'coverage/**',
      'node_modules/**',
      'public/vendor/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        process: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
        fetch: 'readonly',
        AbortSignal: 'readonly',
      },
    },
  },
  {
    files: [
      'scripts/measure-impulses.mjs',
      'scripts/measure-endurance.mjs',
      'scripts/record-intermediate-checkpoint.mjs',
    ],
    languageOptions: {
      globals: {
        WebAssembly: 'readonly',
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
  },
  {
    files: [
      'src/**/*.ts',
      'tests/**/*.ts',
      'vite.config.ts',
      'playwright.config.ts',
      'playwright.preview.config.ts',
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
);
