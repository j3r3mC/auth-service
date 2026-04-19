import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Ignorer les fichiers de config pour éviter les erreurs de parsing
  {
    ignores: [
      'eslint.config.mjs',
      'vitest.config.ts',
      'vitest.setup.ts',
      'tests/setup.ts',
      'prisma.config.ts',
    ],
  },

  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,

  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: process.cwd(),
      },
    },
  },

  // Empêche ESLint de typer les fichiers hors du projet TS
  {
    files: ['**/vitest.setup.ts', '**/eslint.config.mjs', 'tests/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: null,
      },
    },
  },

  // Empêcher ESLint de parser vitest.config.ts
  {
    files: ['vitest.config.ts'],
    languageOptions: {
      parser: null,
      parserOptions: {
        project: null,
      },
    },
  },

  // Désactivation des règles "unsafe" UNIQUEMENT dans les tests
  {
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },

  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
);
