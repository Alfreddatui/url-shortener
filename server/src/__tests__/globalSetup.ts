import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

export async function setup() {
  const testUrl = process.env.DATABASE_URL!;
  const adminUrl = testUrl.replace(/\/[^/]+$/, '/postgres');
  const dbName = testUrl.split('/').at(-1)!;

  // Create the test database if it doesn't exist
  const adminPool = new Pool({ connectionString: adminUrl });
  const { rows } = await adminPool.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [dbName]
  );
  if (rows.length === 0) {
    await adminPool.query(`CREATE DATABASE "${dbName}"`);
  }
  await adminPool.end();

  // Run migrations against the test database
  const testPool = new Pool({ connectionString: testUrl });
  await applyMigrations(testPool);
  await testPool.end();
}

async function applyMigrations(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const dir = path.resolve(process.cwd(), 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    const { rows } = await pool.query(
      'SELECT 1 FROM schema_migrations WHERE filename = $1',
      [file]
    );
    if (rows.length > 0) continue;
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    await pool.query(sql);
    await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
  }
}
