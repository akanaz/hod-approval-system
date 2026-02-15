// backend/src/routes/delegation.routes.ts
// ✅ FIXED: Corrected route paths to match frontend

import express from 'express';
import {
  delegateRights,
  revokeDelegation,
  getMyDelegations,
  getEligibleFaculty,
  extendDelegation
} from '../controllers/delegation.controller';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles('HOD'));

// ✅ FIXED: Changed from /eligible-faculty to /department-faculty
router.get('/department-faculty', getEligibleFaculty);

// ✅ FIXED: Changed from /my-delegations to /delegations
router.get('/delegations', getMyDelegations);

// Delegate rights
router.post('/delegate', delegateRights);

// ✅ FIXED: Changed from /revoke/:facultyId to /delegations/:id
router.delete('/delegations/:facultyId', revokeDelegation);

// Extend delegation
router.patch('/extend/:facultyId', extendDelegation);

export default router;