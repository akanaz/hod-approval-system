// backend/src/controllers/request.controller.ts
// ✅ COMPLETE VERSION with all features
// ✅ ADDED: Edit and Cancel request features

import { Request, Response } from 'express';
import EarlyDepartureRequest from '../models/EarlyDepartureRequest';
import User from '../models/User';
import { AuditLog, Comment } from '../models';
import QRCode from 'qrcode';
import {
  sendNewRequestEmail,
  sendApprovedEmail,
  sendRejectedEmail
} from '../utils/email';

export const createRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const {
      leaveType,
      departureDate,
      departureTime,
      expectedReturnTime,
      reason,
      destination,
      urgencyLevel,
      currentWorkload,
      coverageArrangement,
      attachments
    } = req.body;

    if (!departureDate || !reason || !leaveType) {
      res.status(400).json({ message: 'Missing required fields' });
      return;
    }

    if (leaveType === 'PARTIAL' && !departureTime) {
      res.status(400).json({ message: 'Departure time required for partial day leave' });
      return;
    }

    const faculty = await User.findById(req.user.userId);
    if (!faculty) {
      res.status(404).json({ message: 'Faculty not found' });
      return;
    }

    const request = await EarlyDepartureRequest.create({
      facultyId: req.user.userId,
      leaveType: leaveType || 'PARTIAL',
      departureDate: new Date(departureDate),
      departureTime: leaveType === 'PARTIAL' ? departureTime : undefined,
      expectedReturnTime,
      reason,
      destination,
      urgencyLevel: urgencyLevel || 'MEDIUM',
      currentWorkload,
      coverageArrangement,
      attachments: attachments || [],
      status: 'PENDING',
      submittedAt: new Date()
    });

    await AuditLog.create({
      requestId: request._id,
      userId: req.user.userId,
      action: 'created',
      details: { 
        urgencyLevel: request.urgencyLevel,
        leaveType: request.leaveType,
        attachmentCount: attachments?.length || 0
      }
    });

    // Send email to HOD or DEAN (if faculty is HOD)
    try {
      let approver;
      
      if (faculty.role === 'HOD') {
        // HOD request goes to DEAN
        approver = await User.findOne({
          role: 'DEAN',
          isActive: true
        });
      } else {
        // Faculty request goes to HOD
        approver = await User.findOne({
          department: faculty.department,
          role: 'HOD',
          isActive: true
        });
      }

      if (approver && approver.email) {
        const timeDisplay = leaveType === 'FULL_DAY' ? 'Full Day' : departureTime;
        
        await sendNewRequestEmail(
          approver.email,
          `${approver.firstName} ${approver.lastName}`,
          `${faculty.firstName} ${faculty.lastName}`,
          faculty.email,
          faculty.department,
          new Date(departureDate).toLocaleDateString('en-IN'),
          timeDisplay,
          urgencyLevel || 'MEDIUM',
          reason
        );
      } else {
        console.warn(`⚠️  No approver found for ${faculty.role} in ${faculty.department}`);
      }
    } catch (emailErr: any) {
      console.error('Email error (non-fatal):', emailErr.message);
    }

    const populatedRequest = await EarlyDepartureRequest.findById(request._id)
      .populate('facultyId', 'firstName lastName email employeeId department phoneNumber role')
      .lean();

    if (populatedRequest) {
      const transformed: any = { ...populatedRequest };
      transformed.id = transformed._id.toString();
      delete transformed._id;
      delete transformed.__v;

      res.status(201).json({
        message: 'Request created successfully',
        request: transformed
      });return;
    }
  } catch (error: any) {
  console.error('Create request error:', error);

  // ✅ Handle mongoose validation errors properly
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(
      (err: any) => err.message
    );

    res.status(400).json({
      message: messages.join(', ')
    });
    return;
  }

  res.status(500).json({ message: 'Server error' });return;
}

};

