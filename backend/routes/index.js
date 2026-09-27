import { Router } from 'express';
import facilitiesRoutes from './facilities.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/facilities', facilitiesRoutes);

export default router;