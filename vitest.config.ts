import { defineConfig } from "vitest/config";

// Tests run against a real Postgres database (separate from the dev one).
// Every API test resets the schema + seed data, so files must not run in parallel.
export default defineConfig({
  test: {
    env: {
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ?? "postgres://fundops:fundops@localhost:5432/fundops_test",
    },
    fileParallelism: false,
    testTimeout: 15000,
  },
});
