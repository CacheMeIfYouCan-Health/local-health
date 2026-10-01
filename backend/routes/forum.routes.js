import { Router } from 'express';
import {
  getForumForLocation,
  postUpdate,
  postQuestion,
  postJoin,
  postLeave,
} from '../controllers/forum.controller.js';
import requireAuth, { optionalAuth } from '../middleware/requireAuth.js';
import { validateIdParam } from '../middleware/validateQuery.js';
import { rateLimitPosts } from '../middleware/forumValidation.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// :id is the facility id the map already uses (osm-node-…, fallback-…);
// that facility's forum is identified by the same id.
// Reading is public; posting and following need an account.
router.get('/location/:id', validateIdParam, optionalAuth, asyncHandler(getForumForLocation));
router.post('/:id/messages', validateIdParam, requireAuth, rateLimitPosts, asyncHandler(postUpdate));
router.post('/:id/questions', validateIdParam, requireAuth, rateLimitPosts, asyncHandler(postQuestion));
router.post('/:id/join', validateIdParam, requireAuth, asyncHandler(postJoin));
router.post('/:id/leave', validateIdParam, requireAuth, asyncHandler(postLeave));

export default router;
