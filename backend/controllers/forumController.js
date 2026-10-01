import pool from '../lib/db.js';
import { emitToFacility } from '../lib/socket.js';

const clean = (b) => (typeof b === 'string' ? b.trim() : '');
const bad = (res) => res.status(400).json({ message: 'Message must be 1-500 characters' });
const valid = (s) => s.length >= 1 && s.length <= 500;

// ---------- Updates ----------
export async function getUpdates(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM (
         SELECT up.id, up.facility_id, up.body, up.created_at, up.user_id, u.name
         FROM updates up JOIN users u ON u.id = up.user_id
         WHERE up.facility_id = $1
         ORDER BY up.created_at DESC LIMIT 100
       ) t ORDER BY created_at ASC`,
      [req.params.facilityId]
    );
    res.json(rows);
  } catch (e) { next(e); }
}

export async function postUpdate(req, res, next) {
  try {
    const body = clean(req.body.body);
    if (!valid(body)) return bad(res);
    const { facilityId } = req.params;
    const { rows } = await pool.query(
      `WITH ins AS (
         INSERT INTO updates (facility_id, user_id, body) VALUES ($1, $2, $3) RETURNING *
       )
       SELECT ins.id, ins.facility_id, ins.body, ins.created_at, ins.user_id, u.name
       FROM ins JOIN users u ON u.id = ins.user_id`,
      [facilityId, req.userId, body]
    );
    emitToFacility(facilityId, 'update:new', rows[0]);
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
}

// ---------- Questions ----------
export async function getQuestions(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT q.id, q.facility_id, q.body, q.created_at, q.user_id, u.name,
              (SELECT COUNT(*)::int FROM replies r WHERE r.question_id = q.id) AS reply_count
       FROM questions q JOIN users u ON u.id = q.user_id
       WHERE q.facility_id = $1
       ORDER BY q.created_at DESC LIMIT 100`,
      [req.params.facilityId]
    );
    res.json(rows);
  } catch (e) { next(e); }
}

export async function postQuestion(req, res, next) {
  try {
    const body = clean(req.body.body);
    if (!valid(body)) return bad(res);
    const { facilityId } = req.params;
    const { rows } = await pool.query(
      `WITH ins AS (
         INSERT INTO questions (facility_id, user_id, body) VALUES ($1, $2, $3) RETURNING *
       )
       SELECT ins.id, ins.facility_id, ins.body, ins.created_at, ins.user_id, u.name,
              0 AS reply_count
       FROM ins JOIN users u ON u.id = ins.user_id`,
      [facilityId, req.userId, body]
    );
    emitToFacility(facilityId, 'question:new', rows[0]);
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
}

// ---------- Replies ----------
export async function getReplies(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT r.id, r.question_id, r.body, r.created_at, r.user_id, u.name
       FROM replies r JOIN users u ON u.id = r.user_id
       WHERE r.question_id = $1
       ORDER BY r.created_at ASC`,
      [req.params.questionId]
    );
    res.json(rows);
  } catch (e) { next(e); }
}

export async function postReply(req, res, next) {
  try {
    const body = clean(req.body.body);
    if (!valid(body)) return bad(res);
    const { questionId } = req.params;

    const q = await pool.query('SELECT facility_id FROM questions WHERE id = $1', [questionId]);
    if (!q.rows[0]) return res.status(404).json({ message: 'Question not found' });

    const { rows } = await pool.query(
      `WITH ins AS (
         INSERT INTO replies (question_id, user_id, body) VALUES ($1, $2, $3) RETURNING *
       )
       SELECT ins.id, ins.question_id, ins.body, ins.created_at, ins.user_id, u.name
       FROM ins JOIN users u ON u.id = ins.user_id`,
      [questionId, req.userId, body]
    );
    const count = await pool.query(
      'SELECT COUNT(*)::int AS n FROM replies WHERE question_id = $1',
      [questionId]
    );
    const payload = { questionId: rows[0].question_id, reply: rows[0], replyCount: count.rows[0].n };
    emitToFacility(q.rows[0].facility_id, 'reply:new', payload);
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
}