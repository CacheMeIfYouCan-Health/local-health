import { badRequest } from '../utils/httpError.js';

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/**
 * Validates the query for GET /api/facilities/nearby.
 * Requires lat & lng; radiusKm, type and limit are optional.
 */
export function validateNearbyQuery(req, _res, next) {
  const lat = toNumber(req.query.lat);
  const lng = toNumber(req.query.lng);

  if (lat === null || lat < -90 || lat > 90) {
    return next(badRequest('Query param "lat" must be a number between -90 and 90'));
  }
  if (lng === null || lng < -180 || lng > 180) {
    return next(badRequest('Query param "lng" must be a number between -180 and 180'));
  }

  const radiusKm = req.query.radiusKm === undefined
    ? 15
    : toNumber(req.query.radiusKm);
  if (radiusKm === null || radiusKm <= 0 || radiusKm > 200) {
    return next(badRequest('Query param "radiusKm" must be between 0 and 200'));
  }

  const limit = req.query.limit === undefined ? 100 : toNumber(req.query.limit);
  if (limit === null || limit < 1 || limit > 200) {
    return next(badRequest('Query param "limit" must be between 1 and 200'));
  }

  const allowedTypes = ['clinic', 'hospital', 'pharmacy', 'practitioner'];
  const type = req.query.type;
  if (type && !allowedTypes.includes(type)) {
    return next(badRequest(`Query param "type" must be one of: ${allowedTypes.join(', ')}`));
  }

  req.validated = { lat, lng, radiusKm, limit, type: type || null };
  next();
}

export function validateIdParam(req, _res, next) {
  const id = req.params.id;

  // Accept either a numeric id (legacy), an OSM id, or a fallback id
  const okFormat = /^(\d+|osm-(node|way|relation)-\d+|fallback-\d+)$/.test(id);
  if (!okFormat) {
    return next(badRequest('Path param "id" has an invalid format'));
  }

  req.validated = { ...(req.validated ?? {}), id };
  next();
}