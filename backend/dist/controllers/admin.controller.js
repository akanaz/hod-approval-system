"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActivityLogs = exports.deleteUser = exports.toggleUserStatus = exports.getAllUsers = exports.createUser = exports.getAdminDashboard = void 0;
const User_1 = __importDefault(require("../models/User"));
const EarlyDepartureRequest_1 = __importDefault(require("../models/EarlyDepartureRequest"));
const models_1 = require("../models");
const getAdminDashboard = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'ADMIN') {
            res.status(403).json({ message: 'Only admins can access this dashboard' });
            return;
        }
        const users = await User_1.default.find().lean();
        const requests = await EarlyDepartureRequest_1.default.find().lean();
        const faculty = users.filter(u => u.role === 'FACULTY');
        const hods = users.filter(u => u.role === 'HOD');
        const admins = users.filter(u => u.role === 'ADMIN');
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
        const urgencyLevels = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
        const urgencyBreakdown = urgencyLevels.map(level => ({
            urgency: level,
            count: requests.filter(r => r.urgencyLevel === level).length,
        }));
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
        const facultyStats = faculty.map(f => {
            const facultyRequests = requests.filter(r => r.facultyId.toString() === f._id.toString());
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
        const approvedRequests = requests.filter(r => r.status === 'APPROVED' && r.approvedAt && r.submittedAt);
        let avgApprovalTimeHours = 0;
        if (approvedRequests.length > 0) {
            const totalHours = approvedRequests.reduce((sum, r) => {
                const submitted = new Date(r.submittedAt).getTime();
                const approved = new Date(r.approvedAt).getTime();
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
        });
        return;
    }
    catch (error) {
        console.error('Get admin dashboard error:', error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
};
exports.getAdminDashboard = getAdminDashboard;
const createUser = async (req, res) => {
    try {
        const { email, password, firstName, lastName, employeeId, department, role, phoneNumber } = req.body;
        if (!['FACULTY', 'HOD'].includes(role)) {
            res.status(400).json({ message: 'Only FACULTY or HOD roles are allowed' });
            return;
        }
        if (!password || password.length < 6) {
            res.status(400).json({ message: 'Password must be at least 6 characters long' });
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            res.status(400).json({ message: 'Invalid email format' });
            return;
        }
        const emailExists = await User_1.default.findOne({ email });
        if (emailExists) {
            res.status(409).json({ message: 'Email already exists' });
            return;
        }
        const empExists = await User_1.default.findOne({ employeeId });
        if (empExists) {
            res.status(409).json({ message: 'Employee ID already exists' });
            return;
        }
        if (role === 'HOD') {
            const existingHOD = await User_1.default.findOne({
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
        const user = await User_1.default.create({
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
        });
        return;
    }
    catch (err) {
        console.error('Create user error:', err);
        if (err.name === 'ValidationError') {
            res.status(400).json({ message: err.message });
            return;
        }
        res.status(500).json({ message: 'Server error' });
        return;
    }
};
exports.createUser = createUser;
const getAllUsers = async (_req, res) => {
    try {
        const users = await User_1.default.find()
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
        res.json({ users: formattedUsers });
        return;
    }
    catch (err) {
        console.error('Get users error:', err);
        res.status(500).json({ message: 'Server error' });
        return;
    }
};
exports.getAllUsers = getAllUsers;
const toggleUserStatus = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.params.id);
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
        });
        return;
    }
    catch (err) {
        console.error('Toggle user error:', err);
        res.status(500).json({ message: 'Server error' });
        return;
    }
};
exports.toggleUserStatus = toggleUserStatus;
const deleteUser = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.params.id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        if (user.role === 'ADMIN') {
            res.status(403).json({ message: 'Cannot delete admin accounts' });
            return;
        }
        await User_1.default.findByIdAndDelete(req.params.id);
        res.json({
            message: `${user.role} deleted successfully`,
        });
        return;
    }
    catch (err) {
        console.error('Delete user error:', err);
        res.status(500).json({ message: 'Server error' });
        return;
    }
};
exports.deleteUser = deleteUser;
const getActivityLogs = async (_req, res) => {
    try {
        const logs = await models_1.AuditLog.find()
            .sort({ createdAt: -1 })
            .limit(50)
            .populate('userId', 'firstName lastName role')
            .lean();
        const formattedLogs = logs.map(log => ({
            id: log._id.toString(),
            action: log.action,
            user: `${log.userId.firstName} ${log.userId.lastName}`,
            role: log.userId.role,
            timestamp: log.createdAt,
            details: log.details || 'No details'
        }));
        res.json({ logs: formattedLogs });
        return;
    }
    catch (error) {
        console.error('Get activity logs error:', error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
};
exports.getActivityLogs = getActivityLogs;
//# sourceMappingURL=admin.controller.js.map