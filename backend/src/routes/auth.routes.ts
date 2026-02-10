import express from 'express';
import {
  login,
  register,
  getProfile
} from '../controllers/auth.controller';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';

const router = express.Router();

// Public
router.post('/login', login);

// Admin only
router.post(
  '/register',
  authenticate,
  authorizeRoles('ADMIN'),
  register
);

// Logged-in user
router.get('/me', authenticate, getProfile);

export default router;
