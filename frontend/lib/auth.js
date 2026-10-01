const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

async function post(path, body) {
  const res = await fetch(`${BASE}/api/auth/${path}`, {
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
  const res = await fetch(`${BASE}/api/auth/me`, { credentials: 'include', signal });
  if (!res.ok) throw new Error('Not signed in');
  return (await res.json()).user;
}