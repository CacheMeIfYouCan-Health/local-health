import { Server } from 'socket.io';
const getToken = (header = '') =>
  header
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('token='))
    ?.slice(6);
import jwt from 'jsonwebtoken';

let io;

export function initSocket(httpServer) {
  const origins = process.env.CORS_ORIGIN.split(',').map((s) => s.trim());
  io = new Server(httpServer, { cors: { origin: origins, credentials: true } });

  io.use((socket, next) => {
    try {
      const token = getToken(socket.handshake.headers.cookie);
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = payload.sub;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('join', (facilityId) => socket.join(`facility:${facilityId}`));
    socket.on('leave', (facilityId) => socket.leave(`facility:${facilityId}`));
  });
}

export const getIO = () => io;
export const emitToFacility = (facilityId, event, payload) =>
  io?.to(`facility:${facilityId}`).emit(event, payload);