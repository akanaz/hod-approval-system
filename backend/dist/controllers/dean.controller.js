"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllHODs = exports.getHODRequests = exports.getDeanDashboard = void 0;
const User_1 = __importDefault(require("../models/User"));
const EarlyDepartureRequest_1 = __importDefault(require("../models/EarlyDepartureRequest"));
const getDeanDashboard = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'DEAN') {
            res.status(403).json({ message: 'Only Deans can access this dashboard' });
            return;
        }
        const hods = await User_1.default.find({ role: 'HOD', isActive: true }).select('_id');
        const hodIds = hods.map(h => h._id);
        const requests = await EarlyDepartureRequest_1.default.find({
            facultyId: { $in: hodIds }
        }).lean();
        const statistics = {
            totalRequests: requests.length,
            pendingRequests: requests.filter(r => r.status === 'PENDING').length,
            approvedRequests: requests.filter(r => r.status === 'APPROVED').length,
            rejectedRequests: requests.filter(r => r.status === 'REJECTED').length
        };
        res.json(statistics);
        return;
    }
    catch (error) {
        console.error('Get dean dashboard error:', error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
};
exports.getDeanDashboard = getDeanDashboard;
const getHODRequests = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'DEAN') {
            res.status(403).json({ message: 'Only Deans can view HOD requests' });
            return;
        }
        const hods = await User_1.default.find({ role: 'HOD', isActive: true }).select('_id');
        const hodIds = hods.map(h => h._id);
        let query = { facultyId: { $in: hodIds } };
        if (req.query.status && req.query.status !== 'all') {
            query.status = req.query.status.toUpperCase();
        }
        const requests = await EarlyDepartureRequest_1.default.find(query)
            .populate('facultyId', 'firstName lastName email employeeId department phoneNumber role')
            .populate('approvedBy', 'firstName lastName email role')
            .sort({ submittedAt: -1 })
            .lean();
        const transformedRequests = requests.map(r => ({
            id: r._id.toString(),
            faculty: {
                _id: r.facultyId._id.toString(),
                firstName: r.facultyId.firstName,
                lastName: r.facultyId.lastName,
                email: r.facultyId.email,
                employeeId: r.facultyId.employeeId,
                department: r.facultyId.department,
                phoneNumber: r.facultyId.phoneNumber
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
        res.json({ requests: transformedRequests });
        return;
    }
    catch (error) {
        console.error('Get HOD requests error:', error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
};
exports.getHODRequests = getHODRequests;
const getAllHODs = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'DEAN') {
            res.status(403).json({ message: 'Only Deans can view HODs' });
            return;
        }
        const hods = await User_1.default.find({ role: 'HOD', isActive: true })
            .select('firstName lastName email employeeId department phoneNumber createdAt')
            .lean();
        const hodsWithStats = await Promise.all(hods.map(async (hod) => {
            const requests = await EarlyDepartureRequest_1.default.find({
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
        }));
        res.json({ hods: hodsWithStats });
        return;
    }
    catch (error) {
        console.error('Get HODs error:', error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
};
exports.getAllHODs = getAllHODs;
//# sourceMappingURL=dean.controller.js.map