// ✅ NEW: Edit request (only PENDING requests)
export const editRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const request = await EarlyDepartureRequest.findById(req.params.id);
    
    if (!request) {
      res.status(404).json({ message: 'Request not found' });
      return;
    }

    // Only the faculty who created the request can edit it
    if (request.facultyId.toString() !== req.user.userId) {
      res.status(403).json({ message: 'You can only edit your own requests' });
      return;
    }

    // Can only edit PENDING requests
    if (request.status !== 'PENDING') {
      res.status(400).json({ 
        message: `Cannot edit ${request.status.toLowerCase()} requests. Only pending requests can be edited.`
      });
      return;
    }

    const {
      leaveType,
      departureDate,
      departureTime,
      expectedReturnTime,
      reason,
      destination,
      urgencyLevel,
      currentWorkload,
      coverageArrangement,
      attachments
    } = req.body;

    // Validate based on leave type
    if (leaveType === 'PARTIAL' && !departureTime) {
      res.status(400).json({ message: 'Departure time required for partial day leave' });
      return;
    }

    // Update fields
    if (leaveType !== undefined) request.leaveType = leaveType;
    if (departureDate) request.departureDate = new Date(departureDate);
    if (leaveType === 'PARTIAL' && departureTime) {
      request.departureTime = departureTime;
    } else if (leaveType === 'FULL_DAY') {
      request.departureTime = undefined;
    }
    if (expectedReturnTime !== undefined) request.expectedReturnTime = expectedReturnTime;
    if (reason) request.reason = reason;
    if (destination !== undefined) request.destination = destination;
    if (urgencyLevel) request.urgencyLevel = urgencyLevel;
    if (currentWorkload !== undefined) request.currentWorkload = currentWorkload;
    if (coverageArrangement !== undefined) request.coverageArrangement = coverageArrangement;
    if (attachments !== undefined) request.attachments = attachments;

    await request.save();

    await AuditLog.create({
      requestId: request._id,
      userId: req.user.userId,
      action: 'edited',
      details: { 
        changes: req.body,
        editedAt: new Date()
      }
    });

    const updated = await EarlyDepartureRequest.findById(req.params.id)
      .populate('facultyId', 'firstName lastName email employeeId department phoneNumber role')
      .populate('hodId', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email role')
      .lean();

    if (updated) {
      const transformed: any = { ...updated };
      transformed.id = updated._id.toString();
      transformed.faculty = updated.facultyId;
      delete transformed._id;
      delete transformed.__v;
      delete transformed.facultyId;

      res.json({ 
        message: 'Request updated successfully', 
        request: transformed 
      });return;
    }
  } catch (error) {
    console.error('Edit request error:', error);
    res.status(500).json({ message: 'Server error' });return;
  }
};

// ✅ NEW: Cancel request (only PENDING requests)
export const cancelRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const { cancellationReason } = req.body;

    if (!cancellationReason || cancellationReason.trim().length < 5) {
      res.status(400).json({ 
        message: 'Cancellation reason required (minimum 5 characters)' 
      });
      return;
    }

    const request = await EarlyDepartureRequest.findById(req.params.id);
    
    if (!request) {
      res.status(404).json({ message: 'Request not found' });
      return;
    }

    // Only the faculty who created the request can cancel it
    if (request.facultyId.toString() !== req.user.userId) {
      res.status(403).json({ message: 'You can only cancel your own requests' });
      return;
    }

    // Can only cancel PENDING requests
    if (request.status !== 'PENDING') {
      res.status(400).json({ 
        message: `Cannot cancel ${request.status.toLowerCase()} requests. Only pending requests can be cancelled.`
      });
      return;
    }

    // Update status to CANCELLED (we'll add this to schema)
    request.status = 'REJECTED'; // Using REJECTED for now, or add CANCELLED status
    request.rejectionReason = `Cancelled by faculty: ${cancellationReason}`;
    request.rejectedAt = new Date();

    await request.save();

    await AuditLog.create({
      requestId: request._id,
      userId: req.user.userId,
      action: 'cancelled',
      details: { 
        cancellationReason,
        cancelledAt: new Date()
      }
    });

    const updated = await EarlyDepartureRequest.findById(req.params.id)
      .populate('facultyId', 'firstName lastName email employeeId department phoneNumber role')
      .lean();

    if (updated) {
      const transformed: any = { ...updated };
      transformed.id = updated._id.toString();
      transformed.faculty = updated.facultyId;
      delete transformed._id;
      delete transformed.__v;
      delete transformed.facultyId;

      res.json({ 
        message: 'Request cancelled successfully', 
        request: transformed 
      });return;
    }
  } catch (error) {
    console.error('Cancel request error:', error);
    res.status(500).json({ message: 'Server error' });return;
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
      const currentUser = await User.findById(req.user.userId);
      
      if (currentUser?.hasDelegatedRights()) {
        const departmentFaculty = await User.find({
          department: currentUser.department,
          role: 'FACULTY'
        }).select('_id');
        
        query.facultyId = { $in: departmentFaculty.map(f => f._id) };
      } else {
        query.facultyId = req.user.userId;
      }
      
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
      
    } else if (req.user.role === 'DEAN') {
      const dean = await User.findById(req.user.userId);
      if (!dean) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      const hodUsers = await User.find({
        role: 'HOD',
        isActive: true
      }).select('_id');

      query.facultyId = { $in: hodUsers.map(h => h._id) };
    }

    if (req.query.status) {
      query.status = req.query.status;
    }

    const requests = await EarlyDepartureRequest.find(query)
      .populate('facultyId', 'firstName lastName email employeeId department phoneNumber role')
      .populate('hodId', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email role')
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

    res.json({ requests: transformedRequests });return;
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ message: 'Server error' });return;
  }
};

