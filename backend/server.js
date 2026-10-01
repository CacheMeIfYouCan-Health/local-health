import 'dotenv/config';
import http from 'http';
import { createApp } from './app.js';
import { initSocket } from './lib/socket.js';

const PORT = process.env.PORT || 4000;
const app = createApp();
const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});