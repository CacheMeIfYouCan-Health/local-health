// Loads data/facilities-fallback.json into the facilities table so a fresh
// database has something to show before Overpass has been queried.
// Usage: npm run db:seed
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pool from '../lib/db.js';
import { upsertFacility } from '../services/facilities.service.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const facilities = JSON.parse(
  fs.readFileSync(path.join(here, '..', 'data', 'facilities-fallback.json'), 'utf8')
);

try {
  for (const f of facilities) await upsertFacility(f);
  console.log(`[seed] upserted ${facilities.length} facilities`);
} catch (err) {
  console.error('[seed] failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
