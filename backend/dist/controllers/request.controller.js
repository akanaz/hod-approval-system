"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addComment = exports.requestMoreInfo = exports.rejectRequest = exports.approveRequest = exports.getRequestById = exports.getRequests = exports.cancelRequest = exports.editRequest = exports.createRequest = void 0;
const EarlyDepartureRequest_1 = __importDefault(require("../models/EarlyDepartureRequest"));
const User_1 = __importDefault(require("../models/User"));
const models_1 = require("../models");
const qrcode_1 = __importDefault(require("qrcode"));
const email_1 = require("../utils/email");
const createRequest = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authenticated' });
            return;
        }
        const { leaveType, departureDate, departureTime, expectedReturnTime, reason, destination, urgencyLevel, currentWorkload, coverageArrangement, attachments } = req.body;
        if (!departureDate || !reason || !leaveType) {
            res.status(400).json({ message: 'Missing required fields' });
            return;
        }
        if (leaveType === 'PARTIAL' && !departureTime) {
            res.status(400).json({ message: 'Departure time required for partial day leave' });
            return;
        }
        const faculty = await User_1.default.findById(req.user.userId);
        if (!faculty) {
            res.status(404).json({ message: 'Faculty not found' });
            return;
        }
        const request = await EarlyDepartureRequest_1.default.create({
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
        await models_1.AuditLog.create({
            requestId: request._id,
            userId: req.user.userId,
            action: 'created',
            details: {
                urgencyLevel: request.urgencyLevel,
                leaveType: request.leaveType,
                attachmentCount: attachments?.length || 0
            }
        });
        try {
            let approver;
            if (faculty.role === 'HOD') {
                approver = await User_1.default.findOne({
                    role: 'DEAN',
                    isActive: true
                });
            }
            else {
                approver = await User_1.default.findOne({
                    department: faculty.department,
                    role: 'HOD',
                    isActive: true
                });
            }
            if (approver && approver.email) {
                const timeDisplay = leaveType === 'FULL_DAY' ? 'Full Day' : departureTime;
                await (0, email_1.sendNewRequestEmail)(approver.email, `${approver.firstName} ${approver.lastName}`, `${faculty.firstName} ${faculty.lastName}`, faculty.email, faculty.department, new Date(departureDate).toLocaleDateString('en-IN'), timeDisplay, urgencyLevel || 'MEDIUM', reason);
            }
            else {
                console.warn(`⚠️  No approver found for ${faculty.role} in ${faculty.department}`);
            }
        }
        catch (emailErr) {
            console.error('Email error (non-fatal):', emailErr.message);
        }
        const populatedRequest = await EarlyDepartureRequest_1.default.findById(request._id)
            .populate('facultyId', 'firstName lastName email employeeId department phoneNumber role')
            .lean();
        if (populatedRequest) {
            const transformed = { ...populatedRequest };
            transformed.id = transformed._id.toString();
            delete transformed._id;
            delete transformed.__v;
            res.status(201).json({
                message: 'Request created successfully',
                request: transformed
            });
            return;
        }
    }
    catch (error) {
        console.error('Create request error:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((err) => err.message);
            res.status(400).json({
                message: messages.join(', ')
            });
            return;
        }
        res.status(500).json({ message: 'Server error' });
        return;
    }
};
exports.createRequest = createRequest;
const editRequest = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authenticated' });
            return;
        }
        const request = await EarlyDepartureRequest_1.default.findById(req.params.id);
        if (!request) {
            res.status(404).json({ message: 'Request not found' });
            return;
        }
        if (request.facultyId.toString() !== req.user.userId) {
            res.status(403).json({ message: 'You can only edit your own requests' });
            return;
        }
        if (request.status !== 'PENDING') {
            res.status(400).json({
                message: `Cannot edit ${request.status.toLowerCase()} requests. Only pending requests can be edited.`
            });
            return;
        }
        const { leaveType, departureDate, departureTime, expectedReturnTime, reason, destination, urgencyLevel, currentWorkload, coverageArrangement, attachments } = req.body;
        if (leaveType === 'PARTIAL' && !departureTime) {
            res.status(400).json({ message: 'Departure time required for partial day leave' });
            return;
        }
        if (leaveType !== undefined)
            request.leaveType = leaveType;
        if (departureDate)
            request.departureDate = new Date(departureDate);
        if (leaveType === 'PARTIAL' && departureTime) {
            request.departureTime = departureTime;
        }
        else if (leaveType === 'FULL_DAY') {
            request.departureTime = undefined;
        }
        if (expectedReturnTime !== undefined)
            request.expectedReturnTime = expectedReturnTime;
        if (reason)
            request.reason = reason;
        if (destination !== undefined)
            request.destination = destination;
        if (urgencyLevel)
            request.urgencyLevel = urgencyLevel;
        if (currentWorkload !== undefined)
            request.currentWorkload = currentWorkload;
        if (coverageArrangement !== undefined)
            request.coverageArrangement = coverageArrangement;
        if (attachments !== undefined)
            request.attachments = attachments;
        await request.save();
        await models_1.AuditLog.create({
            requestId: request._id,
            userId: req.user.userId,
            action: 'edited',
            details: {
                changes: req.body,
                editedAt: new Date()
            }
        });
        const updated = await EarlyDepartureRequest_1.default.findById(req.params.id)
            .populate('facultyId', 'firstName lastName email employeeId department phoneNumber role')
            .populate('hodId', 'firstName lastName email')
            .populate('approvedBy', 'firstName lastName email role')
            .lean();
        if (updated) {
            const transformed = { ...updated };
            transformed.id = updated._id.toString();
            transformed.faculty = updated.facultyId;
            delete transformed._id;
            delete transformed.__v;
            delete transformed.facultyId;
            res.json({
                message: 'Request updated successfully',
                request: transformed
            });
            return;
        }
    }
    catch (error) {
        console.error('Edit request error:', error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
};
exports.editRequest = editRequest;
const cancelRequest = async (req, res) => {
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
        const request = await EarlyDepartureRequest_1.default.findById(req.params.id);
        if (!request) {
            res.status(404).json({ message: 'Request not found' });
            return;
        }
        if (request.facultyId.toString() !== req.user.userId) {
            res.status(403).json({ message: 'You can only cancel your own requests' });
            return;
        }
        if (request.status !== 'PENDING') {
            res.status(400).json({
                message: `Cannot cancel ${request.status.toLowerCase()} requests. Only pending requests can be cancelled.`
            });
            return;
        }
        request.status = 'REJECTED';
        request.rejectionReason = `Cancelled by faculty: ${cancellationReason}`;
        request.rejectedAt = new Date();
        await request.save();
        await models_1.AuditLog.create({
            requestId: request._id,
            userId: req.user.userId,
            action: 'cancelled',
            details: {
                cancellationReason,
                cancelledAt: new Date()
            }
        });
        const updated = await EarlyDepartureRequest_1.default.findById(req.params.id)
            .populate('facultyId', 'firstName lastName email employeeId department phoneNumber role')
            .lean();
        if (updated) {
            const transformed = { ...updated };
            transformed.id = updated._id.toString();
            transformed.faculty = updated.facultyId;
            delete transformed._id;
            delete transformed.__v;
            delete transformed.facultyId;
            res.json({
                message: 'Request cancelled successfully',
                request: transformed
            });
            return;
        }
    }
    catch (error) {
        console.error('Cancel request error:', error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
};
exports.cancelRequest = cancelRequest;
const getRequests = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authenticated' });
            return;
        }
        let query = {};
        if (req.user.role === 'FACULTY') {
            const currentUser = await User_1.default.findById(req.user.userId);
            if (currentUser?.hasDelegatedRights()) {
                const departmentFaculty = await User_1.default.find({
                    department: currentUser.department,
                    role: 'FACULTY'
                }).select('_id');
                query.facultyId = { $in: departmentFaculty.map(f => f._id) };
            }
            else {
                query.facultyId = req.user.userId;
            }
        }
        else if (req.user.role === 'HOD') {
            const hod = await User_1.default.findById(req.user.userId);
            if (!hod) {
                res.status(404).json({ message: 'User not found' });
                return;
            }
            const departmentFaculty = await User_1.default.find({
                department: hod.department,
                role: 'FACULTY'
            }).select('_id');
            query.facultyId = { $in: departmentFaculty.map(f => f._id) };
        }
        else if (req.user.role === 'DEAN') {
            const dean = await User_1.default.findById(req.user.userId);
            if (!dean) {
                res.status(404).json({ message: 'User not found' });
                return;
            }
            const hodUsers = await User_1.default.find({
                role: 'HOD',
                isActive: true
            }).select('_id');
            query.facultyId = { $in: hodUsers.map(h => h._id) };
        }
        if (req.query.status) {
            query.status = req.query.status;
        }
        const requests = await EarlyDepartureRequest_1.default.find(query)
            .populate('facultyId', 'firstName lastName email employeeId department phoneNumber role')
            .populate('hodId', 'firstName lastName email')
            .populate('approvedBy', 'firstName lastName email role')
            .sort({ submittedAt: -1 })
            .lean();
        const transformedRequests = requests.map(r => {
            const obj = { ...r };
            obj.id = r._id.toString();
            obj.faculty = obj.facultyId;
            delete obj._id;
            delete obj.__v;
            delete obj.facultyId;
            return obj;
        });
        res.json({ requests: transformedRequests });
        return;
    }
    catch (error) {
        console.error('Get requests error:', error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
};
exports.getRequests = getRequests;
const getRequestById = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authenticated' });
            return;
        }
        const request = await EarlyDepartureRequest_1.default.findById(req.params.id)
            .populate('facultyId', 'firstName lastName email employeeId department phoneNumber role')
            .populate('hodId', 'firstName lastName email')
            .populate('approvedBy', 'firstName lastName email role')
            .lean();
        if (!request) {
            res.status(404).json({ message: 'Request not found' });
            return;
        }
        const requestObj = request;
        if (req.user.role === 'FACULTY') {
            const currentUser = await User_1.default.findById(req.user.userId);
            const isOwnRequest = requestObj.facultyId._id.toString() === req.user.userId;
            const hasDelegatedAccess = currentUser?.hasDelegatedRights() &&
                currentUser.department === requestObj.facultyId.department;
            if (!isOwnRequest && !hasDelegatedAccess) {
                res.status(403).json({ message: 'Access denied' });
                return;
            }
        }
        if (req.user.role === 'HOD') {
            const hod = await User_1.default.findById(req.user.userId);
            if (hod && requestObj.facultyId.department !== hod.department) {
                res.status(403).json({ message: 'Access denied' });
                return;
            }
        }
        const transformed = { ...requestObj };
        transformed.id = requestObj._id.toString();
        transformed.faculty = requestObj.facultyId;
        delete transformed._id;
        delete transformed.__v;
        delete transformed.facultyId;
        res.json(transformed);
        return;
    }
    catch (error) {
        console.error('Get request error:', error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
};
exports.getRequestById = getRequestById;
const approveRequest = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authenticated' });
            return;
        }
        const { hodComments } = req.body;
        const request = await EarlyDepartureRequest_1.default.findById(req.params.id)
            .populate('facultyId', 'department firstName lastName email role');
        if (!request) {
            res.status(404).json({ message: 'Request not found' });
            return;
        }
        if (request.status !== 'PENDING' && request.status !== 'MORE_INFO_NEEDED') {
            res.status(400).json({ message: 'Request already processed' });
            return;
        }
        const currentUser = await User_1.default.findById(req.user.userId);
        if (!currentUser) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const facultyObj = request.toObject().facultyId;
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
        if (currentUser.role === 'DEAN' && facultyObj.role !== 'HOD') {
            res.status(403).json({ message: 'Dean can only approve HOD requests' });
            return;
        }
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
        const qrCode = await qrcode_1.default.toDataURL(qrData);
        request.status = 'APPROVED';
        request.hodId = req.user.userId;
        request.approvedBy = req.user.userId;
        request.approvedByRole = currentUser.role === 'HOD' ? 'HOD' : currentUser.role === 'DEAN' ? 'DEAN' : 'DELEGATED_FACULTY';
        request.approvedAt = new Date();
        request.hodComments = hodComments;
        request.exitPassNumber = exitPassNumber;
        request.qrCode = qrCode;
        await request.save();
        await models_1.AuditLog.create({
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
            await (0, email_1.sendApprovedEmail)(facultyObj.email, `${facultyObj.firstName} ${facultyObj.lastName}`, exitPassNumber, request.departureDate.toLocaleDateString('en-IN'), timeDisplay, hodComments || 'None', qrCode);
        }
        catch (emailErr) {
            console.error('Approval email error (non-fatal):', emailErr.message);
        }
        const updated = await EarlyDepartureRequest_1.default.findById(req.params.id)
            .populate('facultyId', 'firstName lastName email employeeId department phoneNumber role')
            .populate('hodId', 'firstName lastName email')
            .populate('approvedBy', 'firstName lastName email role')
            .lean();
        if (updated) {
            const transformed = { ...updated };
            transformed.id = updated._id.toString();
            transformed.faculty = updated.facultyId;
            delete transformed._id;
            delete transformed.__v;
            delete transformed.facultyId;
            res.json({ message: 'Request approved', request: transformed });
            return;
        }
    }
    catch (error) {
        console.error('Approve error:', error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
};
exports.approveRequest = approveRequest;
const rejectRequest = async (req, res) => {
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
        const request = await EarlyDepartureRequest_1.default.findById(req.params.id)
            .populate('facultyId', 'department firstName lastName email role');
        if (!request) {
            res.status(404).json({ message: 'Request not found' });
            return;
        }
        const currentUser = await User_1.default.findById(req.user.userId);
        if (!currentUser) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const facultyObj = request.toObject().facultyId;
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
        request.hodId = req.user.userId;
        request.approvedBy = req.user.userId;
        request.approvedByRole = currentUser.role === 'HOD' ? 'HOD' : currentUser.role === 'DEAN' ? 'DEAN' : 'DELEGATED_FACULTY';
        request.rejectedAt = new Date();
        request.rejectionReason = rejectionReason;
        request.hodComments = hodComments;
        await request.save();
        await models_1.AuditLog.create({
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
            await (0, email_1.sendRejectedEmail)(facultyObj.email, `${facultyObj.firstName} ${facultyObj.lastName}`, request.departureDate.toLocaleDateString('en-IN'), timeDisplay, rejectionReason, hodComments || 'None');
        }
        catch (emailErr) {
            console.error('Rejection email error (non-fatal):', emailErr.message);
        }
        const updated = await EarlyDepartureRequest_1.default.findById(req.params.id)
            .populate('facultyId', 'firstName lastName email employeeId department phoneNumber role')
            .populate('hodId', 'firstName lastName email')
            .populate('approvedBy', 'firstName lastName email role')
            .lean();
        if (updated) {
            const transformed = { ...updated };
            transformed.id = updated._id.toString();
            transformed.faculty = updated.facultyId;
            delete transformed._id;
            delete transformed.__v;
            delete transformed.facultyId;
            res.json({ message: 'Request rejected', request: transformed });
            return;
        }
    }
    catch (error) {
        console.error('Reject error:', error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
};
exports.rejectRequest = rejectRequest;
const requestMoreInfo = async (req, res) => {
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
        const request = await EarlyDepartureRequest_1.default.findById(req.params.id)
            .populate('facultyId', 'firstName lastName email');
        if (!request) {
            res.status(404).json({ message: 'Request not found' });
            return;
        }
        const currentUser = await User_1.default.findById(req.user.userId);
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
        request.hodId = req.user.userId;
        request.hodComments = hodComments;
        await request.save();
        await models_1.AuditLog.create({
            requestId: request._id,
            userId: req.user.userId,
            action: 'requested_more_info',
            details: { hodComments }
        });
        const updated = await EarlyDepartureRequest_1.default.findById(req.params.id)
            .populate('facultyId', 'firstName lastName email employeeId department phoneNumber role')
            .populate('hodId', 'firstName lastName email')
            .populate('approvedBy', 'firstName lastName email role')
            .lean();
        if (updated) {
            const transformed = { ...updated };
            transformed.id = updated._id.toString();
            transformed.faculty = updated.facultyId;
            delete transformed._id;
            delete transformed.__v;
            delete transformed.facultyId;
            res.json({ message: 'More info requested', request: transformed });
            return;
        }
    }
    catch (error) {
        console.error('More info error:', error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
};
exports.requestMoreInfo = requestMoreInfo;
const addComment = async (req, res) => {
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
        const comment = await models_1.Comment.create({
            requestId: req.params.id,
            userId: req.user.userId,
            content,
            isInternal: isInternal || false
        });
        const populated = await models_1.Comment.findById(comment._id)
            .populate('userId', 'firstName lastName role')
            .lean();
        if (populated) {
            const transformed = { ...populated };
            transformed.id = populated._id.toString();
            delete transformed._id;
            delete transformed.__v;
            res.status(201).json({ message: 'Comment added', comment: transformed });
            return;
        }
    }
    catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
};
exports.addComment = addComment;
//# sourceMappingURL=request.controller.js.map