import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

// Neon needs SSL; a local Postgres usually doesn't support it.
// Set PGSSLMODE=disable (or ?sslmode=disable in the URL) for local databases.
const sslDisabled =
  process.env.PGSSLMODE === 'disable' ||
  /[?&]sslmode=disable\b/.test(process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslDisabled ? false : { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('[db] unexpected pool error', err);
});

export default pool;
