import { Request, Response } from 'express';
import User from '../models/User';
import EarlyDepartureRequest from '../models/EarlyDepartureRequest';
import { AuditLog } from '../models';

/* ================= ADMIN DASHBOARD ================= */

export const getAdminDashboard = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      res.status(403).json({ message: 'Only admins can access this dashboard' });
      return;
    }

    const users = await User.find().lean();
    const requests = await EarlyDepartureRequest.find().lean();

    const faculty = users.filter(u => u.role === 'FACULTY');
    const hods = users.filter(u => u.role === 'HOD');
    const admins = users.filter(u => u.role === 'ADMIN');

    /* ================= OVERALL STATS ================= */
    const overallStats = {
      totalUsers: users.length,
      totalFaculty: faculty.length,
      totalHODs: hods.length,
      totalAdmins: admins.length,
      totalRequests: requests.length,
      pendingRequests: requests.filter(r => r.status === 'PENDING').length,
      approvedRequests: requests.filter(r => r.status === 'APPROVED').length,
      rejectedRequests: requests.filter(r => r.status === 'REJECTED').length,
      moreInfoNeeded: requests.filter(r => r.status === 'MORE_INFO_NEEDED').length,
    };

    /* ================= DEPARTMENT STATS ================= */
    const departments = [...new Set(users.map(u => u.department))].filter(Boolean);

    const departmentStats = departments.map(dept => {
      const deptUsers = users.filter(u => u.department === dept);
      const deptFaculty = deptUsers.filter(u => u.role === 'FACULTY');
      const hod = deptUsers.find(u => u.role === 'HOD');

      const deptRequests = requests.filter(r => {
        const facultyUser = faculty.find(f => f._id.toString() === r.facultyId.toString());
        return facultyUser && facultyUser.department === dept;
      });

      const approved = deptRequests.filter(r => r.status === 'APPROVED').length;

      return {
        department: dept,
        hodName: hod ? `${hod.firstName} ${hod.lastName}` : 'N/A',
        hodEmail: hod?.email || 'N/A',
        totalFaculty: deptFaculty.length,
        totalRequests: deptRequests.length,
        pendingRequests: deptRequests.filter(r => r.status === 'PENDING').length,
        approvedRequests: approved,
        rejectedRequests: deptRequests.filter(r => r.status === 'REJECTED').length,
        approvalRate: deptRequests.length > 0
          ? ((approved / deptRequests.length) * 100).toFixed(1)
          : '0',
      };
    });

    /* ================= URGENCY BREAKDOWN ================= */
    const urgencyLevels = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    const urgencyBreakdown = urgencyLevels.map(level => ({
      urgency: level,
      count: requests.filter(r => r.urgencyLevel === level).length,
    }));

    /* ================= MONTHLY TREND ================= */
    const monthlyTrend = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthRequests = requests.filter(r => {
        const reqDate = new Date(r.submittedAt);
        return reqDate >= monthDate && reqDate <= monthEnd;
      });

      monthlyTrend.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short' }),
        total: monthRequests.length,
        approved: monthRequests.filter(r => r.status === 'APPROVED').length,
        rejected: monthRequests.filter(r => r.status === 'REJECTED').length,
        pending: monthRequests.filter(r => r.status === 'PENDING').length,
      });
    }

    /* ================= TOP FACULTY ================= */
    const facultyStats = faculty.map(f => {
      const facultyRequests = requests.filter(
        r => r.facultyId.toString() === f._id.toString()
      );

      return {
        name: `${f.firstName} ${f.lastName}`,
        department: f.department,
        totalRequests: facultyRequests.length,
        approved: facultyRequests.filter(r => r.status === 'APPROVED').length,
        rejected: facultyRequests.filter(r => r.status === 'REJECTED').length,
        pending: facultyRequests.filter(r => r.status === 'PENDING').length,
      };
    });

    const topFaculty = facultyStats
      .sort((a, b) => b.totalRequests - a.totalRequests)
      .slice(0, 10);

    /* ================= AVG APPROVAL TIME ================= */
    const approvedRequests = requests.filter(
      r => r.status === 'APPROVED' && r.approvedAt && r.submittedAt
    );

    let avgApprovalTimeHours = 0;
    if (approvedRequests.length > 0) {
      const totalHours = approvedRequests.reduce((sum, r) => {
        const submitted = new Date(r.submittedAt).getTime();
        const approved = new Date(r.approvedAt!).getTime();
        return sum + (approved - submitted) / (1000 * 60 * 60);
      }, 0);
      avgApprovalTimeHours = Math.round(totalHours / approvedRequests.length);
    }

    res.json({
      overallStats,
      departmentStats,
      urgencyBreakdown,
      monthlyTrend,
      topFaculty,
      avgApprovalTimeHours,
    });return;
  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({ message: 'Server error' });return;
  }
};

/* ================= CREATE USER ================= */

