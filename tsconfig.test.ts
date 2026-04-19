{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["vitest", "node"]
  },
  "include": [
    "test",
    "tests",
    "**/*.spec.ts",
    "**/*.test.ts"
  ]
}
