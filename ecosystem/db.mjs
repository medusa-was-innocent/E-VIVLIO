import { readFile, readdir, mkdir } from 'node:fs/promises';
import { Pool } from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { pgliteDialect } from './pglite-dialect.mjs';

export async function openDatabase({ url = process.env.DATABASE_URL, dataDir = '.data/postgres' } = {}) {
  if (process.env.NODE_ENV === 'production' && !url) throw new Error('DATABASE_URL is required in production.');
  let client;
  if (url) client = new Pool({ connectionString: url, max: 10 });
  else {
    if (dataDir !== 'memory://') await mkdir(dataDir, { recursive: true });
    client = new PGlite(dataDir);
    await client.waitReady;
  }
  const query = (sql, params = []) => client.query(sql, params);
  const exec = (sql) => url ? client.query(sql) : client.exec(sql);
  await exec('CREATE TABLE IF NOT EXISTS ecosystem_migrations (name text PRIMARY KEY)');
  for (const directory of ['ecosystem/migrations', 'folio-room-main/migrations']) {
    for (const name of (await readdir(directory)).filter(n => n.endsWith('.sql')).sort()) {
      const key = `${directory}/${name}`;
      if ((await query('SELECT name FROM ecosystem_migrations WHERE name = $1', [key])).rows.length) continue;
      // DDL is idempotent; record only after the complete migration succeeds.
      await exec(await readFile(key, 'utf8'));
      await query('INSERT INTO ecosystem_migrations(name) VALUES ($1) ON CONFLICT DO NOTHING', [key]);
    }
  }
  return { query, exec, authDatabase: url ? client : { dialect: pgliteDialect(() => client), type: 'postgres' }, close: () => url ? client.end() : client.close() };
}
