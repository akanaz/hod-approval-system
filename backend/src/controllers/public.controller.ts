// backend/src/controllers/public.controller.ts
// Module 3: Public aggregate stats (privacy-protected — no personal data exposed)

import { Request, Response } from 'express';
import EarlyDepartureRequest from '../models/EarlyDepartureRequest';
import User from '../models/User';

/**
 * GET /api/public/stats
 * Returns aggregate statistics with no personally-identifiable information.
 * Publicly accessible (no authentication required).
 */
export const getPublicStats = async (
  _req: Request,
  res: Response
): Promise<Response> => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Request counts
    const [
      totalThisMonth,
      approvedThisMonth,
      rejectedThisMonth,
      pendingThisMonth,
      totalAllTime,
      todayRequests,
      totalFaculty,
      totalDepartments,
    ] = await Promise.all([
      EarlyDepartureRequest.countDocuments({ createdAt: { $gte: startOfMonth } }),
      EarlyDepartureRequest.countDocuments({ status: 'APPROVED', createdAt: { $gte: startOfMonth } }),
      EarlyDepartureRequest.countDocuments({ status: 'REJECTED', createdAt: { $gte: startOfMonth } }),
      EarlyDepartureRequest.countDocuments({ status: 'PENDING', createdAt: { $gte: startOfMonth } }),
      EarlyDepartureRequest.countDocuments({}),
      EarlyDepartureRequest.countDocuments({ createdAt: { $gte: startOfDay } }),
      User.countDocuments({ role: 'FACULTY', isActive: true }),
      User.distinct('department', { isActive: true }),
    ]);

    const approvalRate = totalThisMonth > 0
      ? Math.round((approvedThisMonth / totalThisMonth) * 100)
      : 0;

    return res.json({
      month: now.toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
      thisMonth: {
        total: totalThisMonth,
        approved: approvedThisMonth,
        rejected: rejectedThisMonth,
        pending: pendingThisMonth,
        approvalRate,
      },
      today: {
        requests: todayRequests,
      },
      institution: {
        totalRequests: totalAllTime,
        activeFaculty: totalFaculty,
        departments: (totalDepartments as string[]).length,
      },
    });
  } catch (error) {
    console.error('Public stats error:', error);
    return res.status(500).json({ message: 'Error fetching stats' });
  }
};
