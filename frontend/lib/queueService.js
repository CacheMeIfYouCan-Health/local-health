/**
 * MOCK IMPLEMENTATION.
 *
 * Every function maps 1:1 to a backend endpoint. When the API is ready,
 * replace the bodies with fetch() calls and delete `delay` — the signatures
 * and return shapes are the contract. Nothing else in the app should change.
 */

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let sessionCounter = 0;
const nextSessionId = () => `local-${Date.now()}-${(sessionCounter += 1)}`;

export async function checkIn({
  facilityId,
  queueType,
  peopleAhead,
  peopleAheadBucket,
  locationVerified,
}) {
  await delay(400);
  return {
    sessionId: nextSessionId(),
    facilityId,
    queueType,
    peopleAhead,
    peopleAheadBucket,
    locationVerified,
    checkInAt: new Date().toISOString(),
  };
}

/**
 * Mock aggregated status. Replace with GET /api/facilities/:id/queue/status
 * when the backend exists. Shape is the contract.
 *
 * congestionLevel: 'low' | 'moderate' | 'high' | 'unknown'
 */
export async function getQueueStatus({ facilityId, queueType }) {
  await delay(300);

  // Deterministic mock keyed off facility + queue so it feels stable across
  // re-renders but changes per queue type. Delete once real data exists.
  const seed = `${facilityId}:${queueType || 'all'}`
    .split('')
    .reduce((a, c) => a + c.charCodeAt(0), 0);

  const levels = ['low', 'moderate', 'high'];
  const congestionLevel = levels[seed % levels.length];

  const baseWait = { low: 18, moderate: 47, high: 96 }[congestionLevel];
  const jitter = (seed % 11) - 5;

  return {
    facilityId,
    queueType: queueType ?? null,
    congestionLevel,
    averageWaitMinutes: Math.max(5, baseWait + jitter),
    sampleSize: 3 + (seed % 14),
    lastReportedAt: new Date(Date.now() - (seed % 25) * 60000).toISOString(),
    breakdown: [
      { queueType: 'general', congestionLevel: 'high', averageWaitMinutes: 102, sampleSize: 9 },
      { queueType: 'pharmacy', congestionLevel: 'low', averageWaitMinutes: 12, sampleSize: 5 },
      { queueType: 'chronic', congestionLevel: 'moderate', averageWaitMinutes: 58, sampleSize: 4 },
    ],
  };
}

export async function checkOut({ facilityId, sessionId, checkInAt }) {
  await delay(400);
  const checkOutAt = new Date().toISOString();
  const waitMinutes = Math.max(
    0,
    Math.round((new Date(checkOutAt) - new Date(checkInAt)) / 60000),
  );
  return { sessionId, facilityId, checkInAt, checkOutAt, waitMinutes };
}

export async function submitReport({
  facilityId,
  queueType,
  peopleAhead,
  peopleAheadBucket,
  locationVerified,
}) {
  await delay(400);
  return {
    reportId: `r-${Date.now()}`,
    facilityId,
    queueType,
    peopleAhead,
    peopleAheadBucket,
    locationVerified,
    reportedAt: new Date().toISOString(),
  };
}