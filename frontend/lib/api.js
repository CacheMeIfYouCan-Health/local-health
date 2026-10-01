const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000/api';

async function parseError(res, fallback) {
  const body = await res.json().catch(() => ({}));
  return new Error(body.error ?? fallback ?? `Request failed (${res.status})`);
}

export async function fetchNearbyFacilities({ lat, lng, radiusKm = 15, type, limit, signal }) {
  if (lat == null || lng == null) throw new Error('lat/lng required');

  const params = new URLSearchParams({ lat, lng, radiusKm });
  if (type) params.set('type', type);
  if (limit != null) params.set('limit', limit);

  const res = await fetch(`${API_BASE}/facilities/nearby?${params}`, { signal });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function fetchFacility(id, { signal } = {}) {
  if (id == null) throw new Error('id required');
  const res = await fetch(`${API_BASE}/facilities/${id}`, { signal });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function postQueueReport(id, payload, { signal } = {}) {
  const res = await fetch(`${API_BASE}/facilities/${id}/queue-reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok) throw await parseError(res, 'Could not submit report');
  return res.json();
}