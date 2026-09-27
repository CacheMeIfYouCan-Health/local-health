import {
  findNearbyFacilities,
  findFacilityById,
  findRecentQueueReports,
  createQueueReport,
} from '../services/facilities.service.js';
import { notFound } from '../utils/httpError.js';

/** GET /api/facilities/nearby */
export async function getNearbyFacilities(req, res) {
  const { lat, lng, radiusKm, limit, type } = req.validated;
  const rows = await findNearbyFacilities({ lat, lng, radiusKm, limit, type });

  res.json({
    meta: {
      origin: { lat, lng },
      radiusKm,
      count: rows.length,
      // Tells the frontend the radius was widened by the service layer if needed.
      expanded: false,
    },
    facilities: rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      address: row.address,
      phone: row.phone,
      emergencyPhone: row.emergency_phone,
      latitude: row.latitude,
      longitude: row.longitude,
      operatingHours: row.operating_hours,
      services: row.services,
      distanceKm: Number(row.distance_km.toFixed(2)),
    })),
  });
}

/** GET /api/facilities/:id */
export async function getFacility(req, res) {
  const { id } = req.validated;
  const facility = await findFacilityById(id);
  if (!facility) throw notFound('Facility not found');

  const queueReports = await findRecentQueueReports(id);

  res.json({
    facility: {
      id: facility.id,
      name: facility.name,
      type: facility.type,
      address: facility.address,
      phone: facility.phone,
      emergencyPhone: facility.emergency_phone,
      latitude: facility.latitude,
      longitude: facility.longitude,
      operatingHours: facility.operating_hours,
      services: facility.services,
    },
    queue: {
      reports: queueReports,
      summary: summariseQueue(queueReports),
    },
  });
}

/** POST /api/facilities/:id/queue-reports */
export async function postQueueReport(req, res) {
  const { id } = req.validated;
  const facility = await findFacilityById(id);
  if (!facility) throw notFound('Facility not found');

  const report = await createQueueReport({ facilityId: id, ...req.body });
  res.status(201).json({ report });
}

/** Reduce the last few reports into a single congestion signal. */
function summariseQueue(reports) {
  if (reports.length === 0) {
    return { congestion: 'unknown', sampleSize: 0, lastReportedAt: null };
  }

  const weights = { low: 1, moderate: 2, high: 3 };
  const scored = reports.filter((r) => r.congestion);

  if (scored.length === 0) {
    return { congestion: 'unknown', sampleSize: 0, lastReportedAt: reports[0].created_at };
  }

  const avg =
    scored.reduce((sum, r) => sum + weights[r.congestion], 0) / scored.length;

  const congestion = avg < 1.5 ? 'low' : avg < 2.5 ? 'moderate' : 'high';

  return {
    congestion,
    sampleSize: scored.length,
    lastReportedAt: reports[0].created_at,
  };
}