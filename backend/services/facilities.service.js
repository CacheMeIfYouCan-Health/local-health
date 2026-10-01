import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pool from '../lib/db.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FALLBACK_PATH = path.join(here, '..', 'data', 'facilities-fallback.json');
const FALLBACK = JSON.parse(fs.readFileSync(FALLBACK_PATH, 'utf8'));
console.log(`[facilities] loaded ${FALLBACK.length} fallback facilities`);

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

// Overpass answers 406 to the placeholder "you@example.com" contact, which
// silently pushed every map search onto the 20-facility Johannesburg fallback.
const USER_AGENT =
  process.env.OVERPASS_USER_AGENT ??
  'LocalHealth/1.0 (+https://github.com/CacheMeIfYouCan-Health/local-health)';
const CACHE_TTL_MS = 30 * 60 * 1000;
const FALLBACK_TTL_MS = 60 * 1000;
const MIN_INTERVAL_MS = 3000;
const OVERPASS_TIMEOUT_MS = 25_000;
const CACHE_TTL_DAYS = 7;
// Queue reports older than this no longer count towards the current status.
const QUEUE_WINDOW_HOURS = Number(process.env.QUEUE_WINDOW_HOURS) || 4;

const cache = new Map();
let lastCallAt = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function throttle() {
  const wait = lastCallAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastCallAt = Date.now();
}

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function bbox({ lat, lng, radiusKm }) {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

function bboxKey({ lat, lng, radiusKm }) {
  const r = (n) => Math.round(n * 100) / 100;
  return `${r(lat)}|${r(lng)}|${r(radiusKm)}`;
}

function cacheKey({ lat, lng, radiusKm }) {
  return `${lat.toFixed(2)}|${lng.toFixed(2)}|${radiusKm}`;
}

function buildQuery({ lat, lng, radiusKm }) {
  const r = radiusKm * 1000;
  return `[out:json][timeout:25];
(
  nwr["amenity"~"^(hospital|clinic|pharmacy|doctors)$"](around:${r},${lat},${lng});
);
out center tags;`;
}

async function fetchOverpass({ lat, lng, radiusKm }) {
  const query = buildQuery({ lat, lng, radiusKm });

  for (const url of OVERPASS_ENDPOINTS) {
    await throttle();
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': USER_AGENT,
          Accept: 'application/json',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(OVERPASS_TIMEOUT_MS),
      });
      if (res.status === 429 || !res.ok) {
        console.warn(`[overpass] ${url} -> ${res.status}`);
        continue;
      }
      const json = await res.json();
      const elements = json.elements ?? [];
      if (elements.length > 0) return { elements, source: 'overpass' };
      console.warn(`[overpass] ${url} returned 0 elements`);
    } catch (err) {
      console.warn(`[overpass] ${url} failed:`, err.message);
    }
  }

  console.warn('[overpass] all endpoints failed, using local fallback');
  return { elements: null, source: 'fallback' };
}

function classify(tags) {
  const a = tags.amenity;
  const h = tags.healthcare;
  if (a === 'hospital' || h === 'hospital') return 'hospital';
  if (a === 'clinic' || h === 'clinic') return 'clinic';
  if (a === 'pharmacy' || h === 'pharmacy') return 'pharmacy';
  if (a === 'doctors' || h === 'doctor') return 'practitioner';
  return null;
}

function transformOverpass(element) {
  const tags = element.tags ?? {};
  const type = classify(tags);
  if (!type) return null;

  const lat = element.lat ?? element.center?.lat;
  const lng = element.lon ?? element.center?.lon;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const address =
    [
      tags['addr:housenumber'],
      tags['addr:street'],
      tags['addr:suburb'],
      tags['addr:city'],
    ]
      .filter(Boolean)
      .join(', ') || null;

  return {
    id: `osm-${element.type}-${element.id}`,
    name: tags.name || tags['name:en'] || 'Unnamed facility',
    type,
    address,
    phone: tags.phone || tags['contact:phone'] || null,
    emergency_phone: null,
    latitude: lat,
    longitude: lng,
    operating_hours: tags.opening_hours || null,
    services: [],
  };
}

async function getElements({ lat, lng, radiusKm }) {
  const key = cacheKey({ lat, lng, radiusKm });
  const hit = cache.get(key);
  if (hit) {
    const ttl = hit.source === 'fallback' ? FALLBACK_TTL_MS : CACHE_TTL_MS;
    if (Date.now() - hit.t < ttl) return hit;
  }

  const result = await fetchOverpass({ lat, lng, radiusKm });
  const stored = { t: Date.now(), ...result };
  cache.set(key, stored);
  return stored;
}

