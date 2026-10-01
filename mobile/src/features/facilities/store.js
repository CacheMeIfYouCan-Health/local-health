import { useEffect, useSyncExternalStore } from 'react';
import * as Location from 'expo-location';
import { fetchNearbyFacilities, getFacilitiesCache, saveFacilitiesCache } from '@/lib/api';

/**
 * Offline facilities store, shared by the SOS and Nearby screens.
 *
 * The network is only used:
 *  - automatically, once, when the offline cache is empty (first launch), or
 *  - when the user explicitly taps "Update".
 * Everything else reads the cache persisted in AsyncStorage, so phone numbers
 * remain available with no signal.
 */

export const FALLBACK_ORIGIN = { lat: -26.2041, lng: 28.0473, label: 'Johannesburg' };
const RADIUS_KM = 25;
const LIMIT = 200;
const LOCATION_TIMEOUT_MS = 20000;

let state = {
  hydrated: false,
  cache: null,        // { facilities, fetchedAt, origin: {lat,lng,isFallback}, radiusKm }
  loading: false,
  error: null,        // { kind: 'permission'|'location'|'network'|'timeout'|'http', message, canAskAgain? }
};
let autoFetchAttempted = false;
let hydratePromise = null;
const listeners = new Set();

function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

export function hydrate() {
  if (!hydratePromise) {
    hydratePromise = getFacilitiesCache().then((cache) => {
      setState({ hydrated: true, cache });
    });
  }
  return hydratePromise;
}

class LocationError extends Error {
  constructor(kind, message, canAskAgain = true) {
    super(message);
    this.kind = kind;
    this.canAskAgain = canAskAgain;
  }
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

async function getDeviceOrigin() {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm.status !== 'granted') {
    throw new LocationError(
      'permission',
      'Location permission was not granted. We use your location once to find clinics, hospitals and pharmacies near you — it is not stored on our server.',
      perm.canAskAgain !== false,
    );
  }

  const servicesOn = await Location.hasServicesEnabledAsync().catch(() => true);
  if (!servicesOn) {
    throw new LocationError('location', 'Location services are turned off. Turn on location in your phone settings and try again.');
  }

  // A recent cached fix is instant and good enough for a 25 km search.
  const recent = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000, requiredAccuracy: 1000 }).catch(() => null);
  if (recent) return { lat: recent.coords.latitude, lng: recent.coords.longitude, isFallback: false };

  try {
    const pos = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      LOCATION_TIMEOUT_MS,
    );
    return { lat: pos.coords.latitude, lng: pos.coords.longitude, isFallback: false };
  } catch {
    const any = await Location.getLastKnownPositionAsync().catch(() => null);
    if (any) return { lat: any.coords.latitude, lng: any.coords.longitude, isFallback: false };
    throw new LocationError('location', "We couldn't get your location. Move somewhere with a clearer view of the sky, or use Johannesburg instead.");
  }
}

/**
 * Fetch from the backend and replace the offline cache.
 * On failure the existing cache is kept and an error is exposed.
 */
export async function refreshFacilities({ useFallback = false } = {}) {
  if (state.loading) return;
  await hydrate();
  setState({ loading: true, error: null });
  try {
    const origin = useFallback
      ? { lat: FALLBACK_ORIGIN.lat, lng: FALLBACK_ORIGIN.lng, isFallback: true }
      : await getDeviceOrigin();
    const facilities = await fetchNearbyFacilities({ lat: origin.lat, lng: origin.lng, radiusKm: RADIUS_KM, limit: LIMIT });
    const cache = { facilities, fetchedAt: Date.now(), origin, radiusKm: RADIUS_KM };
    await saveFacilitiesCache(cache);
    setState({ cache, loading: false });
  } catch (e) {
    setState({
      loading: false,
      error: {
        kind: e?.kind || 'network',
        message: e?.message || 'Something went wrong.',
        canAskAgain: e?.canAskAgain,
      },
    });
  }
}

/** Load the cache and, if it's empty, fetch once automatically. */
export async function ensureFacilities() {
  await hydrate();
  if (!state.cache && !autoFetchAttempted) {
    autoFetchAttempted = true;
    await refreshFacilities();
  }
}

export function clearFacilitiesError() {
  setState({ error: null });
}

export function useFacilities() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => { hydrate(); }, []);
  return snap;
}
