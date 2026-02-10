// backend/src/routes/dashboard.routes.ts

import express from 'express';
import {
  getHODDashboard,
  getFacultyDashboard,
  getDepartmentStats
} from '../controllers/dashboard.controller';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';

const router = express.Router();

/* =====================
   AUTH MIDDLEWARE
===================== */
router.use(authenticate);

/* =====================
   DASHBOARD ROUTES
===================== */

// ✅ HOD dashboard
router.get('/hod', authorizeRoles('HOD', 'ADMIN'), getHODDashboard);

// ✅ Faculty dashboard
router.get('/faculty', authorizeRoles('FACULTY'), getFacultyDashboard);

// ✅ Department statistics
router.get(
  '/department-stats',
  authorizeRoles('HOD', 'ADMIN'),
  getDepartmentStats
);

export default router;