// ---------------------------------------------------------------------------
// Nearby: DB cache first, Overpass on miss
// ---------------------------------------------------------------------------

async function readFacilitiesFromDB({ lat, lng, radiusKm, limit, type }) {
  const { minLat, maxLat, minLng, maxLng } = bbox({ lat, lng, radiusKm });
  const { rows } = await pool.query(
    `SELECT external_id AS id, name, type, address, phone, emergency_phone,
            latitude, longitude, operating_hours, services
       FROM facilities
      WHERE latitude  BETWEEN $1 AND $2
        AND longitude BETWEEN $3 AND $4`,
    [minLat, maxLat, minLng, maxLng]
  );

  const out = [];
  for (const row of rows) {
    const f = normaliseRow(row);
    if (type && f.type !== type) continue;
    if (!Number.isFinite(f.latitude) || !Number.isFinite(f.longitude)) continue;
    const d = distanceKm(lat, lng, f.latitude, f.longitude);
    if (d > radiusKm) continue;
    out.push({ ...f, distance_km: Number(d.toFixed(2)) });
  }
  out.sort((a, b) => a.distance_km - b.distance_km);
  return out.slice(0, limit);
}

async function isRegionFresh(key) {
  const { rows } = await pool.query(
    `SELECT 1 FROM nearby_cache
      WHERE bbox_key = $1
        AND fetched_at > now() - ($2 || ' days')::interval`,
    [key, CACHE_TTL_DAYS]
  );
  return rows.length > 0;
}

async function markRegionFresh(key) {
  await pool.query(
    `INSERT INTO nearby_cache (bbox_key, fetched_at)
     VALUES ($1, now())
     ON CONFLICT (bbox_key) DO UPDATE SET fetched_at = now()`,
    [key]
  );
}

export async function findNearbyFacilities({ lat, lng, radiusKm, limit, type }) {
  const key = bboxKey({ lat, lng, radiusKm });

  if (await isRegionFresh(key)) {
    const rows = await readFacilitiesFromDB({ lat, lng, radiusKm, limit, type });
    console.log(`[facilities] served ${rows.length} from DB cache`);
    return rows;
  }

  const { elements, source } = await getElements({ lat, lng, radiusKm });

  // Overpass is often overloaded (504) for large radii. Rather than shrinking
  // the map to the 20 Johannesburg fallback entries, serve what we already
  // know about this area from the DB, topped up with the fallback list.
  if (source !== 'overpass') {
    const known = await readFacilitiesFromDB({ lat, lng, radiusKm, limit, type });
    const ids = new Set(known.map((f) => f.id));
    const extra = FALLBACK.filter((f) => !ids.has(f.id))
      .filter((f) => !type || f.type === type)
      .map((f) => ({ ...f, distance_km: Number(distanceKm(lat, lng, f.latitude, f.longitude).toFixed(2)) }))
      .filter((f) => f.distance_km <= radiusKm);
    const out = [...known, ...extra].sort((a, b) => a.distance_km - b.distance_km);
    console.log(`[facilities] Overpass unavailable, served ${out.length} from DB + fallback`);
    return out.slice(0, limit);
  }

  const fetched = elements.map(transformOverpass).filter(Boolean);

  for (const f of fetched) {
    try {
      await upsertFacility(f);
    } catch (err) {
      console.warn(`[facilities] upsert failed for ${f.id}:`, err.message);
    }
  }
  // Only remember the region when Overpass actually answered; caching a
  // fallback result hid that area's real facilities for CACHE_TTL_DAYS.
  if (source === 'overpass') await markRegionFresh(key);

  const out = [];
  for (const f of fetched) {
    if (type && f.type !== type) continue;
    const d = distanceKm(lat, lng, f.latitude, f.longitude);
    if (d > radiusKm) continue;
    out.push({ ...f, distance_km: Number(d.toFixed(2)) });
  }
  out.sort((a, b) => a.distance_km - b.distance_km);
  console.log(`[facilities] served ${out.length} from ${source} (fresh → cached)`);
  return out.slice(0, limit);
}

// pg returns NUMERIC columns as strings; the map drops markers whose
// coordinates aren't finite numbers, so coerce here once.
function normaliseRow(row) {
  return {
    ...row,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    services: row.services ?? [],
  };
}

async function readFacilityFromDB(externalId) {
  const { rows } = await pool.query(
    `SELECT external_id AS id, name, type, address, phone, emergency_phone,
            latitude, longitude, operating_hours, services
       FROM facilities
      WHERE external_id = $1`,
    [externalId]
  );
  return rows[0] ? normaliseRow(rows[0]) : null;
}