export const getRequestById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const request = await EarlyDepartureRequest.findById(req.params.id)
      .populate('facultyId', 'firstName lastName email employeeId department phoneNumber role')
      .populate('hodId', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email role')
      .lean();

    if (!request) {
      res.status(404).json({ message: 'Request not found' });
      return;
    }

    const requestObj: any = request;

    if (req.user.role === 'FACULTY') {
      const currentUser = await User.findById(req.user.userId);
      const isOwnRequest = requestObj.facultyId._id.toString() === req.user.userId;
      const hasDelegatedAccess = currentUser?.hasDelegatedRights() && 
                                 currentUser.department === requestObj.facultyId.department;
      
      if (!isOwnRequest && !hasDelegatedAccess) {
        res.status(403).json({ message: 'Access denied' });
        return;
      }
    }

    if (req.user.role === 'HOD') {
      const hod = await User.findById(req.user.userId);
      if (hod && requestObj.facultyId.department !== hod.department) {
        res.status(403).json({ message: 'Access denied' });
        return;
      }
    }

    const transformed: any = { ...requestObj };
    transformed.id = requestObj._id.toString();
    transformed.faculty = requestObj.facultyId;
    delete transformed._id;
    delete transformed.__v;
    delete transformed.facultyId;

    res.json(transformed);return;
  } catch (error) {
    console.error('Get request error:', error);
    res.status(500).json({ message: 'Server error' });return;
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
      .populate('facultyId', 'department firstName lastName email role');

    if (!request) {
      res.status(404).json({ message: 'Request not found' });
      return;
    }

    if (request.status !== 'PENDING' && request.status !== 'MORE_INFO_NEEDED') {
      res.status(400).json({ message: 'Request already processed' });
      return;
    }

    const currentUser = await User.findById(req.user.userId);
    if (!currentUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const facultyObj = request.toObject().facultyId as any;
    
    // Authorization checks
    if (currentUser.role === 'FACULTY') {
      if (request.facultyId.toString() === req.user.userId) {
        res.status(403).json({ message: 'Cannot approve your own request' });
        return;
      }
      
      if (!currentUser.hasDelegatedRights()) {
        res.status(403).json({ message: 'No delegation rights' });
        return;
      }
      
      if (!currentUser.delegationPermissions?.includes('approve_requests')) {
        res.status(403).json({ message: 'Missing approval permission' });
        return;
      }
      
      if (currentUser.department !== facultyObj.department) {
        res.status(403).json({ message: 'Can only approve requests from your department' });
        return;
      }
    }

    // DEAN can only approve HOD requests
    if (currentUser.role === 'DEAN' && facultyObj.role !== 'HOD') {
      res.status(403).json({ message: 'Dean can only approve HOD requests' });
      return;
    }

    // HOD cannot approve other HOD requests
    if (currentUser.role === 'HOD' && facultyObj.role === 'HOD') {
      res.status(403).json({ message: 'HOD cannot approve requests from other HODs' });
      return;
    }

    const exitPassNumber = `EP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    const qrData = JSON.stringify({
      exitPassNumber,
      facultyName: `${facultyObj.firstName} ${facultyObj.lastName}`,
      department: facultyObj.department,
      role: facultyObj.role,
      leaveType: request.leaveType,
      departureDate: request.departureDate.toLocaleDateString('en-IN'),
      departureTime: request.leaveType === 'PARTIAL' ? request.departureTime : 'Full Day',
      reason: request.reason,
      approvedAt: new Date().toLocaleString('en-IN'),
      approvedBy: `${currentUser.firstName} ${currentUser.lastName}`,
      approvedByRole: currentUser.role === 'HOD' ? 'HOD' : currentUser.role === 'DEAN' ? 'DEAN' : 'Delegated Faculty'
    });
    const qrCode = await QRCode.toDataURL(qrData);

    request.status = 'APPROVED';
    request.hodId = req.user.userId as any;
    request.approvedBy = req.user.userId as any;
    request.approvedByRole = currentUser.role === 'HOD' ? 'HOD' : currentUser.role === 'DEAN' ? 'DEAN' : 'DELEGATED_FACULTY';
    request.approvedAt = new Date();
    request.hodComments = hodComments;
    request.exitPassNumber = exitPassNumber;
    request.qrCode = qrCode;

    await request.save();

    await AuditLog.create({
      requestId: request._id,
      userId: req.user.userId,
      action: 'approved',
      details: { 
        exitPassNumber,
        approvedByRole: request.approvedByRole
      }
    });

    try {
      const timeDisplay = request.leaveType === 'FULL_DAY' ? 'Full Day' : request.departureTime || 'N/A';
      
      await sendApprovedEmail(
        facultyObj.email,
        `${facultyObj.firstName} ${facultyObj.lastName}`,
        exitPassNumber,
        request.departureDate.toLocaleDateString('en-IN'),
        timeDisplay,
        hodComments || 'None',
        qrCode
      );
    } catch (emailErr: any) {
      console.error('Approval email error (non-fatal):', emailErr.message);
    }

    const updated = await EarlyDepartureRequest.findById(req.params.id)
      .populate('facultyId', 'firstName lastName email employeeId department phoneNumber role')
      .populate('hodId', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email role')
      .lean();

    if (updated) {
      const transformed: any = { ...updated };
      transformed.id = updated._id.toString();
      transformed.faculty = updated.facultyId;
      delete transformed._id;
      delete transformed.__v;
      delete transformed.facultyId;

      res.json({ message: 'Request approved', request: transformed });return;
    }
  } catch (error) {
    console.error('Approve error:', error);
    res.status(500).json({ message: 'Server error' });return;
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
      .populate('facultyId', 'department firstName lastName email role');

    if (!request) {
      res.status(404).json({ message: 'Request not found' });
      return;
    }

    const currentUser = await User.findById(req.user.userId);
    if (!currentUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const facultyObj = request.toObject().facultyId as any;
    
    if (currentUser.role === 'FACULTY') {
      if (request.facultyId.toString() === req.user.userId) {
        res.status(403).json({ message: 'Cannot reject your own request' });
        return;
      }
      
      if (!currentUser.hasDelegatedRights()) {
        res.status(403).json({ message: 'No delegation rights' });
        return;
      }
      
      if (!currentUser.delegationPermissions?.includes('reject_requests')) {
        res.status(403).json({ message: 'Missing rejection permission' });
        return;
      }
    }

    request.status = 'REJECTED';
    request.hodId = req.user.userId as any;
    request.approvedBy = req.user.userId as any;
    request.approvedByRole = currentUser.role === 'HOD' ? 'HOD' : currentUser.role === 'DEAN' ? 'DEAN' : 'DELEGATED_FACULTY';
    request.rejectedAt = new Date();
    request.rejectionReason = rejectionReason;
    request.hodComments = hodComments;

    await request.save();

    await AuditLog.create({
      requestId: request._id,
      userId: req.user.userId,
      action: 'rejected',
      details: { 
        rejectionReason,
        rejectedByRole: request.approvedByRole
      }
    });

    try {
      const timeDisplay = request.leaveType === 'FULL_DAY' ? 'Full Day' : request.departureTime || 'N/A';
      
      await sendRejectedEmail(
        facultyObj.email,
        `${facultyObj.firstName} ${facultyObj.lastName}`,
        request.departureDate.toLocaleDateString('en-IN'),
        timeDisplay,
        rejectionReason,
        hodComments || 'None'
      );
    } catch (emailErr: any) {
      console.error('Rejection email error (non-fatal):', emailErr.message);
    }

    const updated = await EarlyDepartureRequest.findById(req.params.id)
      .populate('facultyId', 'firstName lastName email employeeId department phoneNumber role')
      .populate('hodId', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email role')
      .lean();

    if (updated) {
      const transformed: any = { ...updated };
      transformed.id = updated._id.toString();
      transformed.faculty = updated.facultyId;
      delete transformed._id;
      delete transformed.__v;
      delete transformed.facultyId;

      res.json({ message: 'Request rejected', request: transformed });return;
    }
  } catch (error) {
    console.error('Reject error:', error);
    res.status(500).json({ message: 'Server error' });return;
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

    const currentUser = await User.findById(req.user.userId);
    if (currentUser?.role === 'FACULTY') {
      if (!currentUser.hasDelegatedRights()) {
        res.status(403).json({ message: 'No delegation rights' });
        return;
      }
      
      if (!currentUser.delegationPermissions?.includes('request_more_info')) {
        res.status(403).json({ message: 'Missing request_more_info permission' });
        return;
      }
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
      .populate('facultyId', 'firstName lastName email employeeId department phoneNumber role')
      .populate('hodId', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email role')
      .lean();

    if (updated) {
      const transformed: any = { ...updated };
      transformed.id = updated._id.toString();
      transformed.faculty = updated.facultyId;
      delete transformed._id;
      delete transformed.__v;
      delete transformed.facultyId;

      res.json({ message: 'More info requested', request: transformed });return;
    }
  } catch (error) {
    console.error('More info error:', error);
    res.status(500).json({ message: 'Server error' });return;
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

      res.status(201).json({ message: 'Comment added', comment: transformed });return;
    }
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Server error' });return;
  }
};
