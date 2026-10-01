import pool from './db.js';

try {
  const { rows } = await pool.query('SELECT NOW() as now, version() as v');
  console.log('✅ Neon connected');
  console.log('time:', rows[0].now);
  console.log('version:', rows[0].v);
  await pool.end();
} catch (err) {
  console.error('❌ Connection failed:', err.message);
  process.exit(1);
}