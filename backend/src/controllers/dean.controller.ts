// backend/src/controllers/dean.controller.ts
// ✅ FIXED: Returns correct format for frontend

import { Request, Response } from 'express';
import User from '../models/User';
import EarlyDepartureRequest from '../models/EarlyDepartureRequest';

/* ============================
   DEAN DASHBOARD
============================ */
export const getDeanDashboard = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'DEAN') {
      res.status(403).json({ message: 'Only Deans can access this dashboard' });
      return;
    }

    const hods = await User.find({ role: 'HOD', isActive: true }).select('_id');
    const hodIds = hods.map(h => h._id);

    const requests = await EarlyDepartureRequest.find({
      facultyId: { $in: hodIds }
    }).lean();

    const statistics = {
      totalRequests: requests.length,
      pendingRequests: requests.filter(r => r.status === 'PENDING').length,
      approvedRequests: requests.filter(r => r.status === 'APPROVED').length,
      rejectedRequests: requests.filter(r => r.status === 'REJECTED').length
    };

    res.json(statistics);return;
  } catch (error) {
    console.error('Get dean dashboard error:', error);
    res.status(500).json({ message: 'Server error' });return;
  }
};

/* ============================
   GET HOD REQUESTS
   ✅ FIXED: Returns { requests: [...] } format
============================ */
export const getHODRequests = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'DEAN') {
      res.status(403).json({ message: 'Only Deans can view HOD requests' });
      return;
    }

    const hods = await User.find({ role: 'HOD', isActive: true }).select('_id');
    const hodIds = hods.map(h => h._id);

    let query: any = { facultyId: { $in: hodIds } };

    if (req.query.status && req.query.status !== 'all') {
      query.status = (req.query.status as string).toUpperCase();
    }

    const requests = await EarlyDepartureRequest.find(query)
      .populate('facultyId', 'firstName lastName email employeeId department phoneNumber role')
      .populate('approvedBy', 'firstName lastName email role')
      .sort({ submittedAt: -1 })
      .lean();

    // ✅ Transform to frontend format
    const transformedRequests = requests.map(r => ({
      id: r._id.toString(),
      faculty: {
        _id: (r.facultyId as any)._id.toString(),
        firstName: (r.facultyId as any).firstName,
        lastName: (r.facultyId as any).lastName,
        email: (r.facultyId as any).email,
        employeeId: (r.facultyId as any).employeeId,
        department: (r.facultyId as any).department,
        phoneNumber: (r.facultyId as any).phoneNumber
      },
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
      submittedAt: r.submittedAt,
      approvedAt: r.approvedAt,
      rejectedAt: r.rejectedAt
    }));

    // ✅ IMPORTANT: Return { requests: [...] }
    res.json({ requests: transformedRequests });return;
  } catch (error) {
    console.error('Get HOD requests error:', error);
    res.status(500).json({ message: 'Server error' });return;
  }
};

/* ============================
   GET ALL HODs
   ✅ FIXED: Returns { hods: [...] } format
============================ */
export const getAllHODs = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'DEAN') {
      res.status(403).json({ message: 'Only Deans can view HODs' });
      return;
    }

    const hods = await User.find({ role: 'HOD', isActive: true })
      .select('firstName lastName email employeeId department phoneNumber createdAt')
      .lean();

    const hodsWithStats = await Promise.all(
      hods.map(async (hod) => {
        const requests = await EarlyDepartureRequest.find({
          facultyId: hod._id
        }).lean();

        return {
          id: hod._id.toString(),
          _id: hod._id.toString(),
          firstName: hod.firstName,
          lastName: hod.lastName,
          email: hod.email,
          employeeId: hod.employeeId,
          department: hod.department,
          phoneNumber: hod.phoneNumber,
          requestStats: {
            total: requests.length,
            pending: requests.filter(r => r.status === 'PENDING').length,
            approved: requests.filter(r => r.status === 'APPROVED').length,
            rejected: requests.filter(r => r.status === 'REJECTED').length
          }
        };
      })
    );

    // ✅ IMPORTANT: Return { hods: [...] }
    res.json({ hods: hodsWithStats });return;
  } catch (error) {
    console.error('Get HODs error:', error);
    res.status(500).json({ message: 'Server error' });return;
  }
};