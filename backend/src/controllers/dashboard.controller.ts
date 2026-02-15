// backend/src/controllers/dashboard.controller.ts
// ✅ FIXED: Correct response format for frontend + removed unused types

import { Request, Response } from 'express';
import User from '../models/User';
import EarlyDepartureRequest from '../models/EarlyDepartureRequest';

/* ============================
   HOD DASHBOARD
   ✅ FIXED: Flat response format
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
      .populate('approvedBy', 'firstName lastName role')
      .sort({ submittedAt: -1 })
      .lean();

    // Calculate statistics
    const totalRequests = requests.length;
    const pendingRequests = requests.filter(r => r.status === 'PENDING').length;
    const approvedRequests = requests.filter(r => r.status === 'APPROVED').length;
    const rejectedRequests = requests.filter(r => r.status === 'REJECTED').length;
    const moreInfoNeeded = requests.filter(r => r.status === 'MORE_INFO_NEEDED').length;

    // Urgency breakdown
    const urgencyBreakdown = {
      CRITICAL: requests.filter(r => r.urgencyLevel === 'CRITICAL').length,
      HIGH: requests.filter(r => r.urgencyLevel === 'HIGH').length,
      MEDIUM: requests.filter(r => r.urgencyLevel === 'MEDIUM').length,
      LOW: requests.filter(r => r.urgencyLevel === 'LOW').length,
    };

    // Status breakdown
    const statusBreakdown = {
      PENDING: pendingRequests,
      APPROVED: approvedRequests,
      REJECTED: rejectedRequests,
      MORE_INFO_NEEDED: moreInfoNeeded,
    };

    // Transform requests for frontend
    const transformedRequests = requests.map(r => ({
      id: r._id.toString(),
      _id: r._id.toString(),
      faculty: r.facultyId,
      leaveType: r.leaveType,
      departureDate: r.departureDate,
      departureTime: r.departureTime,
      expectedReturnTime: r.expectedReturnTime,
      reason: r.reason,
      destination: r.destination,
      urgencyLevel: r.urgencyLevel,
      status: r.status,
      hodComments: r.hodComments,
      rejectionReason: r.rejectionReason,
      exitPassNumber: r.exitPassNumber,
      qrCode: r.qrCode,
      attachments: r.attachments,
      submittedAt: r.submittedAt,
      approvedAt: r.approvedAt,
      rejectedAt: r.rejectedAt,
      approvedBy: r.approvedBy,
      approvedByRole: r.approvedByRole,
    }));

    // ✅ FIXED: Return flat structure matching DashboardStats interface
    res.json({
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      recentRequests: transformedRequests.slice(0, 20), // Recent 20
      urgencyBreakdown,
      statusBreakdown,
      department: hod.department,
      facultyCount: facultyIds.length,
    });
    return;
  } catch (error) {
    console.error('Get HOD dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
    return;
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
      .populate('approvedBy', 'firstName lastName role')
      .sort({ submittedAt: -1 })
      .lean();

    const totalRequests = requests.length;
    const pendingRequests = requests.filter(r => r.status === 'PENDING').length;
    const approvedRequests = requests.filter(r => r.status === 'APPROVED').length;
    const rejectedRequests = requests.filter(r => r.status === 'REJECTED').length;

    // Transform requests
    const transformedRequests = requests.map(r => ({
      id: r._id.toString(),
      _id: r._id.toString(),
      leaveType: r.leaveType,
      departureDate: r.departureDate,
      departureTime: r.departureTime,
      expectedReturnTime: r.expectedReturnTime,
      reason: r.reason,
      destination: r.destination,
      urgencyLevel: r.urgencyLevel,
      status: r.status,
      hodComments: r.hodComments,
      rejectionReason: r.rejectionReason,
      exitPassNumber: r.exitPassNumber,
      qrCode: r.qrCode,
      attachments: r.attachments,
      submittedAt: r.submittedAt,
      approvedAt: r.approvedAt,
      rejectedAt: r.rejectedAt,
      approvedBy: r.approvedBy,
      approvedByRole: r.approvedByRole,
    }));

    res.json({ 
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      recentRequests: transformedRequests,
    });
    return;
  } catch (error) {
    console.error('Get faculty dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
    return;
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
    return;
  } catch (error) {
    console.error('Get department stats error:', error);
    res.status(500).json({ message: 'Server error' });
    return;
  }
};