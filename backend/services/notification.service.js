import webpush from 'web-push';
import pool from '../lib/db.js';

// Browser push needs a VAPID key pair (generate with `npm run vapid`).
// Without one the forum still works; push is simply switched off.
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? null;
const pushEnabled = Boolean(VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

if (pushEnabled) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:admin@localhealth.invalid',
    VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.log('[push] VAPID keys not set; browser notifications disabled');
}

// Important-update pushes go out at most this often per user.
const IMPORTANT_COOLDOWN_MIN = Number(process.env.IMPORTANT_NOTIFY_COOLDOWN_MIN) || 60;

export const AI_SUMMARY_INTERVALS = [60, 90, 120];

const DEFAULT_PREFS = {
  aiSummaryEnabled: false,
  aiSummaryInterval: 90,
  questionReplyEnabled: true,
  importantUpdateEnabled: true,
};

export const vapidPublicKey = () => (pushEnabled ? VAPID_PUBLIC_KEY : null);

// ---------------------------------------------------------------------------
// Preferences & subscriptions
// ---------------------------------------------------------------------------

export async function getPreferences(userId) {
  const { rows } = await pool.query(
    'SELECT * FROM notification_preferences WHERE user_id = $1',
    [userId]
  );
  const r = rows[0];
  if (!r) return { ...DEFAULT_PREFS };
  return {
    aiSummaryEnabled: r.ai_summary_enabled,
    aiSummaryInterval: r.ai_summary_interval,
    questionReplyEnabled: r.question_reply_enabled,
    importantUpdateEnabled: r.important_update_enabled,
  };
}

export async function savePreferences(userId, prefs) {
  const next = { ...(await getPreferences(userId)), ...prefs };
  await pool.query(
    `INSERT INTO notification_preferences
       (user_id, ai_summary_enabled, ai_summary_interval,
        question_reply_enabled, important_update_enabled, updated_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (user_id) DO UPDATE SET
       ai_summary_enabled = EXCLUDED.ai_summary_enabled,
       ai_summary_interval = EXCLUDED.ai_summary_interval,
       question_reply_enabled = EXCLUDED.question_reply_enabled,
       important_update_enabled = EXCLUDED.important_update_enabled,
       updated_at = now()`,
    [
      userId,
      next.aiSummaryEnabled,
      next.aiSummaryInterval,
      next.questionReplyEnabled,
      next.importantUpdateEnabled,
    ]
  );
  return next;
}

export async function saveSubscription(userId, subscription) {
  await pool.query(
    `INSERT INTO push_subscriptions (user_id, endpoint, subscription_data)
     VALUES ($1, $2, $3)
     ON CONFLICT (endpoint) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       subscription_data = EXCLUDED.subscription_data,
       updated_at = now()`,
    [userId, subscription.endpoint, subscription]
  );
}

export async function removeSubscription(userId, endpoint) {
  await pool.query('DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2', [
    userId,
    endpoint,
  ]);
}

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------

async function sendToUser(userId, payload) {
  if (!pushEnabled) return 0;
  const { rows } = await pool.query(
    'SELECT endpoint, subscription_data FROM push_subscriptions WHERE user_id = $1',
    [userId]
  );
  let sent = 0;
  for (const row of rows) {
    try {
      await webpush.sendNotification(row.subscription_data, JSON.stringify(payload), { TTL: 3600 });
      sent += 1;
    } catch (err) {
      // 404/410: the browser dropped the subscription; forget it.
      if (err.statusCode === 404 || err.statusCode === 410) {
        await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [row.endpoint]);
      } else {
        console.warn(`[push] send failed (${err.statusCode ?? err.message})`);
      }
    }
  }
  return sent;
}

const forumUrl = (externalId) => `/forum?facilityId=${encodeURIComponent(externalId)}`;
const clip = (text, n) => (text.length > n ? `${text.slice(0, n - 1)}…` : text);

