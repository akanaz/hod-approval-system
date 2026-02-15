// backend/src/routes/dean.routes.ts
// ✅ NEW: Dean routes for managing HOD requests

import express from 'express';
import {
  getDeanDashboard,
  getHODRequests,
  getAllHODs
} from '../controllers/dean.controller';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';

const router = express.Router();

/* =====================
   ALL ROUTES REQUIRE DEAN ROLE
===================== */
router.use(authenticate);
router.use(authorizeRoles('DEAN'));

/* =====================
   DEAN DASHBOARD & MANAGEMENT
===================== */

// Dean dashboard with HOD request statistics
router.get('/dashboard', getDeanDashboard);

// Get all HOD leave requests
router.get('/hod-requests', getHODRequests);

// Get list of all HODs with statistics
router.get('/hods', getAllHODs);

export default router;
