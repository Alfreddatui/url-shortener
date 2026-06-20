import { afterAll, beforeEach } from 'vitest';
import { pool } from '../db';

// Reset state between tests so each test starts with a clean, empty table.
// RESTART IDENTITY resets the SERIAL counter so IDs are predictable.
beforeEach(async () => {
  await pool.query('TRUNCATE TABLE links RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await pool.end();
});
