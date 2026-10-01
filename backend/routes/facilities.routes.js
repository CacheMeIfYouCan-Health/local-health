import { Router } from 'express';
import {
  getNearbyFacilities,
  getFacility,
  postQueueReport,
  postCheckIn,
  postCheckOut,
} from '../controllers/facilities.controller.js';
import {
  validateNearbyQuery,
  validateIdParam,
  validateSessionParams,
} from '../middleware/validateQuery.js';
import { asyncHandler } from '../middleware/errorHandler.js';


const router = Router();

// IMPORTANT: /nearby must be declared before /:id so it is not swallowed by the param route.
router.get('/nearby', validateNearbyQuery, asyncHandler(getNearbyFacilities));
router.get('/:id', validateIdParam, asyncHandler(getFacility));
router.post('/:id/queue-reports', validateIdParam, asyncHandler(postQueueReport));
router.post('/:id/queue-sessions', validateIdParam, asyncHandler(postCheckIn));
router.post(
  '/:id/queue-sessions/:sessionId/checkout',
  validateSessionParams,
  asyncHandler(postCheckOut)
);

export default router;