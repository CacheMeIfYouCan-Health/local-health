import { Server } from 'socket.io';

// Socket.IO is delivery only: every event is emitted after the row it
// describes has been committed to Postgres, so a client that misses an event
// still sees the data on its next fetch.
let io = null;

export const forumRoom = (forumId) => `forum:${forumId}`;

export function initRealtime(httpServer, origins) {
  io = new Server(httpServer, {
    cors: { origin: origins, credentials: true },
  });

  io.on('connection', (socket) => {
    socket.on('forum:join', (forumId) => {
      // A forum is a facility id such as osm-node-123 or fallback-4.
      if (/^[a-z0-9-]{1,64}$/i.test(String(forumId))) socket.join(forumRoom(forumId));
    });
    socket.on('forum:leave', (forumId) => {
      socket.leave(forumRoom(forumId));
    });
  });

  return io;
}

export function emitToForum(forumId, event, payload) {
  io?.to(forumRoom(forumId)).emit(event, payload);
}
