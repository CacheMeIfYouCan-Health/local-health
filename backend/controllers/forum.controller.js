import {
  FORUM_CONFIG,
  findOrCreateForumForLocation,
  findForumById,
  listMessages,
  createMessage,
  findQuestion,
  softDeleteMessage,
  listReplies,
  createReply,
  findMembership,
  joinForum,
  leaveForum,
  latestSummary,
  isWithinFacility,
} from '../services/forum.service.js';
import {
  AI_SUMMARY_INTERVALS,
  getPreferences,
  savePreferences,
  saveSubscription,
  removeSubscription,
  vapidPublicKey,
  notifyQuestionReply,
} from '../services/notification.service.js';
import { emitToForum } from '../lib/realtime.js';
import { badRequest, notFound } from '../utils/httpError.js';

function readContent(body) {
  const content = String(body?.content ?? '').trim();
  if (!content) throw badRequest('Message cannot be empty');
  if (content.length > FORUM_CONFIG.maxLength) {
    throw badRequest(`Keep messages under ${FORUM_CONFIG.maxLength} characters`);
  }
  return content;
}

async function loadForum(forumId) {
  const forum = await findForumById(forumId);
  if (!forum) throw notFound('Forum not found');
  return forum;
}

function publicForum(forum, membership) {
  return {
    id: forum.id,
    location: forum.location,
    isMember: Boolean(membership),
    notificationsEnabled: membership?.notificationsEnabled ?? false,
    verifyRadiusMeters: FORUM_CONFIG.verifyRadiusMeters,
  };
}

/** GET /api/forums/location/:locationId — map pin → forum + recent activity */
export async function getForumForLocation(req, res) {
  const forum = await findOrCreateForumForLocation(req.validated.id);
  if (!forum) throw notFound('Location not found');

  const [membership, updates, questions, summary] = await Promise.all([
    findMembership(forum.id, req.userId),
    listMessages(forum.id, 'updates'),
    listMessages(forum.id, 'questions'),
    latestSummary(forum.id, 'updates'),
  ]);

  res.json({
    forum: publicForum(forum, membership),
    updates,
    questions,
    summary,
  });
}

/** GET /api/forums/:forumId */
export async function getForum(req, res) {
  const forum = await loadForum(req.params.forumId);
  const membership = await findMembership(forum.id, req.userId);
  res.json({ forum: publicForum(forum, membership) });
}

/** GET /api/forums/:forumId/messages?channel=updates|questions&before=<id> */
export async function getMessages(req, res) {
  const channel = req.query.channel === 'questions' ? 'questions' : 'updates';
  const before = req.query.before && /^\d+$/.test(req.query.before) ? req.query.before : null;
  const forum = await loadForum(req.params.forumId);
  res.json({ messages: await listMessages(forum.id, channel, { before }) });
}

/** GET /api/forums/:forumId/questions */
export async function getQuestions(req, res) {
  const forum = await loadForum(req.params.forumId);
  res.json({ questions: await listMessages(forum.id, 'questions') });
}

// Posting automatically follows the forum, so replies and summaries reach
// the people taking part. They can still leave from the menu.
async function autoJoin(forumId, userId) {
  if (!(await findMembership(forumId, userId))) await joinForum(forumId, userId);
}

/** POST /api/forums/:forumId/messages — an Update; location verified here */
export async function postUpdate(req, res) {
  const content = readContent(req.body);
  const forum = await loadForum(req.params.forumId);

  // The client sends its coordinates once; only the yes/no result is stored.
  const locationVerified = isWithinFacility(forum, req.body.latitude, req.body.longitude);

  const message = await createMessage({
    forumId: forum.id,
    userId: req.userId,
    channel: 'updates',
    content,
    locationVerified,
  });
  await autoJoin(forum.id, req.userId);

  emitToForum(forum.id, 'message:new', message);
  res.status(201).json({ message });
}

/** POST /api/forums/:forumId/questions — no location verification */
export async function postQuestion(req, res) {
  const content = readContent(req.body);
  const forum = await loadForum(req.params.forumId);

  const message = await createMessage({
    forumId: forum.id,
    userId: req.userId,
    channel: 'questions',
    content,
    locationVerified: false,
  });
  await autoJoin(forum.id, req.userId);

  emitToForum(forum.id, 'message:new', message);
  res.status(201).json({ message });
}