/** Notify a question's author about a reply — never the whole forum. */
export async function notifyQuestionReply({ question, reply, forum }) {
  if (question.userId === reply.author.id) return;
  const prefs = await getPreferences(question.userId);
  if (!prefs.questionReplyEnabled) return;
  await sendToUser(question.userId, {
    title: `${reply.author.name} replied to your question`,
    body: clip(reply.content, 140),
    url: `${forumUrl(forum.location.id)}&tab=questions&question=${question.id}`,
    tag: `reply-${question.id}`,
  });
}

/**
 * A new summary was flagged as an important change. Members who follow the
 * forum with notifications on get one push, rate-limited per user.
 */
export async function notifyImportantUpdate({ forumId, summary }) {
  if (!pushEnabled) return;
  const { rows } = await pool.query(
    `SELECT fm.user_id, f.external_id, f.name
       FROM forum_members fm
       JOIN forums fo ON fo.id = fm.forum_id
       JOIN facilities f ON f.id = fo.location_id
       LEFT JOIN notification_preferences np ON np.user_id = fm.user_id
      WHERE fm.forum_id = $1
        AND fm.notifications_enabled
        AND COALESCE(np.important_update_enabled, true)
        AND (np.last_important_notified_at IS NULL
             OR np.last_important_notified_at < now() - make_interval(mins => $2))`,
    [forumId, IMPORTANT_COOLDOWN_MIN]
  );
  for (const r of rows) {
    const sent = await sendToUser(r.user_id, {
      title: `Important update · ${r.name}`,
      body: clip(summary, 160),
      url: forumUrl(r.external_id),
      tag: `important-${forumId}`,
    });
    if (sent) {
      await pool.query(
        `INSERT INTO notification_preferences (user_id, last_important_notified_at)
         VALUES ($1, now())
         ON CONFLICT (user_id) DO UPDATE SET last_important_notified_at = now()`,
        [r.user_id]
      );
    }
  }
}

/**
 * Digest-style AI summary notifications. For each user who opted in, send at
 * most one push per chosen interval, and only when a forum they follow has a
 * summary newer than the last one they were sent.
 */
export async function sendDueSummaryNotifications() {
  if (!pushEnabled) return 0;
  const { rows } = await pool.query(
    `SELECT np.user_id, np.last_ai_summary_notified_at
       FROM notification_preferences np
      WHERE np.ai_summary_enabled
        AND (np.last_ai_summary_notified_at IS NULL
             OR np.last_ai_summary_notified_at
                  <= now() - make_interval(mins => np.ai_summary_interval))
        AND EXISTS (SELECT 1 FROM push_subscriptions ps WHERE ps.user_id = np.user_id)`
  );

  let notified = 0;
  for (const user of rows) {
    const { rows: fresh } = await pool.query(
      `SELECT DISTINCT ON (fs.forum_id)
              fs.forum_id, fs.summary, fs.message_count, fs.created_at,
              f.external_id, f.name
         FROM forum_summaries fs
         JOIN forum_members fm ON fm.forum_id = fs.forum_id
         JOIN forums fo ON fo.id = fs.forum_id
         JOIN facilities f ON f.id = fo.location_id
        WHERE fm.user_id = $1
          AND fm.notifications_enabled
          AND fs.channel = 'updates'
          AND fs.created_at > COALESCE($2, fm.joined_at)
        ORDER BY fs.forum_id, fs.created_at DESC`,
      [user.user_id, user.last_ai_summary_notified_at]
    );
    if (fresh.length === 0) continue;

    fresh.sort((a, b) => b.created_at - a.created_at);
    const top = fresh[0];
    const title =
      fresh.length === 1
        ? `AI summary · ${top.name}`
        : `New summaries for ${fresh.length} places you follow`;
    const sent = await sendToUser(user.user_id, {
      title,
      body: clip(fresh.length === 1 ? top.summary : `${top.name}: ${top.summary}`, 160),
      url: forumUrl(top.external_id),
      tag: 'ai-summary',
    });
    if (sent) {
      notified += 1;
      await pool.query(
        'UPDATE notification_preferences SET last_ai_summary_notified_at = now() WHERE user_id = $1',
        [user.user_id]
      );
    }
  }
  return notified;
}