// Every facility shown on the map was upserted when /nearby served it, so the
// DB answers almost every lookup. Overpass is only a last resort: it is slow,
// rate-limited, and used to make facility pages fail with "not found".
export async function findFacilityById(id) {
  const fb = FALLBACK.find((f) => f.id === id);
  if (fb) return fb;

  const cached = await readFacilityFromDB(id);
  if (cached) return cached;

  const m = String(id).match(/^osm-(node|way|relation)-(\d+)$/);
  if (!m) return null;

  const [, osmType, osmId] = m;
  const query = `[out:json][timeout:10]; ${osmType}(${osmId}); out center tags;`;

  for (const url of OVERPASS_ENDPOINTS) {
    await throttle();
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': USER_AGENT,
          Accept: 'application/json',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(OVERPASS_TIMEOUT_MS),
      });
      if (!res.ok) continue;
      const json = await res.json();
      const el = json.elements?.[0];
      const facility = el ? transformOverpass(el) : null;
      if (facility) await upsertFacility(facility).catch(() => {});
      return facility;
    } catch {
      /* try next endpoint */
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Queue sessions
// ---------------------------------------------------------------------------

export async function createQueueSession({
  facility,
  queueType,
  peopleAhead,
  peopleAheadBucket,
  locationVerified,
}) {
  const facilityIntId = await upsertFacility(facility);
  const sessionId = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const { rows } = await pool.query(
    `INSERT INTO queue_sessions
       (session_id, facility_id, queue_type, people_ahead,
        people_ahead_bucket, location_verified, check_in_at, created_at)
     VALUES ($1,$2,$3,$4,$5,$6, now(), now())
     RETURNING session_id, facility_id, queue_type, people_ahead,
               people_ahead_bucket, location_verified, check_in_at, check_out_at, wait_minutes`,
    [
      sessionId,
      facilityIntId,
      queueType ?? null,
      peopleAhead ?? null,
      peopleAheadBucket ?? null,
      !!locationVerified,
    ]
  );
  return rows[0];
}

export async function findQueueSessionById(sessionId) {
  const { rows } = await pool.query(
    `SELECT qs.session_id,
            qs.facility_id,
            f.external_id AS facility_external_id,
            qs.queue_type,
            qs.people_ahead,
            qs.people_ahead_bucket,
            qs.location_verified,
            qs.check_in_at,
            qs.check_out_at,
            qs.wait_minutes
       FROM queue_sessions qs
       LEFT JOIN facilities f ON f.id = qs.facility_id
      WHERE qs.session_id = $1`,
    [sessionId]
  );
  return rows[0] ?? null;
}

export async function closeQueueSession(sessionId, checkOutAt, waitMinutes) {
  const { rows } = await pool.query(
    `UPDATE queue_sessions
        SET check_out_at = $2, wait_minutes = $3
      WHERE session_id = $1
      RETURNING session_id, facility_id, check_in_at, check_out_at, wait_minutes`,
    [sessionId, checkOutAt, waitMinutes]
  );
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Queue reports
// ---------------------------------------------------------------------------

// Keys must match PEOPLE_AHEAD_PRESETS in frontend/lib/queue/queueConstants.js.
// They didn't before (few/some/many), so every report was stored with a NULL
// congestion and the facility status never changed after submitting.
const BUCKET_TO_WEIGHT = {
  none: 1,
  '1-4': 1,
  '5-8': 2,
  '9-12': 2,
  '13-16': 3,
  '16plus': 3,
  few: 1,
  some: 2,
  many: 3,
};

export function congestionFromBucket(bucket, peopleAhead) {
  const w = BUCKET_TO_WEIGHT[bucket];
  if (w != null) return w === 1 ? 'low' : w === 2 ? 'moderate' : 'high';

  // Fallback: infer from peopleAhead count
  if (typeof peopleAhead === 'number') {
    if (peopleAhead <= 5) return 'low';
    if (peopleAhead <= 15) return 'moderate';
    return 'high';
  }
  return null;
}

export async function createQueueReport({
  facility,
  queueType,
  peopleAhead,
  peopleAheadBucket,
  locationVerified,
  notes,
}) {
  const facilityIntId = await upsertFacility(facility);
  const congestion = congestionFromBucket(peopleAheadBucket, peopleAhead);

  const { rows } = await pool.query(
    `INSERT INTO queue_reports
       (facility_id, queue_length, wait_minutes, congestion,
        service_type, notes, location_verified, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now())
     RETURNING *`,
    [
      facilityIntId,
      peopleAhead ?? null,
      null,
      congestion,
      queueType ?? null,
      notes ?? null,
      !!locationVerified,
    ]
  );

  return rows[0];
}

export async function findRecentQueueReports(externalId) {
  const { rows } = await pool.query(
    `SELECT qr.id,
            qr.queue_length   AS people_ahead,
            qr.wait_minutes,
            qr.congestion,
            qr.service_type   AS queue_type,
            qr.notes,
            qr.location_verified,
            qr.created_at
       FROM queue_reports qr
       JOIN facilities f ON f.id = qr.facility_id
      WHERE f.external_id = $1
        AND qr.created_at > now() - make_interval(hours => $2)
      ORDER BY qr.created_at DESC
      LIMIT 10`,
    [externalId, QUEUE_WINDOW_HOURS]
  );
  return rows;
}

/** Average measured wait (check-in → check-out) over the recent window. */
export async function findRecentAverageWait(externalId) {
  const { rows } = await pool.query(
    `SELECT ROUND(AVG(qs.wait_minutes)) AS avg_wait, COUNT(*) AS n
       FROM queue_sessions qs
       JOIN facilities f ON f.id = qs.facility_id
      WHERE f.external_id = $1
        AND qs.wait_minutes IS NOT NULL
        AND qs.check_out_at > now() - make_interval(hours => $2)`,
    [externalId, QUEUE_WINDOW_HOURS]
  );
  return Number(rows[0]?.n) > 0 ? Number(rows[0].avg_wait) : null;
}

export async function findQueueSummariesFor(externalIds) {
  const map = new Map();
  if (!externalIds?.length) return map;

  const { rows } = await pool.query(
    `WITH reports AS (
       SELECT f.external_id,
              COUNT(*) FILTER (WHERE qr.congestion IS NOT NULL) AS sample_size,
              AVG(CASE qr.congestion
                    WHEN 'low' THEN 1
                    WHEN 'moderate' THEN 2
                    WHEN 'high' THEN 3
                  END) AS avg_weight,
              MAX(qr.created_at) AS last_reported_at
         FROM queue_reports qr
         JOIN facilities f ON f.id = qr.facility_id
        WHERE f.external_id = ANY($1::text[])
          AND qr.created_at > now() - make_interval(hours => $2)
        GROUP BY f.external_id
     ),
     waits AS (
       SELECT f.external_id, ROUND(AVG(qs.wait_minutes)) AS avg_wait_minutes
         FROM queue_sessions qs
         JOIN facilities f ON f.id = qs.facility_id
        WHERE f.external_id = ANY($1::text[])
          AND qs.wait_minutes IS NOT NULL
          AND qs.check_out_at > now() - make_interval(hours => $2)
        GROUP BY f.external_id
     )
     SELECT r.*, w.avg_wait_minutes
       FROM reports r
       LEFT JOIN waits w USING (external_id)`,
    [externalIds, QUEUE_WINDOW_HOURS]
  );

  for (const r of rows) {
    if (Number(r.sample_size) === 0) continue;
    const avg = Number(r.avg_weight);
    map.set(r.external_id, {
      congestion: avg < 1.5 ? 'low' : avg < 2.5 ? 'moderate' : 'high',
      sampleSize: Number(r.sample_size),
      avgWaitMinutes: r.avg_wait_minutes != null ? Number(r.avg_wait_minutes) : null,
      lastReportedAt: r.last_reported_at,
    });
  }
  return map;
}

// ---------------------------------------------------------------------------
// Facility upsert
// ---------------------------------------------------------------------------

export async function upsertFacility(facility) {
  const {
    id: externalId,
    name,
    type,
    address,
    phone,
    emergency_phone,
    latitude,
    longitude,
    operating_hours,
    services,
  } = facility;

  const { rows } = await pool.query(
    `INSERT INTO facilities
       (external_id, name, type, address, phone, emergency_phone,
        latitude, longitude, operating_hours, services, cached_at, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now(), now(), now())
     ON CONFLICT (external_id) DO UPDATE SET
       name = EXCLUDED.name,
       type = EXCLUDED.type,
       address = EXCLUDED.address,
       phone = EXCLUDED.phone,
       emergency_phone = EXCLUDED.emergency_phone,
       latitude = EXCLUDED.latitude,
       longitude = EXCLUDED.longitude,
       operating_hours = EXCLUDED.operating_hours,
       services = EXCLUDED.services,
       cached_at = now(),
       updated_at = now()
     RETURNING id`,
    [
      externalId,
      name,
      type,
      address,
      phone,
      emergency_phone,
      latitude,
      longitude,
      operating_hours ? JSON.stringify(operating_hours) : null,
      services ?? [],
    ]
  );
  return rows[0].id;
}