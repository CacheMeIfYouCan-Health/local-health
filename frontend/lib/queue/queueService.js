import { postQueueReport } from '@lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000/api';

async function parseError(res, fallback) {
  const body = await res.json().catch(() => ({}));
  return new Error(body.error ?? fallback ?? `Request failed (${res.status})`);
}

export async function checkIn({
  facilityId,
  queueType,
  peopleAhead,
  peopleAheadBucket,
  locationVerified,
  signal,
}) {
  const res = await fetch(`${API_BASE}/facilities/${facilityId}/queue-sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queueType, peopleAhead, peopleAheadBucket, locationVerified }),
    signal,
  });
  if (!res.ok) throw await parseError(res, 'Could not check in');
  const { session } = await res.json();
  return session;
}

export async function checkOut({ facilityId, sessionId, checkInAt, signal }) {
  const res = await fetch(
    `${API_BASE}/facilities/${facilityId}/queue-sessions/${sessionId}/checkout`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkInAt }),
      signal,
    }
  );
  if (!res.ok) throw await parseError(res, 'Could not check out');
  return res.json();
}

export async function submitReport({
  facilityId,
  queueType,
  peopleAhead,
  peopleAheadBucket,
  locationVerified,
  signal,
}) {
  return postQueueReport(
    facilityId,
    { queueType, peopleAhead, peopleAheadBucket, locationVerified },
    { signal }
  );
}