"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extendDelegation = exports.revokeDelegation = exports.delegateRights = exports.getMyDelegations = exports.getEligibleFaculty = void 0;
const User_1 = __importDefault(require("../models/User"));
const models_1 = require("../models");
const getEligibleFaculty = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'HOD') {
            res.status(403).json({ message: 'Only HODs can view eligible faculty' });
            return;
        }
        const hod = await User_1.default.findById(req.user.userId);
        if (!hod) {
            res.status(404).json({ message: 'HOD not found' });
            return;
        }
        const eligibleFaculty = await User_1.default.find({
            department: hod.department,
            role: 'FACULTY',
            isActive: true,
            $or: [
                { delegatedBy: null },
                { delegatedBy: { $exists: false } },
                { delegationEndDate: { $lt: new Date() } }
            ]
        })
            .select('firstName lastName email employeeId phoneNumber')
            .lean();
        const faculty = eligibleFaculty.map(f => ({
            id: f._id.toString(),
            _id: f._id.toString(),
            firstName: f.firstName,
            lastName: f.lastName,
            email: f.email,
            employeeId: f.employeeId,
            phoneNumber: f.phoneNumber,
            department: hod.department
        }));
        res.json({ faculty });
        return;
    }
    catch (error) {
        console.error('Get eligible faculty error:', error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
};
exports.getEligibleFaculty = getEligibleFaculty;
const getMyDelegations = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'HOD') {
            res.status(403).json({ message: 'Only HODs can view delegations' });
            return;
        }
        const delegatedFaculty = await User_1.default.find({
            delegatedBy: req.user.userId,
            delegationEndDate: { $gte: new Date() }
        })
            .select('firstName lastName email employeeId delegationStartDate delegationEndDate delegationPermissions')
            .lean();
        const delegations = delegatedFaculty.map(f => ({
            id: f._id.toString(),
            _id: f._id.toString(),
            facultyId: {
                _id: f._id.toString(),
                id: f._id.toString(),
                firstName: f.firstName,
                lastName: f.lastName,
                email: f.email,
                employeeId: f.employeeId
            },
            startDate: f.delegationStartDate,
            endDate: f.delegationEndDate,
            permissions: f.delegationPermissions || [],
            isActive: f.delegationEndDate && f.delegationEndDate >= new Date()
        }));
        console.log('Found delegations:', delegations.length);
        res.json({ delegations });
        return;
    }
    catch (error) {
        console.error('Get delegations error:', error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
};
exports.getMyDelegations = getMyDelegations;
const delegateRights = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'HOD') {
            res.status(403).json({ message: 'Only HODs can delegate rights' });
            return;
        }
        const { facultyId, startDate, endDate, permissions } = req.body;
        if (!facultyId || !startDate || !endDate || !permissions || permissions.length === 0) {
            res.status(400).json({ message: 'Missing required fields' });
            return;
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        new Date();
        if (end <= start) {
            res.status(400).json({ message: 'End date must be after start date' });
            return;
        }
        const hod = await User_1.default.findById(req.user.userId);
        if (!hod) {
            res.status(404).json({ message: 'HOD not found' });
            return;
        }
        const faculty = await User_1.default.findById(facultyId);
        if (!faculty) {
            res.status(404).json({ message: 'Faculty not found' });
            return;
        }
        if (faculty.department !== hod.department) {
            res.status(400).json({ message: 'Can only delegate to faculty in your department' });
            return;
        }
        if (faculty.role !== 'FACULTY') {
            res.status(400).json({ message: 'Can only delegate to users with FACULTY role' });
            return;
        }
        if (faculty.hasDelegatedRights()) {
            res.status(400).json({
                message: `${faculty.firstName} ${faculty.lastName} already has delegated rights`
            });
            return;
        }
        faculty.delegatedBy = hod._id;
        faculty.delegationStartDate = start;
        faculty.delegationEndDate = end;
        faculty.delegationPermissions = permissions;
        await faculty.save();
        try {
            await models_1.AuditLog.create({
                requestId: faculty._id,
                userId: req.user.userId,
                action: 'delegation_granted',
                details: {
                    delegatedTo: facultyId,
                    delegatedToName: `${faculty.firstName} ${faculty.lastName}`,
                    startDate,
                    endDate,
                    permissions
                }
            });
        }
        catch (auditError) {
            console.error('Audit log error:', auditError);
        }
        res.json({
            message: 'Rights delegated successfully',
            delegation: {
                id: faculty._id.toString(),
                facultyId: {
                    _id: faculty._id.toString(),
                    firstName: faculty.firstName,
                    lastName: faculty.lastName,
                    email: faculty.email
                },
                startDate: faculty.delegationStartDate,
                endDate: faculty.delegationEndDate,
                permissions: faculty.delegationPermissions
            }
        });
        return;
    }
    catch (error) {
        console.error('Delegate rights error:', error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
};
exports.delegateRights = delegateRights;
const revokeDelegation = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'HOD') {
            res.status(403).json({ message: 'Only HODs can revoke delegation' });
            return;
        }
        const { facultyId } = req.params;
        const faculty = await User_1.default.findById(facultyId);
        if (!faculty) {
            res.status(404).json({ message: 'Faculty not found' });
            return;
        }
        if (!faculty.delegatedBy || faculty.delegatedBy.toString() !== req.user.userId) {
            res.status(403).json({ message: 'Can only revoke delegation you granted' });
            return;
        }
        console.log('Revoking delegation for:', faculty.email);
        await User_1.default.findByIdAndUpdate(facultyId, {
            $unset: {
                delegatedBy: 1,
                delegationStartDate: 1,
                delegationEndDate: 1
            },
            $set: {
                delegationPermissions: []
            }
        });
        res.json({ message: 'Delegation revoked successfully' });
        return;
    }
    catch (error) {
        console.error('Revoke delegation error:', error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
};
exports.revokeDelegation = revokeDelegation;
const extendDelegation = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'HOD') {
            res.status(403).json({ message: 'Only HODs can extend delegation' });
            return;
        }
        const { facultyId } = req.params;
        const { newEndDate } = req.body;
        if (!newEndDate) {
            res.status(400).json({ message: 'New end date required' });
            return;
        }
        const faculty = await User_1.default.findById(facultyId);
        if (!faculty) {
            res.status(404).json({ message: 'Faculty not found' });
            return;
        }
        if (faculty.delegatedBy?.toString() !== req.user.userId) {
            res.status(403).json({ message: 'Can only extend delegation you granted' });
            return;
        }
        const newEnd = new Date(newEndDate);
        const currentEnd = faculty.delegationEndDate;
        if (!currentEnd) {
            res.status(400).json({ message: 'No active delegation to extend' });
            return;
        }
        if (newEnd <= currentEnd) {
            res.status(400).json({ message: 'New end date must be after current end date' });
            return;
        }
        const previousEndDate = faculty.delegationEndDate;
        faculty.delegationEndDate = newEnd;
        await faculty.save();
        try {
            await models_1.AuditLog.create({
                requestId: faculty._id,
                userId: req.user.userId,
                action: 'delegation_extended',
                details: {
                    facultyId,
                    facultyName: `${faculty.firstName} ${faculty.lastName}`,
                    previousEndDate,
                    newEndDate
                }
            });
        }
        catch (auditError) {
            console.error('Audit log error:', auditError);
        }
        res.json({
            message: 'Delegation extended successfully',
            delegation: {
                previousEndDate,
                newEndDate: faculty.delegationEndDate
            }
        });
        return;
    }
    catch (error) {
        console.error('Extend delegation error:', error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
};
exports.extendDelegation = extendDelegation;
//# sourceMappingURL=delegation.controller.js.map