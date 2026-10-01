import { Router } from 'express';
import {
  getNotificationPreferences,
  putNotificationPreferences,
  postSubscribe,
  deleteSubscribe,
} from '../controllers/forum.controller.js';
import requireAuth from '../middleware/requireAuth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.use(requireAuth);
router.get('/preferences', asyncHandler(getNotificationPreferences));
router.put('/preferences', asyncHandler(putNotificationPreferences));
router.post('/subscribe', asyncHandler(postSubscribe));
router.delete('/subscribe', asyncHandler(deleteSubscribe));

export default router;
