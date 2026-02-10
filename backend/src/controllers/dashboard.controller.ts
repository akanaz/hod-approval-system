import { Request, Response } from 'express';
import User from '../models/User';
import EarlyDepartureRequest from '../models/EarlyDepartureRequest';

/* ============================
   TYPES
============================ */
type UrgencyLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

/* ============================
   ADMIN DASHBOARD
============================ */
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
      moreInfoNeeded: requests.filter(
        r => r.status === 'MORE_INFO_NEEDED'
      ).length,
    };

    /* ================= DEPARTMENT STATS ================= */
    const departments = [...new Set(users.map(u => u.department))];

    const departmentStats = departments.map(dept => {
      const deptUsers = users.filter(u => u.department === dept);
      const deptFaculty = deptUsers.filter(u => u.role === 'FACULTY');
      const hod = deptUsers.find(u => u.role === 'HOD');

      const deptRequests = requests.filter(r =>
        deptFaculty.some(f =>
          f._id.toString() === r.facultyId.toString()
        )
      );

      const approved = deptRequests.filter(
        r => r.status === 'APPROVED'
      ).length;

      return {
        department: dept,
        hodName: hod ? `${hod.firstName} ${hod.lastName}` : 'N/A',
        hodEmail: hod?.email || 'N/A',
        totalFaculty: deptFaculty.length,
        totalRequests: deptRequests.length,
        pendingRequests: deptRequests.filter(
          r => r.status === 'PENDING'
        ).length,
        approvedRequests: approved,
        rejectedRequests: deptRequests.filter(
          r => r.status === 'REJECTED'
        ).length,
        approvalRate:
          deptRequests.length > 0
            ? ((approved / deptRequests.length) * 100).toFixed(1)
            : '0',
      };
    });

    /* ================= URGENCY BREAKDOWN ================= */
    const urgencyLevels: UrgencyLevel[] = [
      'CRITICAL',
      'HIGH',
      'MEDIUM',
      'LOW',
    ];

    const urgencyBreakdown = urgencyLevels.map(level => ({
      urgency: level,
      count: requests.filter(
        r => r.urgencyLevel === level
      ).length,
    }));

    /* ================= SAFE DEFAULTS ================= */
    const monthlyTrend: any[] = [];
    const topFaculty: any[] = [];

    res.json({
      overallStats,
      departmentStats,
      urgencyBreakdown,
      monthlyTrend,
      topFaculty,
      avgApprovalTimeHours: 0,
    });
  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/* ============================
   HOD DASHBOARD
============================ */
export const getHODDashboard = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || (req.user.role !== 'HOD' && req.user.role !== 'ADMIN')) {
      res.status(403).json({ message: 'Only HODs can access this dashboard' });
      return;
    }

    const hod = await User.findById(req.user.userId);
    if (!hod) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const faculty = await User.find({
      department: hod.department,
      role: 'FACULTY',
      isActive: true,
    }).select('_id firstName lastName email employeeId phoneNumber');

    const facultyIds = faculty.map(f => f._id);

    const requests = await EarlyDepartureRequest.find({
      facultyId: { $in: facultyIds },
    })
      .populate(
        'facultyId',
        'firstName lastName email employeeId phoneNumber department'
      )
      .sort({ submittedAt: -1 })
      .lean();

    const stats = {
      pending: requests.filter(r => r.status === 'PENDING').length,
      approved: requests.filter(r => r.status === 'APPROVED').length,
      rejected: requests.filter(r => r.status === 'REJECTED').length,
      moreInfoNeeded: requests.filter(
        r => r.status === 'MORE_INFO_NEEDED'
      ).length,
      total: requests.length,
    };

   res.json({
  statistics: {
    pending: stats.pending,
    approved: stats.approved,
    rejected: stats.rejected,
    total: stats.total,
  },

  pendingRequests: requests.filter(
    r => r.status === 'PENDING'
  ),

  urgencyBreakdown: [
    { urgency: 'CRITICAL', count: requests.filter(r => r.urgencyLevel === 'CRITICAL').length },
    { urgency: 'HIGH', count: requests.filter(r => r.urgencyLevel === 'HIGH').length },
    { urgency: 'MEDIUM', count: requests.filter(r => r.urgencyLevel === 'MEDIUM').length },
    { urgency: 'LOW', count: requests.filter(r => r.urgencyLevel === 'LOW').length },
  ],

  department: hod.department,
  facultyCount: facultyIds.length,
});

  } catch (error) {
    console.error('Get HOD dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/* ============================
   FACULTY DASHBOARD
============================ */
export const getFacultyDashboard = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const requests = await EarlyDepartureRequest.find({
      facultyId: req.user.userId,
    })
      .sort({ submittedAt: -1 })
      .lean();

    const statistics = {
      pending: requests.filter(r => r.status === 'PENDING').length,
      approved: requests.filter(r => r.status === 'APPROVED').length,
      rejected: requests.filter(r => r.status === 'REJECTED').length,
      total: requests.length,
    };

    res.json({ statistics, requests });
  } catch (error) {
    console.error('Get faculty dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/* ============================
   DEPARTMENT STATS
============================ */
export const getDepartmentStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || (req.user.role !== 'HOD' && req.user.role !== 'ADMIN')) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    const hod = await User.findById(req.user.userId);
    if (!hod) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const faculty = await User.find({
      department: hod.department,
      role: 'FACULTY',
      isActive: true,
    });

    const facultyIds = faculty.map(f => f._id);

    const requests = await EarlyDepartureRequest.find({
      facultyId: { $in: facultyIds },
    }).lean();

    res.json({
      department: hod.department,
      totalFaculty: faculty.length,
      totalRequests: requests.length,
      approvedRequests: requests.filter(r => r.status === 'APPROVED').length,
      rejectedRequests: requests.filter(r => r.status === 'REJECTED').length,
      pendingRequests: requests.filter(r => r.status === 'PENDING').length,
    });
  } catch (error) {
    console.error('Get department stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