export const createUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      employeeId,
      department,
      role,
      phoneNumber
    } = req.body;

    // Validate role
    if (!['FACULTY', 'HOD'].includes(role)) {
      res.status(400).json({ message: 'Only FACULTY or HOD roles are allowed' });
      return;
    }

    // Validate password length
    if (!password || password.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters long' });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ message: 'Invalid email format' });
      return;
    }

    // Check for existing email
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      res.status(409).json({ message: 'Email already exists' });
      return;
    }

    // Check for existing employee ID
    const empExists = await User.findOne({ employeeId });
    if (empExists) {
      res.status(409).json({ message: 'Employee ID already exists' });
      return;
    }

    // ✅ HOD UNIQUENESS CHECK
    if (role === 'HOD') {
      const existingHOD = await User.findOne({
        department: department,
        role: 'HOD',
        isActive: true
      });

      if (existingHOD) {
        res.status(409).json({
          message: `${department} already has an HOD assigned (${existingHOD.firstName} ${existingHOD.lastName}). Each department can have only one HOD.`
        });
        return;
      }
    }

    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      employeeId,
      department,
      role,
      phoneNumber
    });

    res.status(201).json({
      message: `${role} created successfully`,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        department: user.department,
        employeeId: user.employeeId,
      }
    });return;
  } catch (err: any) {
    console.error('Create user error:', err);
    
    // Handle mongoose validation errors
    if (err.name === 'ValidationError') {
      res.status(400).json({ message: err.message });
      return;
    }
    
    res.status(500).json({ message: 'Server error' });return;
  }
};

/* ================= GET USERS ================= */

export const getAllUsers = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    const formattedUsers = users.map(u => ({
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

    res.json({ users: formattedUsers });return;
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ message: 'Server error' });return;
  }
};

/* ================= TOGGLE STATUS ================= */

export const toggleUserStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      message: `User ${user.isActive ? 'activated' : 'deactivated'}`,
      user: {
        id: user._id,
        isActive: user.isActive
      }
    });return;
  } catch (err) {
    console.error('Toggle user error:', err);
    res.status(500).json({ message: 'Server error' });return;
  }
};

/* ================= DELETE USER ================= */

export const deleteUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Prevent deletion of admin accounts
    if (user.role === 'ADMIN') {
      res.status(403).json({ message: 'Cannot delete admin accounts' });
      return;
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      message: `${user.role} deleted successfully`,
    });return;
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ message: 'Server error' });return;
  }
};



// backend/src/controllers/admin.controller.ts
// ✅ COMPLETE FIX: Returns details as formatted string for frontend

export const getActivityLogs = async (_req: Request, res: Response): Promise<void> => {
  try {
    const logs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('userId', 'firstName lastName role email')
      .lean();

    // ✅ Format logs with proper details string
    const formattedLogs = logs.map(log => {
      const user = log.userId as any;
      
      const userName = user && user.firstName 
        ? `${user.firstName} ${user.lastName}`
        : 'Deleted User';
      
      const userRole = user && user.role 
        ? user.role 
        : 'Unknown';

      // ✅ FIXED: Convert details object to readable string
      let detailsText = 'No details';
      
      if (log.details && typeof log.details === 'object') {
        // Format based on action type
        switch(log.action) {
          case 'delegation_granted':
            detailsText = `Delegated to ${log.details.delegatedToName} from ${new Date(log.details.startDate).toLocaleDateString()} to ${new Date(log.details.endDate).toLocaleDateString()}`;
            break;
          
          case 'delegation_revoked':
            detailsText = `Revoked delegation from ${log.details.facultyName}`;
            break;
          
          case 'delegation_extended':
            detailsText = `Extended delegation for ${log.details.facultyName} until ${new Date(log.details.newEndDate).toLocaleDateString()}`;
            break;
          
          case 'created':
            detailsText = `Request created - ${log.details.leaveType || 'N/A'} leave (${log.details.urgencyLevel || 'N/A'} priority)`;
            break;
          
          case 'approved':
            detailsText = `Request approved${log.details.exitPassNumber ? ` - Pass #${log.details.exitPassNumber}` : ''}${log.details.approvedByRole ? ` by ${log.details.approvedByRole}` : ''}`;
            break;
          
          case 'rejected':
            detailsText = `Request rejected${log.details.rejectionReason ? `: ${log.details.rejectionReason}` : ''}${log.details.rejectedByRole ? ` by ${log.details.rejectedByRole}` : ''}`;
            break;
          
          case 'edited':
            detailsText = `Request edited - ${Object.keys(log.details.changes || {}).join(', ')}`;
            break;
          
          case 'cancelled':
            detailsText = `Request cancelled${log.details.cancellationReason ? `: ${log.details.cancellationReason}` : ''}`;
            break;
          
          default:
            // Fallback: stringify the object
            detailsText = Object.entries(log.details)
              .map(([key, value]) => `${key}: ${value}`)
              .join(', ');
        }
      } else if (typeof log.details === 'string') {
        detailsText = log.details;
      }

      return {
        id: log._id.toString(),
        action: log.action,
        user: userName,
        role: userRole,
        timestamp: log.createdAt,
        details: detailsText  // ✅ Now a string, not an object!
      };
    });

    console.log(`✅ Returning ${formattedLogs.length} activity logs`);
    
    res.json({ logs: formattedLogs });
    return;
  } catch (error) {
    console.error('❌ Get activity logs error:', error);
    res.status(500).json({ message: 'Server error' });
    return;
  }
};