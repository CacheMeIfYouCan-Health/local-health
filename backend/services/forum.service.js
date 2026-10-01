import pool from '../lib/db.js';
import { findFacilityById } from './facilities.service.js';

// A facility's forum is identified by the map's facility id (osm-node-…,
// fallback-…), stored as facility_id in updates / questions / replies.
export const FORUM_CONFIG = {
  // How close (metres) a poster must be for an update to show "At facility".
  verifyRadiusMeters: Number(process.env.FORUM_VERIFY_RADIUS_METERS) || 500,
  pageSize: 50,
  maxLength: 500, // matches the CHECK on body in Neon
};

const author = (row) => ({ id: String(row.author_id), name: row.author_name });

const toUpdate = (row) => ({
  id: String(row.id),
  forumId: row.facility_id,
  channel: 'updates',
  content: row.body,
  locationVerified: row.location_verified,
  createdAt: row.created_at,
  author: author(row),
});

// Questions never carry a verification badge.
const toQuestion = (row) => ({
  id: String(row.id),
  forumId: row.facility_id,
  channel: 'questions',
  content: row.body,
  locationVerified: false,
  createdAt: row.created_at,
  author: author(row),
  replyCount: Number(row.reply_count ?? 0),
});

const toReply = (row) => ({
  id: String(row.id),
  questionId: String(row.question_id),
  content: row.body,
  createdAt: row.created_at,
  author: author(row),
});

export function toSummary(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    channel: 'updates',
    summary: row.summary,
    messageCount: row.message_count,
    important: row.important,
    createdAt: row.created_at,
  };
}

function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Compares the poster's coordinates with the facility's; only the boolean is kept. */
export function isWithinFacility(forum, latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false;
  return (
    distanceMeters(lat, lng, forum.latitude, forum.longitude) <=
    FORUM_CONFIG.verifyRadiusMeters
  );
}

/** The forum for a map location: the facility itself (DB first, then fallback/Overpass). */
export async function findForum(facilityId) {
  const facility = await findFacilityById(facilityId);
  if (!facility) return null;
  return {
    id: facility.id,
    location: { id: facility.id, name: facility.name, type: facility.type },
    latitude: Number(facility.latitude),
    longitude: Number(facility.longitude),
  };
}

// ---------------------------------------------------------------------------
// Updates & questions
// ---------------------------------------------------------------------------

export async function listUpdates(facilityId) {
  const { rows } = await pool.query(
    `SELECT u.id, u.facility_id, u.body, u.location_verified, u.created_at,
            us.id AS author_id, us.name AS author_name
       FROM updates u
       JOIN users us ON us.id = u.user_id
      WHERE u.facility_id = $1
      ORDER BY u.id DESC
      LIMIT $2`,
    [facilityId, FORUM_CONFIG.pageSize]
  );
  return rows.reverse().map(toUpdate); // oldest first, like a conversation
}

export async function listQuestions(facilityId) {
  const { rows } = await pool.query(
    `SELECT q.id, q.facility_id, q.body, q.created_at,
            us.id AS author_id, us.name AS author_name,
            (SELECT COUNT(*) FROM replies r WHERE r.question_id = q.id) AS reply_count
       FROM questions q
       JOIN users us ON us.id = q.user_id
      WHERE q.facility_id = $1
      ORDER BY q.id DESC
      LIMIT $2`,
    [facilityId, FORUM_CONFIG.pageSize]
  );
  return rows.reverse().map(toQuestion);
}

export async function createUpdate({ facilityId, userId, content, locationVerified }) {
  const { rows } = await pool.query(
    `WITH ins AS (
       INSERT INTO updates (facility_id, user_id, body, location_verified)
       VALUES ($1, $2, $3, $4)
       RETURNING *
     )
     SELECT ins.*, us.id AS author_id, us.name AS author_name
       FROM ins JOIN users us ON us.id = ins.user_id`,
    [facilityId, userId, content, !!locationVerified]
  );
  return toUpdate(rows[0]);
}

