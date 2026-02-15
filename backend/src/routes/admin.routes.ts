// backend/src/routes/admin.routes.ts
// ✅ FIXED: Added /create-user route

import express from 'express';
import {
  getAdminDashboard,
  getAllUsers,
  toggleUserStatus,
  createUser,
  deleteUser,
getActivityLogs
} from '../controllers/admin.controller';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';

const router = express.Router();

// All routes require authentication and ADMIN role
router.use(authenticate);
router.use(authorizeRoles('ADMIN'));

// Admin dashboard with complete stats
router.get('/dashboard', getAdminDashboard);
router.get('/activity-logs', getActivityLogs);

// User management
router.get('/users', getAllUsers);
router.post('/users', createUser);              // ✅ KEEP THIS
router.post('/create-user', createUser);        // ✅ ADD THIS (frontend calls this)
router.patch('/users/:id/toggle-status', toggleUserStatus);
router.delete('/users/:id', deleteUser);

export default router;