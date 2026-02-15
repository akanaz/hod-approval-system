// backend/src/routes/request.routes.ts
// ✅ UPDATED: Added edit and cancel routes

import express from 'express';
import {
  createRequest,
  editRequest,      // ✅ NEW
  cancelRequest,    // ✅ NEW
  getRequests,
  getRequestById,
  approveRequest,
  rejectRequest,
  requestMoreInfo,
  addComment,
} from '../controllers/request.controller';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';

const router = express.Router();

/* ============================
   FACULTY ROUTES
============================ */

// Create new early departure request
router.post(
  '/',
  authenticate,
  authorizeRoles('FACULTY', 'HOD'), // ✅ HOD can also create requests (for Dean approval)
  createRequest
);

// ✅ NEW: Edit pending request
router.patch(
  '/:id/edit',
  authenticate,
  authorizeRoles('FACULTY', 'HOD'),
  editRequest
);

// ✅ NEW: Cancel pending request
router.post(
  '/:id/cancel',
  authenticate,
  authorizeRoles('FACULTY', 'HOD'),
  cancelRequest
);

// Get all requests (faculty: own requests, HOD: department requests)
router.get(
  '/',
  authenticate,
  getRequests
);

// Get single request by ID
router.get(
  '/:id',
  authenticate,
  getRequestById
);

// Add comment to request
router.post(
  '/:id/comments',
  authenticate,
  addComment
);

/* ============================
   HOD/DEAN ROUTES - Support both POST and PATCH
============================ */

// Approve request (POST and PATCH)
router.post(
  '/:id/approve',
  authenticate,
  authorizeRoles('HOD', 'DEAN', 'FACULTY'), // ✅ FACULTY can approve if delegated
  approveRequest
);

router.patch(
  '/:id/approve',
  authenticate,
  authorizeRoles('HOD', 'DEAN', 'FACULTY'),
  approveRequest
);

// Reject request (POST and PATCH)
router.post(
  '/:id/reject',
  authenticate,
  authorizeRoles('HOD', 'DEAN', 'FACULTY'),
  rejectRequest
);

router.patch(
  '/:id/reject',
  authenticate,
  authorizeRoles('HOD', 'DEAN', 'FACULTY'),
  rejectRequest
);

// Request more info from faculty (POST and PATCH)
router.post(
  '/:id/request-more-info',
  authenticate,
  authorizeRoles('HOD', 'DEAN', 'ADMIN', 'FACULTY'),
  requestMoreInfo
);

router.patch(
  '/:id/request-more-info',
  authenticate,
  authorizeRoles('HOD', 'DEAN', 'ADMIN', 'FACULTY'),
  requestMoreInfo
);

export default router;
