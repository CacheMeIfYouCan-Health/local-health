const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000/api';

// Forum calls send the auth cookie: reading works signed out, posting doesn't.
async function request(path, { method = 'GET', body, signal } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error ?? data.message ?? `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

/** Map location id → { forum, updates, questions, summary } */
export const fetchForumForLocation = (locationId, { signal } = {}) =>
  request(`/forums/location/${encodeURIComponent(locationId)}`, { signal });

export const postUpdate = (forumId, { content, latitude, longitude }) =>
  request(`/forums/${forumId}/messages`, {
    method: 'POST',
    body: { content, latitude, longitude },
  });

export const postQuestion = (forumId, content) =>
  request(`/forums/${forumId}/questions`, { method: 'POST', body: { content } });

export const fetchReplies = (questionId, { signal } = {}) =>
  request(`/questions/${questionId}/replies`, { signal });

export const postReply = (questionId, content) =>
  request(`/questions/${questionId}/replies`, { method: 'POST', body: { content } });

export const joinForum = (forumId, notificationsEnabled) =>
  request(`/forums/${forumId}/join`, { method: 'POST', body: { notificationsEnabled } });

export const leaveForum = (forumId) => request(`/forums/${forumId}/leave`, { method: 'POST' });

export const fetchNotificationPreferences = ({ signal } = {}) =>
  request('/notifications/preferences', { signal });

export const saveNotificationPreferences = (patch) =>
  request('/notifications/preferences', { method: 'PUT', body: patch });

export const savePushSubscription = (subscription) =>
  request('/notifications/subscribe', { method: 'POST', body: { subscription } });

export const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? API_BASE.replace(/\/api\/?$/, '');
