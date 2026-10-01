'use client';

import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { SOCKET_URL } from './api';

let socket = null;
function getSocket() {
  if (!socket) socket = io(SOCKET_URL, { withCredentials: true, transports: ['websocket', 'polling'] });
  return socket;
}

const addOnce = (list, item) => (list.some((m) => m.id === item.id) ? list : [...list, item]);
export const channelKey = (channel) => (channel === 'questions' ? 'questions' : 'updates');
export const forumQueryKey = (locationId) => ['forum', locationId];

/**
 * Joins this forum's Socket.IO room and folds live events into the cached
 * forum query. The server only emits after writing to Postgres, so the cache
 * never shows something the next fetch wouldn't.
 */
export default function useForumLive(forumId, locationId) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!forumId) return undefined;
    const s = getSocket();
    const join = () => s.emit('forum:join', forumId);
    join();
    s.on('connect', join); // re-join after a reconnect

    const patch = (fn) =>
      queryClient.setQueryData(forumQueryKey(locationId), (old) => (old ? fn(old) : old));

    const onMessage = (m) =>
      patch((old) => ({ ...old, [channelKey(m.channel)]: addOnce(old[channelKey(m.channel)], m) }));

    const onDeleted = ({ id, channel }) =>
      patch((old) => ({
        ...old,
        [channelKey(channel)]: old[channelKey(channel)].filter((m) => m.id !== id),
      }));

    const onReply = ({ questionId, reply, replyCount }) => {
      patch((old) => ({
        ...old,
        questions: old.questions.map((q) => (q.id === questionId ? { ...q, replyCount } : q)),
      }));
      queryClient.setQueryData(['replies', questionId], (old) =>
        old ? { ...old, replies: addOnce(old.replies, reply) } : old,
      );
    };

    const onSummary = (summary) => patch((old) => ({ ...old, summary }));

    s.on('message:new', onMessage);
    s.on('message:deleted', onDeleted);
    s.on('reply:new', onReply);
    s.on('summary:new', onSummary);
    return () => {
      s.emit('forum:leave', forumId);
      s.off('connect', join);
      s.off('message:new', onMessage);
      s.off('message:deleted', onDeleted);
      s.off('reply:new', onReply);
      s.off('summary:new', onSummary);
    };
  }, [forumId, locationId, queryClient]);
}

export { addOnce };
