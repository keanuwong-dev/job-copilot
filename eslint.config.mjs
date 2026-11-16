import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      'apps/web/**',
      '**/.next/**',
      '**/.output/**',
      '**/.wxt/**',
      '**/dist/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['apps/extension/**/*.{ts,tsx}'],
    rules: {
      // WXT auto-imports (defineBackground, browser, etc.) are typed by `wxt prepare`.
      'no-undef': 'off',
    },
  },
);
