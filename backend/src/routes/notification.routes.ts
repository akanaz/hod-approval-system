import express from 'express';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();
router.use(authenticate);

router.get('/', (_req, res) => {
  res.json({ notifications: [] });
});

export default router;
