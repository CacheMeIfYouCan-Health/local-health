import { Router } from 'express';
import { getReplies, postReply } from '../controllers/forum.controller.js';
import requireAuth from '../middleware/requireAuth.js';
import { validateNumericParams, rateLimitPosts } from '../middleware/forumValidation.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();
const questionId = validateNumericParams('questionId');

router.get('/:questionId/replies', questionId, asyncHandler(getReplies));
router.post('/:questionId/replies', questionId, requireAuth, rateLimitPosts, asyncHandler(postReply));

export default router;
