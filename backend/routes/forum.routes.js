import { Router } from 'express';
import {
  getForumForLocation,
  getForum,
  getMessages,
  getQuestions,
  postUpdate,
  postQuestion,
  deleteMessage,
  postJoin,
  postLeave,
  getSummary,
} from '../controllers/forum.controller.js';
import requireAuth, { optionalAuth } from '../middleware/requireAuth.js';
import { validateIdParam } from '../middleware/validateQuery.js';
import { validateNumericParams, rateLimitPosts } from '../middleware/forumValidation.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();
const forumId = validateNumericParams('forumId');

// Reading is public; posting and following need an account.
// :id is the facility id the map already uses (osm-node-…, fallback-…).
router.get('/location/:id', validateIdParam, optionalAuth, asyncHandler(getForumForLocation));
router.get('/:forumId', forumId, optionalAuth, asyncHandler(getForum));
router.get('/:forumId/messages', forumId, asyncHandler(getMessages));
router.post('/:forumId/messages', forumId, requireAuth, rateLimitPosts, asyncHandler(postUpdate));
router.delete(
  '/:forumId/messages/:messageId',
  validateNumericParams('forumId', 'messageId'),
  requireAuth,
  asyncHandler(deleteMessage)
);
router.get('/:forumId/questions', forumId, asyncHandler(getQuestions));
router.post('/:forumId/questions', forumId, requireAuth, rateLimitPosts, asyncHandler(postQuestion));
router.post('/:forumId/join', forumId, requireAuth, asyncHandler(postJoin));
router.post('/:forumId/leave', forumId, requireAuth, asyncHandler(postLeave));
router.get('/:forumId/summary', forumId, asyncHandler(getSummary));

export default router;
