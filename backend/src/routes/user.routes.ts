import { Router, Request, Response } from 'express';
import User from '../models/User';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

/* ============================
   GET ALL USERS (ADMIN)
============================ */
router.get(
  '/',
  authenticate,
  authorizeRoles('ADMIN'),
  async (_req: Request, res: Response): Promise<Response> => {
    try {
      const users = await User.find().select('-password').lean();

      const formattedUsers = users.map((u) => ({
        id: u._id.toString(),
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        employeeId: u.employeeId,
        department: u.department,
        role: u.role,
        phoneNumber: u.phoneNumber,
        isActive: u.isActive,
        createdAt: u.createdAt,
      }));

      return res.json({ users: formattedUsers });
    } catch (error) {
      console.error('Get users error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

/* ============================
   GET USER BY ID
============================ */
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const user = await User.findById(req.params.id)
        .select('-password')
        .lean();

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.json({
        user: {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          employeeId: user.employeeId,
          department: user.department,
          role: user.role,
          phoneNumber: user.phoneNumber,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      console.error('Get user error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

/* ============================
   UPDATE USER (ADMIN)
============================ */
router.patch(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN'),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { isActive, role, department } = req.body;

      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (typeof isActive === 'boolean') user.isActive = isActive;
      if (role) user.role = role;
      if (department) user.department = department;

      await user.save();

      const userObj = user.toObject() as any;
      delete userObj.password;

      return res.json({
        message: 'User updated successfully',
        user: {
          ...userObj,
          id: user._id.toString(),
        },
      });
    } catch (error) {
      console.error('Update user error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

/* ============================
   DELETE USER (ADMIN)
============================ */
router.delete(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN'),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const user = await User.findByIdAndDelete(req.params.id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

export default router;
