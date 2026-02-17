// backend/src/routes/public.routes.ts
// Module 3: Public aggregate stats — no auth required

import { Router } from 'express';
import { getPublicStats } from '../controllers/public.controller';

const router = Router();

// Public aggregate stats (no authentication required)
router.get('/stats', getPublicStats);

export default router;
