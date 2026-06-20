import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';

// Load server .env for DB credentials, then override the database name
// so tests run against an isolated database and never touch dev data.
config({ path: '.env' });
const base = (process.env.DATABASE_URL ?? '').replace(/\/[^/]+$/, '');
process.env.DATABASE_URL = `${base}/urlshortener_test`;

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['src/__tests__/globalSetup.ts'],
    setupFiles: ['src/__tests__/setup.ts'],
    testTimeout: 10000,
    // Run test files sequentially — integration tests share one DB and
    // concurrent TRUNCATE calls across files would cause race conditions.
    fileParallelism: false,
  },
});
