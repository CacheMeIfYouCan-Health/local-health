import Anthropic from '@anthropic-ai/sdk';
import pool from '../lib/db.js';
import { emitToForum } from '../lib/realtime.js';
import { toSummary } from './forum.service.js';
import { notifyImportantUpdate } from './notification.service.js';

export const SUMMARY_CONFIG = {
  model: process.env.FORUM_SUMMARY_MODEL ?? 'claude-opus-5-5',
  // "Summary of the past N messages": the most recent N updates are sent.
  windowSize: Number(process.env.FORUM_SUMMARY_WINDOW) || 70,
  // Ignore updates older than this; stale conditions shouldn't be summarised.
  maxAgeHours: Number(process.env.FORUM_SUMMARY_MAX_AGE_HOURS) || 24,
  // Regenerate once this many new updates arrived since the last summary…
  minNewMessages: Number(process.env.FORUM_SUMMARY_MIN_NEW) || 5,
  // …or when there is any new update and the last summary is this old.
  refreshAfterMinutes: Number(process.env.FORUM_SUMMARY_REFRESH_MINUTES) || 120,
  // A forum's first summary needs at least this many updates.
  minForFirstSummary: Number(process.env.FORUM_SUMMARY_MIN_FIRST) || 3,
};

const SYSTEM_PROMPT = `You summarise community updates posted in a forum for one South African healthcare facility (a clinic, hospital or pharmacy). People read your summary on their phone to decide whether and when to go.

Write 2-4 short sentences in plain, simple English. Lead with what matters most right now: queue length and waiting times, closures or opening-hour changes, services or medicines that are unavailable, and anything reported by several people. Say how recent things are (for example "this morning" or "in the last hour") using the timestamps, and prefer newer reports when they conflict with older ones. Mention when something was reported by only one person.

Only summarise what users actually reported. Do not add facts, guesses, medical advice or diagnoses. Do not name or quote individual users.

Set "important" to true only when the updates report a significant change that someone planning a visit must know about, such as the facility being closed, a service being suspended, medicine being out of stock, or an unusually long queue reported by more than one person. Otherwise set it to false.`;

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    important: { type: 'boolean' },
  },
  required: ['summary', 'important'],
  additionalProperties: false,
};

let client = null;
let disabledReason = null;

function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

/** Facilities whose Updates have enough new activity for a new summary. */
async function findForumsNeedingSummary() {
  const c = SUMMARY_CONFIG;
  const { rows } = await pool.query(
    `WITH last AS (
       SELECT DISTINCT ON (facility_id) facility_id, last_update_id, created_at
         FROM forum_summaries
        ORDER BY facility_id, created_at DESC
     )
     SELECT u.facility_id,
            COUNT(*) AS new_count,
            last.created_at AS last_summary_at
       FROM updates u
       LEFT JOIN last ON last.facility_id = u.facility_id
      WHERE u.created_at > now() - make_interval(hours => $1)
        AND u.id > COALESCE(last.last_update_id, 0)
      GROUP BY u.facility_id, last.created_at
     HAVING (last.created_at IS NULL AND COUNT(*) >= $2)
         OR COUNT(*) >= $3
         OR last.created_at < now() - make_interval(mins => $4)`,
    [c.maxAgeHours, c.minForFirstSummary, c.minNewMessages, c.refreshAfterMinutes]
  );
  return rows.map((r) => r.facility_id);
}

async function recentUpdates(forumId) {
  const { rows } = await pool.query(
    `SELECT id, body AS content, location_verified, created_at
       FROM updates
      WHERE facility_id = $1
        AND created_at > now() - make_interval(hours => $2)
      ORDER BY id DESC
      LIMIT $3`,
    [forumId, SUMMARY_CONFIG.maxAgeHours, SUMMARY_CONFIG.windowSize]
  );
  return rows.reverse();
}

function formatForPrompt(messages) {
  const now = new Date();
  const lines = messages.map((m) => {
    const mins = Math.max(0, Math.round((now - new Date(m.created_at)) / 60000));
    const age = mins < 60 ? `${mins} min ago` : `${Math.round(mins / 60)} h ago`;
    const where = m.location_verified ? 'at the facility' : 'location not verified';
    // Collapse newlines so one message can't pose as several.
    return `- [${age}, ${where}] ${m.content.replace(/\s+/g, ' ').trim()}`;
  });
  return `Current time: ${now.toISOString()}\n\n<updates count="${messages.length}">\n${lines.join('\n')}\n</updates>`;
}

async function generateSummary(messages) {
  const response = await getClient().beta.messages.create({
    model: SUMMARY_CONFIG.model,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: formatForPrompt(messages) }],
    // Summarising short posts is a light task; low effort keeps it quick.
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: OUTPUT_SCHEMA },
    },
    // Re-run on Anthropic's recommended model if a safety classifier declines.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
  });

  if (response.stop_reason === 'refusal') {
    console.warn('[summary] declined:', response.stop_details?.category ?? 'unknown');
    return null;
  }
  if (response.stop_reason === 'max_tokens') {
    console.warn('[summary] hit max_tokens; skipping');
    return null;
  }
  const text = response.content.find((b) => b.type === 'text')?.text;
  if (!text) return null;
  const parsed = JSON.parse(text);
  const summary = String(parsed.summary ?? '').trim();
  return summary ? { summary, important: Boolean(parsed.important) } : null;
}

export async function summariseForum(forumId) {
  const messages = await recentUpdates(forumId);
  if (messages.length === 0) return null;

  const result = await generateSummary(messages);
  if (!result) return null;

  const { rows } = await pool.query(
    `INSERT INTO forum_summaries
       (facility_id, summary, message_count, last_update_id, important)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [forumId, result.summary, messages.length, messages.at(-1).id, result.important]
  );
  const stored = toSummary(rows[0]);

  // Persisted first, then delivered.
  emitToForum(forumId, 'summary:new', stored);
  if (stored.important) {
    await notifyImportantUpdate({ forumId, summary: stored.summary }).catch((err) =>
      console.warn('[summary] important-update push failed:', err.message)
    );
  }
  return stored;
}

/** One batch run: summarise every forum with enough new activity. */
export async function runSummaryJob() {
  if (disabledReason) return 0;
  const forumIds = await findForumsNeedingSummary();
  if (forumIds.length === 0) return 0;
  try {
    getClient();
  } catch (err) {
    // The SDK constructor throws when it finds no credentials at all.
    disabledReason = err.message;
    console.warn('[summary] Anthropic client unavailable; AI summaries disabled:', err.message);
    return 0;
  }
  let done = 0;
  for (const forumId of forumIds) {
    try {
      if (await summariseForum(forumId)) done += 1;
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
        disabledReason = err.message;
        console.warn('[summary] no usable Anthropic credentials; AI summaries disabled:', err.message);
        return done;
      }
      if (err instanceof Anthropic.RateLimitError) {
        console.warn('[summary] rate limited; will retry next run');
        return done;
      }
      if (err instanceof Anthropic.APIError) {
        console.warn(`[summary] API error ${err.status} for forum ${forumId}:`, err.message);
      } else if (err instanceof Anthropic.AnthropicError) {
        // Client-side config problem (e.g. no credentials found) — it will
        // fail the same way for every forum, so stop until restart.
        disabledReason = err.message;
        console.warn('[summary] Anthropic client misconfigured; AI summaries disabled:', err.message);
        return done;
      } else {
        console.warn(`[summary] failed for forum ${forumId}:`, err.message);
      }
    }
  }
  return done;
}
