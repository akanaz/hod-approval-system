// backend/src/routes/security.routes.ts
// Module 4: Gate Security Integration routes

import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';
import {
  verifyExitPass,
  logExit,
  getTodayApproved,
} from '../controllers/security.controller';

const router = Router();

// Verify an exit pass (QR code scan or manual entry)
router.get(
  '/verify/:exitPassNumber',
  authenticate,
  authorizeRoles('SECURITY', 'ADMIN'),
  verifyExitPass
);

// Log actual exit time
router.post(
  '/log-exit/:requestId',
  authenticate,
  authorizeRoles('SECURITY', 'ADMIN'),
  logExit
);

// Get all approved departures for today
router.get(
  '/today-approved',
  authenticate,
  authorizeRoles('SECURITY', 'ADMIN'),
  getTodayApproved
);

export default router;
