import { Router } from 'express';
import facilitiesRoutes from './facilities.routes.js';
import authRoutes from './authRoutes.js';
import forumRoutes from './forum.routes.js';
import questionsRoutes from './questions.routes.js';
import notificationsRoutes from './notifications.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/facilities', facilitiesRoutes);
router.use('/auth', authRoutes);
router.use('/forums', forumRoutes);
router.use('/questions', questionsRoutes);
router.use('/notifications', notificationsRoutes);

export default router;