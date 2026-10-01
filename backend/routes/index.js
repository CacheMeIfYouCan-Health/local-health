import { Router } from 'express';
import facilitiesRoutes from './facilities.routes.js';
import authRoutes from './authRoutes.js';
import forumRoutes from './forum.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});


router.use('/forum', forumRoutes);
router.use('/facilities', facilitiesRoutes);
router.use('/auth', authRoutes);

export default router;