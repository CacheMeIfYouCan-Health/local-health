import 'dotenv/config';
import { createApp } from './app.js';
import { pool } from './config/db.js';

const PORT = process.env.PORT || 4000;
const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});

const shutdown = async (signal) => {
  console.log(`[server] ${signal} received, shutting down…`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'))