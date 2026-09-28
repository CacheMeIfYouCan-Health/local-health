import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../config/db.js';

const here = path.dirname(fileURLToPath(import.meta.url));

async function seed() {
  const sql = await fs.readFile(path.join(here, 'seed.sql'), 'utf8');
  await pool.query(sql);
  console.log('[seed] facilities inserted');
  await pool.end();
}

seed().catch((err) => {
  console.error('[seed] failed', err);
  process.exit(1);
});