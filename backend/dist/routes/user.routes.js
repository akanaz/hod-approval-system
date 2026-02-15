"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const User_1 = __importDefault(require("../models/User"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRoles)('ADMIN'), async (_req, res) => {
    try {
        const users = await User_1.default.find().select('-password').lean();
        const formattedUsers = users.map((u) => ({
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
        return res.json({ users: formattedUsers });
    }
    catch (error) {
        console.error('Get users error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});
router.get('/:id', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const user = await User_1.default.findById(req.params.id)
            .select('-password')
            .lean();
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        return res.json({
            user: {
                id: user._id.toString(),
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                employeeId: user.employeeId,
                department: user.department,
                role: user.role,
                phoneNumber: user.phoneNumber,
                isActive: user.isActive,
                createdAt: user.createdAt,
            },
        });
    }
    catch (error) {
        console.error('Get user error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});
router.patch('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const { isActive, role, department } = req.body;
        const user = await User_1.default.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (typeof isActive === 'boolean')
            user.isActive = isActive;
        if (role)
            user.role = role;
        if (department)
            user.department = department;
        await user.save();
        const userObj = user.toObject();
        delete userObj.password;
        return res.json({
            message: 'User updated successfully',
            user: {
                ...userObj,
                id: user._id.toString(),
            },
        });
    }
    catch (error) {
        console.error('Update user error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});
router.delete('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const user = await User_1.default.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        return res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        console.error('Delete user error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=user.routes.js.map