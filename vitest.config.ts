export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.ts", "tests/**/*.ts", "**/*.spec.ts", "**/*.test.ts"],
    deps: {
      inline: ["@nestjs"]
    }
  },
  resolve: {
    conditions: ["node"]
  }
});
