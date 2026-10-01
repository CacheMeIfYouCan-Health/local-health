import pool from '../lib/db.js';
import { findFacilityById, upsertFacility } from './facilities.service.js';

export const FORUM_CONFIG = {
  // How close (metres) a poster must be for an update to show "At facility".
  verifyRadiusMeters: Number(process.env.FORUM_VERIFY_RADIUS_METERS) || 500,
  pageSize: 50,
  maxLength: 1000,
};

const MESSAGE_COLUMNS = `
  m.id, m.forum_id, m.channel, m.content, m.location_verified, m.created_at,
  u.id AS author_id, u.name AS author_name`;

function toMessage(row) {
  return {
    id: String(row.id),
    forumId: String(row.forum_id),
    channel: row.channel,
    content: row.content,
    // Questions never carry a verification badge.
    locationVerified: row.channel === 'updates' ? row.location_verified : false,
    createdAt: row.created_at,
    author: { id: String(row.author_id), name: row.author_name },
    ...(row.channel === 'questions' ? { replyCount: Number(row.reply_count ?? 0) } : {}),
  };
}

function toReply(row) {
  return {
    id: String(row.id),
    questionId: String(row.message_id),
    content: row.content,
    createdAt: row.created_at,
    author: { id: String(row.author_id), name: row.author_name },
  };
}

