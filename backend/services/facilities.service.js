import { query } from '../config/db.js';

/**
 * Haversine distance in kilometres, evaluated inside Postgres so we don't
 * pull the whole table into Node. A bounding box narrows the scan first.
 */
const NEARBY_SQL = `
  WITH filtered AS (
    SELECT *
    FROM facilities
    WHERE latitude BETWEEN $1 - ($3 / 111.0)
                      AND $1 + ($3 / 111.0)
      AND longitude BETWEEN $2 - ($3 / (111.0 * COALESCE(cos(radians($1)), 1)))
                        AND $2 + ($3 / (111.0 * COALESCE(cos(radians($1)), 1)))
      AND ($4::text IS NULL OR type = $4::text)
  )
  SELECT
    id, name, type, address, phone, emergency_phone,
    latitude, longitude, operating_hours, services,
    6371 * acos(
      LEAST(1,
        cos(radians($1)) * cos(radians(latitude)) * cos(radians(longitude) - radians($2))
        + sin(radians($1)) * sin(radians(latitude))
      )
    ) AS distance_km
  FROM filtered
  WHERE 6371 * acos(
      LEAST(1,
        cos(radians($1)) * cos(radians(latitude)) * cos(radians(longitude) - radians($2))
        + sin(radians($1)) * sin(radians(latitude))
      )
    ) <= $3
  ORDER BY distance_km ASC
  LIMIT $5;
`;

export async function findNearbyFacilities({ lat, lng, radiusKm, limit, type }) {
  const { rows } = await query(NEARBY_SQL, [lat, lng, radiusKm, type, limit]);
  return rows;
}

const DETAIL_SQL = `
  SELECT id, name, type, address, phone, emergency_phone,
         latitude, longitude, operating_hours, services,
         created_at, updated_at
  FROM facilities
  WHERE id = $1;
`;

export async function findFacilityById(id) {
  const { rows } = await query(DETAIL_SQL, [id]);
  return rows[0] ?? null;
}

const LATEST_QUEUE_SQL = `
  SELECT id, queue_length, wait_minutes, congestion, service_type,
         notes, location_verified, created_at
  FROM queue_reports
  WHERE facility_id = $1
    AND created_at > NOW() - INTERVAL '3 hours'
  ORDER BY created_at DESC
  LIMIT 20;
`;

export async function findRecentQueueReports(facilityId) {
  const { rows } = await query(LATEST_QUEUE_SQL, [facilityId]);
  return rows;
}

const INSERT_QUEUE_SQL = `
  INSERT INTO queue_reports
    (facility_id, queue_length, wait_minutes, congestion,
     service_type, notes, location_verified)
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  RETURNING id, facility_id, queue_length, wait_minutes, congestion,
            service_type, notes, location_verified, created_at;
`;

export async function createQueueReport(input) {
  const { rows } = await query(INSERT_QUEUE_SQL, [
    input.facilityId,
    input.queueLength ?? null,
    input.waitMinutes ?? null,
    input.congestion ?? null,
    input.serviceType ?? null,
    input.notes ?? null,
    input.locationVerified ?? false,
  ]);
  return rows[0];
}

const QUEUE_SUMMARY_SQL = `
  SELECT facility_id, congestion, wait_minutes, created_at
  FROM queue_reports
  WHERE facility_id = ANY($1::int[])
    AND created_at > NOW() - INTERVAL '3 hours'
  ORDER BY facility_id, created_at DESC;
`;

export async function findQueueSummariesFor(facilityIds) {
  if (!facilityIds.length) return new Map();

  const { rows } = await query(QUEUE_SUMMARY_SQL, [facilityIds]);

  const grouped = new Map();
  for (const row of rows) {
    if (!grouped.has(row.facility_id)) grouped.set(row.facility_id, []);
    grouped.get(row.facility_id).push(row);
  }

  const summaries = new Map();
  for (const [id, reports] of grouped.entries()) {
    summaries.set(id, summariseQueue(reports));
  }
  return summaries;
}

function summariseQueue(reports) {
  if (reports.length === 0) {
    return {
      congestion: 'unknown',
      sampleSize: 0,
      avgWaitMinutes: null,
      lastReportedAt: null,
    };
  }

  const weights = { low: 1, moderate: 2, high: 3 };
  const scored = reports.filter((r) => r.congestion);
  const waits = reports
    .filter((r) => Number.isFinite(r.wait_minutes))
    .map((r) => r.wait_minutes);

  let congestion = 'unknown';
  if (scored.length > 0) {
    const avg = scored.reduce((s, r) => s + weights[r.congestion], 0) / scored.length;
    congestion = avg < 1.5 ? 'low' : avg < 2.5 ? 'moderate' : 'high';
  }

  const avgWaitMinutes = waits.length
    ? Math.round(waits.reduce((s, w) => s + w, 0) / waits.length)
    : null;

  return {
    congestion,
    sampleSize: reports.length,
    avgWaitMinutes,
    lastReportedAt: reports[0].created_at,
  };
}