export async function createQuestion({ facilityId, userId, content }) {
  const { rows } = await pool.query(
    `WITH ins AS (
       INSERT INTO questions (facility_id, user_id, body)
       VALUES ($1, $2, $3)
       RETURNING *
     )
     SELECT ins.*, 0 AS reply_count, us.id AS author_id, us.name AS author_name
       FROM ins JOIN users us ON us.id = ins.user_id`,
    [facilityId, userId, content]
  );
  return toQuestion(rows[0]);
}

export async function findQuestion(questionId) {
  const { rows } = await pool.query(
    `SELECT q.id, q.facility_id, q.body, q.created_at, q.user_id,
            us.id AS author_id, us.name AS author_name,
            (SELECT COUNT(*) FROM replies r WHERE r.question_id = q.id) AS reply_count
       FROM questions q
       JOIN users us ON us.id = q.user_id
      WHERE q.id = $1`,
    [questionId]
  );
  return rows[0] ? { ...toQuestion(rows[0]), userId: String(rows[0].user_id) } : null;
}

// ---------------------------------------------------------------------------
// Replies
// ---------------------------------------------------------------------------

export async function listReplies(questionId) {
  const { rows } = await pool.query(
    `SELECT r.id, r.question_id, r.body, r.created_at,
            us.id AS author_id, us.name AS author_name
       FROM replies r
       JOIN users us ON us.id = r.user_id
      WHERE r.question_id = $1
      ORDER BY r.id`,
    [questionId]
  );
  return rows.map(toReply);
}

export async function createReply({ questionId, userId, content }) {
  const { rows } = await pool.query(
    `WITH ins AS (
       INSERT INTO replies (question_id, user_id, body)
       VALUES ($1, $2, $3)
       RETURNING *
     )
     SELECT ins.*, us.id AS author_id, us.name AS author_name,
            (SELECT COUNT(*) FROM replies x WHERE x.question_id = ins.question_id) + 1 AS reply_count
       FROM ins JOIN users us ON us.id = ins.user_id`,
    [questionId, userId, content]
  );
  return { reply: toReply(rows[0]), replyCount: Number(rows[0].reply_count) };
}

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------

export async function findMembership(facilityId, userId) {
  if (!userId) return null;
  const { rows } = await pool.query(
    `SELECT joined_at, notifications_enabled
       FROM forum_members WHERE facility_id = $1 AND user_id = $2`,
    [facilityId, userId]
  );
  return rows[0]
    ? { joinedAt: rows[0].joined_at, notificationsEnabled: rows[0].notifications_enabled }
    : null;
}

export async function joinForum(facilityId, userId, notificationsEnabled) {
  const { rows } = await pool.query(
    `INSERT INTO forum_members (facility_id, user_id, notifications_enabled)
     VALUES ($1, $2, COALESCE($3, true))
     ON CONFLICT (facility_id, user_id) DO UPDATE
       SET notifications_enabled = COALESCE($3, forum_members.notifications_enabled)
     RETURNING joined_at, notifications_enabled`,
    [facilityId, userId, notificationsEnabled ?? null]
  );
  return { joinedAt: rows[0].joined_at, notificationsEnabled: rows[0].notifications_enabled };
}

export async function leaveForum(facilityId, userId) {
  await pool.query('DELETE FROM forum_members WHERE facility_id = $1 AND user_id = $2', [
    facilityId,
    userId,
  ]);
}

// ---------------------------------------------------------------------------
// Summaries
// ---------------------------------------------------------------------------

export async function latestSummary(facilityId) {
  const { rows } = await pool.query(
    `SELECT * FROM forum_summaries
      WHERE facility_id = $1
      ORDER BY created_at DESC
      LIMIT 1`,
    [facilityId]
  );
  return toSummary(rows[0]);
}
