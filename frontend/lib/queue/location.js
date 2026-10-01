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
      reject({ code: 'unsupported' });
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

/**
 * Returns { verified: boolean, reason: string }.
 *
 * `reason` is for local UI only — never sent to the backend.
 * The report payload still contains only `locationVerified: boolean`.
 */
export function facilityCoords(facility) {
  const latitude = Number(facility?.coords?.latitude ?? facility?.latitude);
  const longitude = Number(facility?.coords?.longitude ?? facility?.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? { latitude, longitude }
    : null;
}

export async function checkFacilityProximity(facility, radiusMeters) {
  const coords = facilityCoords(facility);
  if (!coords) {
    return { verified: false, reason: 'no_facility_coords' };
  }

  try {
    const position = await getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
    const meters = distanceMeters(position.coords, coords);
    return meters <= radiusMeters
      ? { verified: true, reason: 'within_range' }
      : { verified: false, reason: 'out_of_range' };
  } catch (err) {
    // GeolocationPositionError: 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
    if (err?.code === 1) return { verified: false, reason: 'permission_denied' };
    if (err?.code === 2) return { verified: false, reason: 'unavailable' };
    if (err?.code === 3) return { verified: false, reason: 'timeout' };
    if (err?.code === 'unsupported')
      return { verified: false, reason: 'unsupported' };
    return { verified: false, reason: 'unknown' };
  }
}

// Backwards-compatible boolean helper if anything else imports it.
export async function isNearFacility(facility, radiusMeters) {
  const { verified } = await checkFacilityProximity(facility, radiusMeters);
  return verified;
}