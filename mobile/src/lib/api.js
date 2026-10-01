import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Backend base URL (Express API).
 *
 * Set EXPO_PUBLIC_API_BASE in mobile/.env (see .env.example). EXPO_PUBLIC_*
 * variables are inlined at bundle time, so restart `npx expo start` after
 * changing it.
 *
 * NOTE: `localhost` only works in an emulator/simulator on the same machine
 * (and on the Android emulator you may need http://10.0.2.2:4000/api). On a
 * physical phone this must be your computer's LAN IP, e.g.
 * http://192.168.x.x:4000/api, with the phone on the same Wi-Fi network.
 */
export const API_BASE = (process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:4000/api').replace(/\/+$/, '');

const DEFAULT_TIMEOUT_MS = 15000;
// The first nearby lookup for an area queries OpenStreetMap and can take
// 5–25 s, so give it plenty of headroom.
const FACILITIES_TIMEOUT_MS = 40000;

export class ApiError extends Error {
  constructor(message, { status, kind } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;       // HTTP status, if any
    this.kind = kind;           // 'http' | 'network' | 'timeout'
  }
}

async function request(path, { method = 'GET', body, token, timeout = DEFAULT_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : null),
        ...(token ? { Authorization: `Bearer ${token}` } : null),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    if (e?.name === 'AbortError') {
      throw new ApiError('The server took too long to respond. Please try again.', { kind: 'timeout' });
    }
    throw new ApiError(
      "Can't reach the LocalHealth server. Check your internet connection and try again.",
      { kind: 'network' },
    );
  } finally {
    clearTimeout(timer);
  }

  let data = null;
  try { data = await res.json(); } catch { /* empty or non-JSON body */ }

  if (!res.ok) {
    throw new ApiError(data?.message || `Request failed (${res.status})`, { status: res.status, kind: 'http' });
  }
  return data;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export function signup({ name, email, password }) {
  return request('/auth/signup', { method: 'POST', body: { name, email, password } });
}

export function login({ email, password }) {
  return request('/auth/login', { method: 'POST', body: { email, password } });
}

export function getMe(token) {
  return request('/auth/me', { token });
}

// ---------------------------------------------------------------------------
// Facilities — fetched once, then served from an offline cache.
// ---------------------------------------------------------------------------

const FACILITIES_CACHE_KEY = 'facilities_cache_v1';

/**
 * Calls the backend and returns the raw facility list. Does not touch the
 * cache; see saveFacilitiesCache.
 */
export async function fetchNearbyFacilities({ lat, lng, radiusKm = 25, limit = 200 }) {
  const qs = `lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&radiusKm=${radiusKm}&limit=${limit}`;
  const data = await request(`/facilities/nearby?${qs}`, { timeout: FACILITIES_TIMEOUT_MS });
  return data?.facilities ?? [];
}

/**
 * Cache shape:
 * {
 *   facilities: Facility[],   // as returned by the API, incl. phone/emergencyPhone
 *   fetchedAt: number,        // epoch ms
 *   origin: { lat, lng, isFallback: boolean },
 *   radiusKm: number,
 * }
 */
export async function getFacilitiesCache() {
  try {
    const raw = await AsyncStorage.getItem(FACILITIES_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveFacilitiesCache(cache) {
  await AsyncStorage.setItem(FACILITIES_CACHE_KEY, JSON.stringify(cache));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Hospitals, and any facility that publishes an emergency number, are treated
 * as emergency-capable (replaces the old mock `hasAmbulance` flag).
 */
export function isEmergencyCapable(f) {
  return f?.type === 'hospital' || !!f?.emergencyPhone;
}

export function bestEmergencyNumber(f) {
  return f?.emergencyPhone || f?.phone || null;
}

export function sortByDistance(facilities) {
  return [...facilities].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
}

/** Nearest emergency-capable facility that actually has a number to call. */
export function nearestEmergencyFacility(facilities) {
  return sortByDistance(facilities).find((f) => isEmergencyCapable(f) && bestEmergencyNumber(f)) ?? null;
}