/** DELETE /api/forums/:forumId/messages/:messageId — author soft-deletes */
export async function deleteMessage(req, res) {
  const deleted = await softDeleteMessage(req.params.messageId, req.userId);
  if (!deleted || String(deleted.forum_id) !== req.params.forumId) {
    throw notFound('Message not found');
  }
  emitToForum(deleted.forum_id, 'message:deleted', {
    id: String(deleted.id),
    channel: deleted.channel,
  });
  res.json({ ok: true });
}

/** GET /api/questions/:questionId/replies */
export async function getReplies(req, res) {
  const question = await findQuestion(req.params.questionId);
  if (!question) throw notFound('Question not found');
  const { userId: _omit, ...publicQuestion } = question;
  res.json({ question: publicQuestion, replies: await listReplies(question.id) });
}

/** POST /api/questions/:questionId/replies */
export async function postReply(req, res) {
  const content = readContent(req.body);
  const question = await findQuestion(req.params.questionId);
  if (!question) throw notFound('Question not found');

  const { reply, replyCount } = await createReply({
    questionId: question.id,
    userId: req.userId,
    content,
  });
  await autoJoin(question.forumId, req.userId);

  emitToForum(question.forumId, 'reply:new', { questionId: question.id, reply, replyCount });
  res.status(201).json({ reply, replyCount });

  // After responding: a slow push service must not delay the reply.
  findForumById(question.forumId)
    .then((forum) => notifyQuestionReply({ question, reply, forum }))
    .catch((err) => console.warn('[push] reply notification failed:', err.message));
}

/** POST /api/forums/:forumId/join */
export async function postJoin(req, res) {
  const forum = await loadForum(req.params.forumId);
  const enabled =
    typeof req.body?.notificationsEnabled === 'boolean' ? req.body.notificationsEnabled : null;
  const membership = await joinForum(forum.id, req.userId, enabled);
  res.json({ forum: publicForum(forum, membership) });
}

/** POST /api/forums/:forumId/leave — stop following; the forum stays */
export async function postLeave(req, res) {
  const forum = await loadForum(req.params.forumId);
  await leaveForum(forum.id, req.userId);
  res.json({ forum: publicForum(forum, null) });
}

/** GET /api/forums/:forumId/summary?channel=updates */
export async function getSummary(req, res) {
  const channel = req.query.channel === 'questions' ? 'questions' : 'updates';
  const forum = await loadForum(req.params.forumId);
  res.json({ summary: await latestSummary(forum.id, channel) });
}

/** GET /api/notifications/preferences */
export async function getNotificationPreferences(req, res) {
  res.json({
    preferences: await getPreferences(req.userId),
    intervals: AI_SUMMARY_INTERVALS,
    vapidPublicKey: vapidPublicKey(),
  });
}

/** PUT /api/notifications/preferences */
export async function putNotificationPreferences(req, res) {
  const b = req.body ?? {};
  const patch = {};
  for (const key of ['aiSummaryEnabled', 'questionReplyEnabled', 'importantUpdateEnabled']) {
    if (b[key] !== undefined) {
      if (typeof b[key] !== 'boolean') throw badRequest(`${key} must be true or false`);
      patch[key] = b[key];
    }
  }
  if (b.aiSummaryInterval !== undefined) {
    const n = Number(b.aiSummaryInterval);
    if (!AI_SUMMARY_INTERVALS.includes(n)) {
      throw badRequest(`aiSummaryInterval must be one of ${AI_SUMMARY_INTERVALS.join(', ')}`);
    }
    patch.aiSummaryInterval = n;
  }
  res.json({ preferences: await savePreferences(req.userId, patch) });
}

/** POST /api/notifications/subscribe — store this browser's push subscription */
export async function postSubscribe(req, res) {
  const sub = req.body?.subscription;
  if (!sub?.endpoint || !/^https:\/\//.test(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) {
    throw badRequest('Invalid push subscription');
  }
  await saveSubscription(req.userId, {
    endpoint: sub.endpoint,
    expirationTime: sub.expirationTime ?? null,
    keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  });
  res.status(201).json({ ok: true });
}

/** DELETE /api/notifications/subscribe */
export async function deleteSubscribe(req, res) {
  if (!req.body?.endpoint) throw badRequest('endpoint is required');
  await removeSubscription(req.userId, req.body.endpoint);
  res.json({ ok: true });
}
