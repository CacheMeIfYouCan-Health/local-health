import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../config/db.js';

const here = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const sql = await fs.readFile(path.join(here, 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('[migrate] schema applied');
  await pool.end();
}

migrate().catch((err) => {
  console.error('[migrate] failed', err);
  process.exit(1);
});