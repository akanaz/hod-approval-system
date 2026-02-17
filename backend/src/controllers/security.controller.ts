// backend/src/controllers/security.controller.ts
// Module 4: Gate Security Integration

import { Request, Response } from 'express';
import EarlyDepartureRequest from '../models/EarlyDepartureRequest';
import { AuditLog } from '../models';

/**
 * Verify an exit pass by exitPassNumber or by qrCode string.
 * Returns faculty details, request details, and whether exit is valid.
 * GET /api/security/verify/:exitPassNumber
 */
export const verifyExitPass = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { exitPassNumber } = req.params;

    if (!exitPassNumber || exitPassNumber.trim() === '') {
      return res.status(400).json({ message: 'Exit pass number is required' });
    }

    const trimmed = exitPassNumber.trim();

    // Search by exitPassNumber OR by qrCode content (which may encode the same value)
    const request = await EarlyDepartureRequest.findOne({
      $or: [
        { exitPassNumber: trimmed },
        { qrCode: { $regex: trimmed, $options: 'i' } },
      ],
    }).populate('facultyId', 'firstName lastName employeeId department phoneNumber email');

    if (!request) {
      return res.status(404).json({
        valid: false,
        message: 'Exit pass not found. No approved request matches this code.',
      });
    }

    const faculty: any = request.facultyId;

    // Check approval status
    if (request.status !== 'APPROVED') {
      return res.status(200).json({
        valid: false,
        status: request.status,
        message: `Request is not approved. Current status: ${request.status}`,
        request: {
          id: request._id,
          exitPassNumber: request.exitPassNumber,
          status: request.status,
          faculty: faculty
            ? {
                name: `${faculty.firstName} ${faculty.lastName}`,
                employeeId: faculty.employeeId,
                department: faculty.department,
                email: faculty.email,
              }
            : null,
          departureDate: request.departureDate,
          leaveType: request.leaveType,
          reason: request.reason,
          urgencyLevel: request.urgencyLevel,
        },
      });
    }

    // Time window validation (allow exit within ±3 hours of departure time for PARTIAL leaves)
    let timeWindowValid = true;
    let timeMessage = '';
    const now = new Date();
    const departureDate = new Date(request.departureDate);

    if (request.leaveType === 'PARTIAL' && request.departureTime) {
      // Parse departure time (e.g. "2:00 PM")
      const [timePart, meridiem] = request.departureTime.split(' ');
      const [hourStr, minuteStr] = timePart.split(':');
      let hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr || '0', 10);
      if (meridiem?.toUpperCase() === 'PM' && hour !== 12) hour += 12;
      if (meridiem?.toUpperCase() === 'AM' && hour === 12) hour = 0;

      const depDateTime = new Date(departureDate);
      depDateTime.setHours(hour, minute, 0, 0);

      const diffMs = now.getTime() - depDateTime.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours < -3) {
        timeWindowValid = false;
        timeMessage = `Too early — scheduled departure is ${request.departureTime}`;
      } else if (diffHours > 4) {
        timeWindowValid = false;
        timeMessage = `Time window expired — departure was scheduled at ${request.departureTime}`;
      }
    } else {
      // Full-day leave: check that today is the departure date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const depDay = new Date(departureDate);
      depDay.setHours(0, 0, 0, 0);
      if (depDay.getTime() !== today.getTime()) {
        timeWindowValid = false;
        timeMessage = `This pass is not valid for today. Scheduled date: ${departureDate.toDateString()}`;
      }
    }

    const alreadyExited = !!request.actualExitTime;

    return res.status(200).json({
      valid: timeWindowValid && !alreadyExited,
      timeWindowValid,
      alreadyExited,
      timeMessage: alreadyExited
        ? `Faculty already exited at ${new Date(request.actualExitTime!).toLocaleTimeString('en-IN')}`
        : timeMessage,
      request: {
        id: request._id,
        exitPassNumber: request.exitPassNumber,
        qrCode: request.qrCode,
        status: request.status,
        leaveType: request.leaveType,
        departureDate: request.departureDate,
        departureTime: request.departureTime,
        expectedReturnTime: request.expectedReturnTime,
        reason: request.reason,
        destination: request.destination,
        urgencyLevel: request.urgencyLevel,
        approvedAt: request.approvedAt,
        actualExitTime: request.actualExitTime,
        faculty: faculty
          ? {
              name: `${faculty.firstName} ${faculty.lastName}`,
              employeeId: faculty.employeeId,
              department: faculty.department,
              email: faculty.email,
              phoneNumber: faculty.phoneNumber,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Verify exit pass error:', error);
    return res.status(500).json({ message: 'Server error during verification' });
  }
};

/**
 * Log actual exit time for a request.
 * POST /api/security/log-exit/:requestId
 */
export const logExit = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { requestId } = req.params;

    const request = await EarlyDepartureRequest.findById(requestId).populate(
      'facultyId',
      'firstName lastName employeeId department'
    );

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.status !== 'APPROVED') {
      return res.status(400).json({
        message: 'Cannot log exit for a non-approved request',
      });
    }

    if (request.actualExitTime) {
      return res.status(400).json({
        message: `Exit already logged at ${new Date(request.actualExitTime).toLocaleTimeString('en-IN')}`,
      });
    }

    request.actualExitTime = new Date();
    await request.save();

    // Audit trail
    await AuditLog.create({
      requestId: request._id,
      userId: req.user?.userId,
      action: 'exit_logged',
      details: {
        exitTime: request.actualExitTime,
        exitPassNumber: request.exitPassNumber,
        loggedBy: req.user?.email,
      },
    });

    return res.status(200).json({
      message: 'Exit logged successfully',
      exitTime: request.actualExitTime,
      request: {
        id: request._id,
        exitPassNumber: request.exitPassNumber,
        actualExitTime: request.actualExitTime,
        faculty: request.facultyId,
      },
    });
  } catch (error) {
    console.error('Log exit error:', error);
    return res.status(500).json({ message: 'Server error while logging exit' });
  }
};

/**
 * Get all approved requests for today.
 * GET /api/security/today-approved
 */
export const getTodayApproved = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const requests = await EarlyDepartureRequest.find({
      status: 'APPROVED',
      departureDate: { $gte: today, $lt: tomorrow },
    })
      .populate('facultyId', 'firstName lastName employeeId department email phoneNumber')
      .sort({ urgencyLevel: -1, departureTime: 1 });

    return res.status(200).json({
      total: requests.length,
      exited: requests.filter((r) => r.actualExitTime).length,
      pending: requests.filter((r) => !r.actualExitTime).length,
      requests: requests.map((r) => {
        const faculty: any = r.facultyId;
        return {
          id: r._id,
          exitPassNumber: r.exitPassNumber,
          leaveType: r.leaveType,
          departureDate: r.departureDate,
          departureTime: r.departureTime,
          expectedReturnTime: r.expectedReturnTime,
          reason: r.reason,
          destination: r.destination,
          urgencyLevel: r.urgencyLevel,
          approvedAt: r.approvedAt,
          actualExitTime: r.actualExitTime,
          exited: !!r.actualExitTime,
          faculty: faculty
            ? {
                name: `${faculty.firstName} ${faculty.lastName}`,
                employeeId: faculty.employeeId,
                department: faculty.department,
                email: faculty.email,
                phoneNumber: faculty.phoneNumber,
              }
            : null,
        };
      }),
    });
  } catch (error) {
    console.error('Get today approved error:', error);
    return res.status(500).json({ message: 'Server error fetching today\'s exits' });
  }
};
