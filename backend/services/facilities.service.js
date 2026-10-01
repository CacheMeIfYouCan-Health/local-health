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

export async function findRecentQueueReports() {
  return [];
}

export async function createQueueReport() {
  throw new Error('Queue reports not yet wired up');
}

export async function findQueueSummariesFor() {
  return new Map();
}