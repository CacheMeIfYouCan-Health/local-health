import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import * as c from '../controllers/forumController.js';

const router = Router();
router.use(requireAuth);

router.get('/:facilityId/updates', c.getUpdates);
router.post('/:facilityId/updates', c.postUpdate);
router.get('/:facilityId/questions', c.getQuestions);
router.post('/:facilityId/questions', c.postQuestion);
router.get('/questions/:questionId/replies', c.getReplies);
router.post('/questions/:questionId/replies', c.postReply);

export default router;