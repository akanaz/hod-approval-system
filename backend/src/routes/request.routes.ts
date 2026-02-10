import express from 'express';
import {
  createRequest,
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
  authorizeRoles('FACULTY'),
  createRequest
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
   HOD ROUTES - Support both POST and PATCH
============================ */

// Approve request (POST and PATCH)
router.post(
  '/:id/approve',
  authenticate,
  authorizeRoles('HOD'),
  approveRequest
);

router.patch(
  '/:id/approve',
  authenticate,
  authorizeRoles('HOD'),
  approveRequest
);

// Reject request (POST and PATCH)
router.post(
  '/:id/reject',
  authenticate,
  authorizeRoles('HOD'),
  rejectRequest
);

router.patch(
  '/:id/reject',
  authenticate,
  authorizeRoles('HOD'),
  rejectRequest
);

// Request more info from faculty (POST and PATCH)
router.post(
  '/:id/request-more-info',
  authenticate,
  authorizeRoles('HOD', 'ADMIN'),
  requestMoreInfo
);

router.patch(
  '/:id/request-more-info',
  authenticate,
  authorizeRoles('HOD', 'ADMIN'),
  requestMoreInfo
);

export default router;
