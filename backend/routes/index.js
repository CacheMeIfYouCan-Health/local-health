import { Router } from 'express';
import facilitiesRoutes from './facilities.routes.js';
import authRoutes from './authRoutes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/facilities', facilitiesRoutes);
router.use('/auth', authRoutes);

export default router;