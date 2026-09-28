const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000/api';

export async function fetchNearbyFacilities({ lat, lng, radiusKm = 15, type, limit }) {
  const params = new URLSearchParams({ lat, lng, radiusKm });
  if (type) params.set('type', type);
  if (limit) params.set('limit', limit);

  const res = await fetch(`${API_BASE}/facilities/nearby?${params}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

export async function fetchFacility(id) {
  const res = await fetch(`${API_BASE}/facilities/${id}`);
  if (!res.ok) throw new Error('Facility not found');
  return res.json();
}

export async function postQueueReport(id, payload) {
  const res = await fetch(`${API_BASE}/facilities/${id}/queue-reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Could not submit report');
  }
  return res.json();
}