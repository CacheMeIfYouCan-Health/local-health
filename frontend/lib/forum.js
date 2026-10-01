import { io } from 'socket.io-client';

const API = process.env.NEXT_PUBLIC_API_URL;

async function req(path, opts = {}) {
  const res = await fetch(`${API}/api/forum${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Request failed');
  }
  return res.json();
}

const post = (body) => ({ method: 'POST', body: JSON.stringify({ body }) });
const fid = (id) => encodeURIComponent(id);

export const getUpdates = (f) => req(`/${fid(f)}/updates`);
export const postUpdate = (f, body) => req(`/${fid(f)}/updates`, post(body));
export const getQuestions = (f) => req(`/${fid(f)}/questions`);
export const postQuestion = (f, body) => req(`/${fid(f)}/questions`, post(body));
export const getReplies = (qid) => req(`/questions/${qid}/replies`);
export const postReply = (qid, body) => req(`/questions/${qid}/replies`, post(body));

let socket;
export function getSocket() {
  if (!socket) socket = io(API, { withCredentials: true });
  return socket;
}