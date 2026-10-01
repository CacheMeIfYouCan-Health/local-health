// Same base as lib/api.js. This used to default to :5000 while the API runs on
// :4000, so sign up / log in always failed locally.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000/api';

async function post(path, body) {
  const res = await fetch(`${API_BASE}/auth/${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? 'Request failed');
  return data;
}

export const signup = (v) => post('signup', v);
export const login = (v) => post('login', v);
export const logout = () => post('logout', {});

export async function fetchMe({ signal } = {}) {
  const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include', signal });
  if (!res.ok) throw new Error('Not signed in');
  return (await res.json()).user;
}