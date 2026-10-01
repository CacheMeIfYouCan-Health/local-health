import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const FALLBACK_PATH = path.join(here, '..', 'data', 'facilities-fallback.json');
const FALLBACK = JSON.parse(fs.readFileSync(FALLBACK_PATH, 'utf8'));
console.log(`[facilities] loaded ${FALLBACK.length} fallback facilities`);

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const USER_AGENT = 'HealthcareAccessPlatform/1.0 (contact: you@example.com)';
const CACHE_TTL_MS = 30 * 60 * 1000;
const FALLBACK_TTL_MS = 60 * 1000;
const MIN_INTERVAL_MS = 3000;
const OVERPASS_TIMEOUT_MS = 12_000;

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

function buildQuery({ lat, lng, radiusKm }) {
  const r = radiusKm * 1000;
  return `[out:json][timeout:10];
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

function cacheKey({ lat, lng, radiusKm }) {
  return `${lat.toFixed(2)}|${lng.toFixed(2)}|${radiusKm}`;
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

export async function findNearbyFacilities({ lat, lng, radiusKm, limit, type }) {
  const { elements, source } = await getElements({ lat, lng, radiusKm });

  const pool =
    source === 'overpass'
      ? elements.map(transformOverpass).filter(Boolean)
      : FALLBACK;

  const out = [];
  for (const f of pool) {
    if (type && f.type !== type) continue;
    const d = distanceKm(lat, lng, f.latitude, f.longitude);
    if (d > radiusKm) continue;
    out.push({ ...f, distance_km: Number(d.toFixed(2)) });
  }

  out.sort((a, b) => a.distance_km - b.distance_km);
  console.log(`[facilities] served ${out.length} from ${source}`);
  return out.slice(0, limit);
}

export async function findFacilityById(id) {
  const fb = FALLBACK.find((f) => f.id === id);
  if (fb) return fb;

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
      return el ? transformOverpass(el) : null;
    } catch {
      /* try next endpoint */
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Queue sessions (in-memory for now — replace with DB queries later)
// ---------------------------------------------------------------------------

const sessions = new Map(); // sessionId -> session row
let sessionCounter = 0;

export async function createQueueSession({
  facilityId,
  queueType,
  peopleAhead,
  peopleAheadBucket,
  locationVerified,
}) {
  sessionCounter += 1;
  const sessionId = `sess-${Date.now()}-${sessionCounter}`;
  const row = {
    sessionId,
    facilityId,
    queueType,
    peopleAhead,
    peopleAheadBucket,
    locationVerified,
    checkInAt: new Date().toISOString(),
  };
  sessions.set(sessionId, row);
  return row;
}

export async function findQueueSessionById(sessionId) {
  const row = sessions.get(sessionId);
  if (!row) return null;
  // Controller expects snake_case-ish shape: session.facility_id, session.check_in_at
  return {
    sessionId: row.sessionId,
    facility_id: row.facilityId,
    queue_type: row.queueType,
    people_ahead: row.peopleAhead,
    people_ahead_bucket: row.peopleAheadBucket,
    location_verified: row.locationVerified,
    check_in_at: row.checkInAt,
    check_out_at: null,
    wait_minutes: null,
  };
}

export async function closeQueueSession(sessionId, checkOutAt, waitMinutes) {
  const row = sessions.get(sessionId);
  if (!row) return null;
  row.checkOutAt = checkOutAt.toISOString();
  row.waitMinutes = waitMinutes;
  return row;
}

// ---------------------------------------------------------------------------
// Queue reports (in-memory for now — swap for DB later)
// ---------------------------------------------------------------------------

const reports = []; // newest first
let reportCounter = 0;
const REPORTS_PER_FACILITY = 20; // how many recent reports to keep per facility

const BUCKET_TO_WEIGHT = {
  few: 1,      // low
  some: 2,     // moderate
  many: 3,     // high
};

function congestionFromBucket(bucket) {
  const w = BUCKET_TO_WEIGHT[bucket] ?? null;
  if (w === null) return null;
  return w === 1 ? 'low' : w === 2 ? 'moderate' : 'high';
}

export async function createQueueReport({
  facilityId,
  queueType,
  peopleAhead,
  peopleAheadBucket,
  locationVerified,
}) {
  reportCounter += 1;
  const row = {
    id: `rep-${Date.now()}-${reportCounter}`,
    facility_id: facilityId,
    queue_type: queueType ?? null,
    people_ahead: peopleAhead ?? null,
    people_ahead_bucket: peopleAheadBucket ?? null,
    location_verified: !!locationVerified,
    congestion: congestionFromBucket(peopleAheadBucket),
    created_at: new Date().toISOString(),
  };
  reports.unshift(row);
  // Trim old reports per facility
  let seen = 0;
  for (let i = 0; i < reports.length; i++) {
    if (reports[i].facility_id === facilityId) {
      seen++;
      if (seen > REPORTS_PER_FACILITY) {
        reports.splice(i, 1);
        i--;
      }
    }
  }
  return row;
}

export async function findRecentQueueReports(facilityId) {
  return reports.filter((r) => r.facility_id === facilityId).slice(0, 10);
}

export async function findQueueSummariesFor(facilityIds) {
  const map = new Map();
  for (const id of facilityIds) {
    const recent = reports.filter((r) => r.facility_id === id).slice(0, 10);
    if (recent.length === 0) continue;
    const scored = recent.filter((r) => r.congestion);
    if (scored.length === 0) continue;
    const weights = { low: 1, moderate: 2, high: 3 };
    const avg =
      scored.reduce((s, r) => s + weights[r.congestion], 0) / scored.length;
    map.set(id, {
      congestion: avg < 1.5 ? 'low' : avg < 2.5 ? 'moderate' : 'high',
      sampleSize: scored.length,
      avgWaitMinutes: null, // we don't know real wait time from a quick report
      lastReportedAt: recent[0].created_at,
    });
  }
  return map;
}