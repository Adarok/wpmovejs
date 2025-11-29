import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/e2e/tests/**/*.e2e.test.ts'],
    testTimeout: 120000,  // 2 minute timeout for individual tests
    hookTimeout: 180000,  // 3 minute timeout for beforeAll/afterAll
    fileParallelism: false, // Run test files sequentially
    reporters: ['verbose'],
    // Use a single global setup/teardown instead of per-file
    globalSetup: ['tests/e2e/helpers/globalSetup.ts'],
  },
});
