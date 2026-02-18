#!/usr/bin/env node
/**
 * Deploy MediQue schema to Supabase.
 *
 * Usage:
 *   node migrations/deploy.mjs
 *
 * Requires either:
 *   - Direct psql access (PGPASSWORD + DATABASE_URL env vars)
 *   - OR: SUPABASE_DB_URL env var with the full connection string
 *
 * If direct access is not available, copy the SQL from
 * migrations/001_full_schema.sql and run it in the Supabase Dashboard SQL Editor.
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error(
      'No database URL provided.\n\n' +
      'Set SUPABASE_DB_URL or DATABASE_URL, or run the SQL manually:\n' +
      '  1. Open Supabase Dashboard -> SQL Editor\n' +
      '  2. Paste the contents of migrations/001_full_schema.sql\n' +
      '  3. Click "Run"\n'
    );
    process.exit(1);
  }

  let pg;
  try {
    pg = await import('pg');
  } catch {
    console.error('pg package not found. Run: npm install pg');
    process.exit(1);
  }

  const sql = readFileSync(join(__dirname, '001_full_schema.sql'), 'utf-8');
  const client = new pg.default.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  try {
    await client.connect();
    console.log('Connected to database.');
    await client.query(sql);
    console.log('Schema deployed successfully.');
  } catch (err) {
    console.error('Deployment failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