function toSummary(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    channel: row.channel,
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

/**
 * Compares the poster's coordinates with the facility's. Only the boolean is
 * kept; the coordinates are discarded as soon as this returns.
 */
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

// ---------------------------------------------------------------------------
// Forums
// ---------------------------------------------------------------------------

/**
 * Finds (or provisions) the forum for a map location. `externalId` is the id
 * the map already uses (osm-node-…, fallback-…); the facility row is created
 * on demand so any pin on the map can have a forum.
 */
export async function findOrCreateForumForLocation(externalId) {
  const { rows: existing } = await pool.query(
    `SELECT fo.id FROM forums fo
       JOIN facilities f ON f.id = fo.location_id
      WHERE f.external_id = $1`,
    [externalId]
  );
  if (existing[0]) return findForumById(existing[0].id);

  const facility = await findFacilityById(externalId);
  if (!facility) return null;
  const locationId = await upsertFacility(facility);

  const { rows } = await pool.query(
    `INSERT INTO forums (location_id) VALUES ($1)
     ON CONFLICT (location_id) DO UPDATE SET location_id = EXCLUDED.location_id
     RETURNING id`,
    [locationId]
  );
  return findForumById(rows[0].id);
}

export async function findForumById(forumId) {
  const { rows } = await pool.query(
    `SELECT fo.id, fo.created_at, f.external_id, f.name, f.type,
            f.latitude, f.longitude
       FROM forums fo
       JOIN facilities f ON f.id = fo.location_id
      WHERE fo.id = $1`,
    [forumId]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: String(row.id),
    createdAt: row.created_at,
    location: {
      id: row.external_id,
      name: row.name,
      type: row.type,
    },
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
  };
}

// ---------------------------------------------------------------------------
// Messages (updates + questions)
// ---------------------------------------------------------------------------

export async function listMessages(forumId, channel, { before, limit = FORUM_CONFIG.pageSize } = {}) {
  const { rows } = await pool.query(
    `SELECT ${MESSAGE_COLUMNS},
            (SELECT COUNT(*) FROM replies r
              WHERE r.message_id = m.id AND r.deleted_at IS NULL) AS reply_count
       FROM messages m
       JOIN users u ON u.id = m.user_id
      WHERE m.forum_id = $1
        AND m.channel = $2
        AND m.deleted_at IS NULL
        AND ($3::bigint IS NULL OR m.id < $3)
      ORDER BY m.id DESC
      LIMIT $4`,
    [forumId, channel, before ?? null, limit]
  );
  // Oldest first, the way a conversation reads.
  return rows.reverse().map(toMessage);
}

export async function createMessage({ forumId, userId, channel, content, locationVerified }) {
  const { rows } = await pool.query(
    `WITH inserted AS (
       INSERT INTO messages (forum_id, user_id, channel, content, location_verified)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *
     )
     SELECT ${MESSAGE_COLUMNS}, 0 AS reply_count
       FROM inserted m
       JOIN users u ON u.id = m.user_id`,
    [forumId, userId, channel, content, channel === 'updates' && !!locationVerified]
  );
  return toMessage(rows[0]);
}

export async function findQuestion(questionId) {
  const { rows } = await pool.query(
    `SELECT ${MESSAGE_COLUMNS}, m.user_id,
            (SELECT COUNT(*) FROM replies r
              WHERE r.message_id = m.id AND r.deleted_at IS NULL) AS reply_count
       FROM messages m
       JOIN users u ON u.id = m.user_id
      WHERE m.id = $1 AND m.channel = 'questions' AND m.deleted_at IS NULL`,
    [questionId]
  );
  return rows[0] ? { ...toMessage(rows[0]), userId: String(rows[0].user_id) } : null;
}

/** Soft delete; only the author can remove their own message. */
export async function softDeleteMessage(messageId, userId) {
  const { rows } = await pool.query(
    `UPDATE messages SET deleted_at = now()
      WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
      RETURNING id, forum_id, channel`,
    [messageId, userId]
  );
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Replies
// ---------------------------------------------------------------------------

export async function listReplies(questionId) {
  const { rows } = await pool.query(
    `SELECT r.id, r.message_id, r.content, r.created_at,
            u.id AS author_id, u.name AS author_name
       FROM replies r
       JOIN users u ON u.id = r.user_id
      WHERE r.message_id = $1 AND r.deleted_at IS NULL
      ORDER BY r.id`,
    [questionId]
  );
  return rows.map(toReply);
}

export async function createReply({ questionId, userId, content }) {
  const { rows } = await pool.query(
    `WITH inserted AS (
       INSERT INTO replies (message_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING *
     )
     SELECT r.id, r.message_id, r.content, r.created_at,
            u.id AS author_id, u.name AS author_name,
            (SELECT COUNT(*) FROM replies x
              WHERE x.message_id = r.message_id AND x.deleted_at IS NULL) + 1 AS reply_count
       FROM inserted r
       JOIN users u ON u.id = r.user_id`,
    [questionId, userId, content]
  );
  return { reply: toReply(rows[0]), replyCount: Number(rows[0].reply_count) };
}

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------

export async function findMembership(forumId, userId) {
  if (!userId) return null;
  const { rows } = await pool.query(
    `SELECT joined_at, notifications_enabled
       FROM forum_members WHERE forum_id = $1 AND user_id = $2`,
    [forumId, userId]
  );
  return rows[0]
    ? { joinedAt: rows[0].joined_at, notificationsEnabled: rows[0].notifications_enabled }
    : null;
}

export async function joinForum(forumId, userId, notificationsEnabled) {
  const { rows } = await pool.query(
    `INSERT INTO forum_members (forum_id, user_id, notifications_enabled)
     VALUES ($1, $2, COALESCE($3, true))
     ON CONFLICT (forum_id, user_id) DO UPDATE
       SET notifications_enabled = COALESCE($3, forum_members.notifications_enabled)
     RETURNING joined_at, notifications_enabled`,
    [forumId, userId, notificationsEnabled ?? null]
  );
  return { joinedAt: rows[0].joined_at, notificationsEnabled: rows[0].notifications_enabled };
}

export async function leaveForum(forumId, userId) {
  await pool.query('DELETE FROM forum_members WHERE forum_id = $1 AND user_id = $2', [
    forumId,
    userId,
  ]);
}

// ---------------------------------------------------------------------------
// Summaries
// ---------------------------------------------------------------------------

export async function latestSummary(forumId, channel = 'updates') {
  const { rows } = await pool.query(
    `SELECT * FROM forum_summaries
      WHERE forum_id = $1 AND channel = $2
      ORDER BY created_at DESC
      LIMIT 1`,
    [forumId, channel]
  );
  return toSummary(rows[0]);
}

export { toSummary };
