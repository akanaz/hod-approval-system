// backend/src/controllers/request.controller.ts
// UPDATED WITH: Email Notifications, Duplicate Prevention, Faculty History, Enhanced QR

import { Request, Response } from 'express';
import EarlyDepartureRequest from '../models/EarlyDepartureRequest';
import User from '../models/User';
import { AuditLog, Comment } from '../models';
import QRCode from 'qrcode';
import { sendRequestCreatedEmail, sendRequestApprovedEmail, sendRequestRejectedEmail } from '../utils/email';

export const createRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const {
      departureDate,
      departureTime,
      expectedReturnTime,
      reason,
      destination,
      urgencyLevel,
      currentWorkload,
      coverageArrangement,
      attachments // ✅ NEW: File attachments from frontend
    } = req.body;

    if (!departureDate || !departureTime || !reason) {
      res.status(400).json({ message: 'Missing required fields' });
      return;
    }

    const faculty = await User.findById(req.user.userId);
    if (!faculty) {
      res.status(404).json({ message: 'Faculty not found' });
      return;
    }

    // ✅ CHECK FOR DUPLICATE DATE
    const requestDate = new Date(departureDate);
    requestDate.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(requestDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const existingRequest = await EarlyDepartureRequest.findOne({
      facultyId: req.user.userId,
      departureDate: {
        $gte: requestDate,
        $lt: nextDay
      }
    });

    if (existingRequest) {
      res.status(409).json({ 
        message: `You already have a request for ${requestDate.toLocaleDateString()}. Multiple requests for the same date are not allowed.` 
      });
      return;
    }

    const request = await EarlyDepartureRequest.create({
      facultyId: req.user.userId,
      departureDate: new Date(departureDate),
      departureTime,
      expectedReturnTime,
      reason,
      destination,
      urgencyLevel: urgencyLevel || 'MEDIUM',
      currentWorkload,
      coverageArrangement,
      attachments: attachments || [], // ✅ Add uploaded files
      status: 'PENDING',
      submittedAt: new Date()
    });

    await AuditLog.create({
      requestId: request._id,
      userId: req.user.userId,
      action: 'created',
      details: { urgencyLevel: request.urgencyLevel }
    });

    // ✅ SEND EMAIL TO HOD
    try {
      const hod = await User.findOne({
        department: faculty.department,
        role: 'HOD',
        isActive: true
      });

      if (hod && hod.email) {
        await sendRequestCreatedEmail({
          hodEmail: hod.email,
          hodName: `${hod.firstName} ${hod.lastName}`,
          facultyName: `${faculty.firstName} ${faculty.lastName}`,
          facultyEmail: faculty.email,
          department: faculty.department,
          departureDate: new Date(departureDate).toLocaleDateString(),
          departureTime,
          urgencyLevel: urgencyLevel || 'MEDIUM',
          reason
        });
      }
    } catch (emailError) {
      console.error('Email notification failed:', emailError);
    }

    const populatedRequest = await EarlyDepartureRequest.findById(request._id)
      .populate('facultyId', 'firstName lastName email employeeId department phoneNumber')
      .lean();

    if (populatedRequest) {
      const transformed: any = { ...populatedRequest };
      transformed.id = transformed._id.toString();
      delete transformed._id;
      delete transformed.__v;

      res.status(201).json({
        message: 'Request created successfully',
        request: transformed
      });
    }
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    let query: any = {};

    if (req.user.role === 'FACULTY') {
      query.facultyId = req.user.userId;
    } else if (req.user.role === 'HOD') {
      const hod = await User.findById(req.user.userId);
      if (!hod) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      const departmentFaculty = await User.find({
        department: hod.department,
        role: 'FACULTY'
      }).select('_id');

      query.facultyId = { $in: departmentFaculty.map(f => f._id) };
    }

    if (req.query.status) {
      query.status = req.query.status;
    }

    const requests = await EarlyDepartureRequest.find(query)
      .populate('facultyId', 'firstName lastName email employeeId department phoneNumber')
      .populate('hodId', 'firstName lastName email')
      .sort({ submittedAt: -1 })
      .lean();

    const transformedRequests = requests.map(r => {
      const obj: any = { ...r };
      obj.id = r._id.toString();
      obj.faculty = obj.facultyId;
      delete obj._id;
      delete obj.__v;
      delete obj.facultyId;
      return obj;
    });

    res.json({ requests: transformedRequests });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getRequestById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const request = await EarlyDepartureRequest.findById(req.params.id)
      .populate('facultyId', 'firstName lastName email employeeId department phoneNumber')
      .populate('hodId', 'firstName lastName email')
      .lean();

    if (!request) {
      res.status(404).json({ message: 'Request not found' });
      return;
    }

    const requestObj: any = request;
    
    if (req.user.role === 'FACULTY' && requestObj.facultyId._id.toString() !== req.user.userId) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    if (req.user.role === 'HOD') {
      const hod = await User.findById(req.user.userId);
      if (hod && requestObj.facultyId.department !== hod.department) {
        res.status(403).json({ message: 'Access denied' });
        return;
      }
    }

    // ✅ GET FACULTY HISTORY
    let facultyHistory: any[] = [];
    if (req.user.role === 'HOD' || req.user.role === 'ADMIN') {
      const history = await EarlyDepartureRequest.find({
        facultyId: requestObj.facultyId._id,
        _id: { $ne: req.params.id }
      })
        .select('departureDate status urgencyLevel reason submittedAt')
        .sort({ submittedAt: -1 })
        .limit(10)
        .lean();

      facultyHistory = history.map(h => ({
        id: h._id.toString(),
        departureDate: h.departureDate,
        status: h.status,
        urgencyLevel: h.urgencyLevel,
        reason: h.reason,
        submittedAt: h.submittedAt
      }));
    }

    const transformed: any = { ...requestObj };
    transformed.id = requestObj._id.toString();
    transformed.faculty = requestObj.facultyId;
    transformed.facultyHistory = facultyHistory;
    delete transformed._id;
    delete transformed.__v;
    delete transformed.facultyId;

    res.json(transformed);
  } catch (error) {
    console.error('Get request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const approveRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const { hodComments } = req.body;

    const request = await EarlyDepartureRequest.findById(req.params.id)
      .populate('facultyId', 'department firstName lastName email employeeId');

    if (!request) {
      res.status(404).json({ message: 'Request not found' });
      return;
    }

    if (request.status !== 'PENDING' && request.status !== 'MORE_INFO_NEEDED') {
      res.status(400).json({ message: 'Request already processed' });
      return;
    }

    const exitPassNumber = `EP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    
    // ✅ ENHANCED QR CODE WITH COMPLETE DETAILS
    const facultyObj = request.toObject().facultyId as any;
    const qrData = JSON.stringify({
      exitPassNumber,
      facultyName: `${facultyObj.firstName} ${facultyObj.lastName}`,
      employeeId: facultyObj.employeeId,
      department: facultyObj.department,
      departureDate: request.departureDate.toLocaleDateString(),
      departureTime: request.departureTime,
      expectedReturn: request.expectedReturnTime || 'N/A',
      reason: request.reason,
      destination: request.destination || 'N/A',
      urgency: request.urgencyLevel,
      approvedBy: 'HOD',
      approvedAt: new Date().toLocaleString()
    });
    
    const qrCode = await QRCode.toDataURL(qrData);

    request.status = 'APPROVED';
    request.hodId = req.user.userId as any;
    request.approvedAt = new Date();
    request.hodComments = hodComments;
    request.exitPassNumber = exitPassNumber;
    request.qrCode = qrCode;

    await request.save();

    await AuditLog.create({
      requestId: request._id,
      userId: req.user.userId,
      action: 'approved',
      details: { exitPassNumber }
    });

    // ✅ SEND APPROVAL EMAIL TO FACULTY
    try {
      await sendRequestApprovedEmail({
        facultyEmail: facultyObj.email,
        facultyName: `${facultyObj.firstName} ${facultyObj.lastName}`,
        exitPassNumber,
        departureDate: request.departureDate.toLocaleDateString(),
        departureTime: request.departureTime,
        hodComments: hodComments || 'None',
        qrCode
      });
    } catch (emailError) {
      console.error('Approval email failed:', emailError);
    }

    const updated = await EarlyDepartureRequest.findById(req.params.id)
      .populate('facultyId', 'firstName lastName email employeeId department phoneNumber')
      .populate('hodId', 'firstName lastName email')
      .lean();

    if (updated) {
      const transformed: any = { ...updated };
      transformed.id = updated._id.toString();
      transformed.faculty = updated.facultyId;
      delete transformed._id;
      delete transformed.__v;
      delete transformed.facultyId;

      res.json({ message: 'Request approved', request: transformed });
    }
  } catch (error) {
    console.error('Approve error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const rejectRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const { rejectionReason, hodComments } = req.body;

    if (!rejectionReason) {
      res.status(400).json({ message: 'Rejection reason required' });
      return;
    }

    const request = await EarlyDepartureRequest.findById(req.params.id)
      .populate('facultyId', 'department firstName lastName email');

    if (!request) {
      res.status(404).json({ message: 'Request not found' });
      return;
    }

    request.status = 'REJECTED';
    request.hodId = req.user.userId as any;
    request.rejectedAt = new Date();
    request.rejectionReason = rejectionReason;
    request.hodComments = hodComments;

    await request.save();

    await AuditLog.create({
      requestId: request._id,
      userId: req.user.userId,
      action: 'rejected',
      details: { rejectionReason }
    });

    // ✅ SEND REJECTION EMAIL TO FACULTY
    try {
      const facultyObj = request.toObject().facultyId as any;
      await sendRequestRejectedEmail({
        facultyEmail: facultyObj.email,
        facultyName: `${facultyObj.firstName} ${facultyObj.lastName}`,
        departureDate: request.departureDate.toLocaleDateString(),
        departureTime: request.departureTime,
        rejectionReason,
        hodComments: hodComments || 'None'
      });
    } catch (emailError) {
      console.error('Rejection email failed:', emailError);
    }

    const updated = await EarlyDepartureRequest.findById(req.params.id)
      .populate('facultyId', 'firstName lastName email employeeId department phoneNumber')
      .populate('hodId', 'firstName lastName email')
      .lean();

    if (updated) {
      const transformed: any = { ...updated };
      transformed.id = updated._id.toString();
      transformed.faculty = updated.facultyId;
      delete transformed._id;
      delete transformed.__v;
      delete transformed.facultyId;

      res.json({ message: 'Request rejected', request: transformed });
    }
  } catch (error) {
    console.error('Reject error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const requestMoreInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const { hodComments } = req.body;

    if (!hodComments) {
      res.status(400).json({ message: 'Comments required' });
      return;
    }

    const request = await EarlyDepartureRequest.findById(req.params.id)
      .populate('facultyId', 'firstName lastName email');

    if (!request) {
      res.status(404).json({ message: 'Request not found' });
      return;
    }

    request.status = 'MORE_INFO_NEEDED';
    request.hodId = req.user.userId as any;
    request.hodComments = hodComments;

    await request.save();

    await AuditLog.create({
      requestId: request._id,
      userId: req.user.userId,
      action: 'requested_more_info',
      details: { hodComments }
    });

    const updated = await EarlyDepartureRequest.findById(req.params.id)
      .populate('facultyId', 'firstName lastName email employeeId department phoneNumber')
      .populate('hodId', 'firstName lastName email')
      .lean();

    if (updated) {
      const transformed: any = { ...updated };
      transformed.id = updated._id.toString();
      transformed.faculty = updated.facultyId;
      delete transformed._id;
      delete transformed.__v;
      delete transformed.facultyId;

      res.json({ message: 'More info requested', request: transformed });
    }
  } catch (error) {
    console.error('More info error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const addComment = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const { content, isInternal } = req.body;

    if (!content) {
      res.status(400).json({ message: 'Content required' });
      return;
    }

    const comment = await Comment.create({
      requestId: req.params.id,
      userId: req.user.userId,
      content,
      isInternal: isInternal || false
    });

    const populated = await Comment.findById(comment._id)
      .populate('userId', 'firstName lastName role')
      .lean();

    if (populated) {
      const transformed: any = { ...populated };
      transformed.id = populated._id.toString();
      delete transformed._id;
      delete transformed.__v;

      res.status(201).json({ message: 'Comment added', comment: transformed });
    }
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
