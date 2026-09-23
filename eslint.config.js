import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['.output/', '.wxt/', 'coverage/', 'dist/'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
  {
    files: ['*.config.{js,ts}', 'tests/**'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
);
