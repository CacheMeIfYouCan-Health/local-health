import 'dotenv/config';
import http from 'node:http';
import { createApp, allowedOrigins } from './app.js';
import { initRealtime } from './lib/realtime.js';
import { startScheduler } from './jobs/scheduler.js';

const PORT = process.env.PORT || 4000;
const app = createApp();

// One HTTP server for both Express and Socket.IO (live forum updates).
const server = http.createServer(app);
initRealtime(server, allowedOrigins());
startScheduler();

server.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
