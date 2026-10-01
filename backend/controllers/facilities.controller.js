import {
  findNearbyFacilities,
  findFacilityById,
  findRecentQueueReports,
  createQueueReport,
  findQueueSummariesFor,
  createQueueSession,
  findQueueSessionById,
  closeQueueSession,
} from '../services/facilities.service.js';
import { notFound } from '../utils/httpError.js';

/** GET /api/facilities/nearby */
export async function getNearbyFacilities(req, res) {
  const { lat, lng, radiusKm, limit, type } = req.validated;
  const rows = await findNearbyFacilities({ lat, lng, radiusKm, limit, type });

  const queueMap = await findQueueSummariesFor(rows.map((r) => r.id));

  res.json({
    meta: {
      origin: { lat, lng },
      radiusKm,
      count: rows.length,
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
      queue: queueMap.get(row.id) ?? {
        congestion: 'unknown',
        sampleSize: 0,
        avgWaitMinutes: null,
        lastReportedAt: null,
      },
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

  const report = await createQueueReport({ facility, ...req.body });
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

/** POST /api/facilities/:id/queue-sessions */
export async function postCheckIn(req, res) {
  const { id } = req.validated;
  const facility = await findFacilityById(id);
  if (!facility) throw notFound('Facility not found');

  const row = await createQueueSession({
    facility,
    queueType: req.body.queueType,
    peopleAhead: req.body.peopleAhead ?? null,
    peopleAheadBucket: req.body.peopleAheadBucket ?? null,
    locationVerified: !!req.body.locationVerified,
  });

  res.status(201).json({
    session: {
      sessionId: row.session_id,
      facilityId: row.facility_id,
      queueType: row.queue_type,
      peopleAhead: row.people_ahead,
      peopleAheadBucket: row.people_ahead_bucket,
      locationVerified: row.location_verified,
      checkInAt: row.check_in_at,
      checkOutAt: row.check_out_at,
      waitMinutes: row.wait_minutes,
    },
  });
}

/** POST /api/facilities/:id/queue-sessions/:sessionId/checkout */
export async function postCheckOut(req, res) {
  const { id, sessionId } = req.validated;
  const facility = await findFacilityById(id);
  if (!facility) throw notFound('Facility not found');

  const session = await findQueueSessionById(sessionId);
  if (!session || session.facility_external_id !== id) {
    throw notFound('Session not found');
  }

  const checkOutAt = new Date();
  const waitMinutes = Math.max(
    0,
    Math.round((checkOutAt - new Date(session.check_in_at)) / 60000)
  );

  await closeQueueSession(sessionId, checkOutAt, waitMinutes);

  res.json({
    sessionId,
    facilityId: id,
    checkInAt: session.check_in_at,
    checkOutAt: checkOutAt.toISOString(),
    waitMinutes,
  });
}