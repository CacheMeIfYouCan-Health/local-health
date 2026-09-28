'use client';

const EARTH_RADIUS_M = 6371000;
const toRad = (deg) => (deg * Math.PI) / 180;

function distanceMeters(a, b) {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

function getCurrentPosition(options) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('geolocation unavailable'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

/**
 * Returns ONLY a boolean.
 *
 * The browser fix is compared against facility.coords inside this function
 * and then discarded. Coordinates are never returned, never logged, and
 * never included in a report payload.
 *
 * Returns false on: no coords, no geolocation API, permission denied,
 * timeout, or out-of-range. There is no "unknown" state.
 */
export async function isNearFacility(facility, radiusMeters) {
  const coords = facility?.coords;
  if (!coords?.latitude || !coords?.longitude) return false;

  try {
    const position = await getCurrentPosition({
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 30000,
    });
    return distanceMeters(position.coords, coords) <= radiusMeters;
  } catch {
    return false;
  }
}