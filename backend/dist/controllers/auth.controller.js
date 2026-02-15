"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.getProfile = exports.login = exports.register = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const User_1 = __importDefault(require("../models/User"));
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET is required in environment variables');
}
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    firstName: zod_1.z.string().min(1),
    lastName: zod_1.z.string().min(1),
    employeeId: zod_1.z.string().min(1),
    department: zod_1.z.string().min(1),
    role: zod_1.z.enum(['FACULTY', 'HOD', 'DEAN', 'ADMIN']).optional(),
    phoneNumber: zod_1.z.string().optional()
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1)
});
const generateToken = (userId, email, role) => {
    return jsonwebtoken_1.default.sign({ userId, email, role }, JWT_SECRET, { expiresIn: '7d' });
};
const register = async (req, res) => {
    try {
        const validatedData = registerSchema.parse(req.body);
        const existingUser = await User_1.default.findOne({
            $or: [
                { email: validatedData.email },
                { employeeId: validatedData.employeeId }
            ]
        });
        if (existingUser) {
            return res.status(400).json({
                message: 'User with this email or employee ID already exists'
            });
        }
        if (validatedData.role === 'HOD') {
            const existingHOD = await User_1.default.findOne({
                department: validatedData.department,
                role: 'HOD',
                isActive: true
            });
            if (existingHOD) {
                return res.status(400).json({
                    message: `Department '${validatedData.department}' already has a HOD (${existingHOD.firstName} ${existingHOD.lastName}). Each department can have only one HOD.`
                });
            }
        }
        if (validatedData.role === 'DEAN') {
            const existingDean = await User_1.default.findOne({
                role: 'DEAN',
                isActive: true
            });
            if (existingDean) {
                return res.status(400).json({
                    message: `A Dean already exists (${existingDean.firstName} ${existingDean.lastName}). Only one Dean is allowed.`
                });
            }
        }
        const user = await User_1.default.create(validatedData);
        const userObject = user.toObject();
        const { password, ...userWithoutPassword } = userObject;
        const token = generateToken(user._id.toString(), user.email, user.role);
        return res.status(201).json({
            message: 'User registered successfully',
            token,
            user: userWithoutPassword
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                message: 'Validation error',
                errors: error.errors
            });
        }
        console.error('Registration error:', error);
        return res.status(500).json({
            message: 'Server error during registration'
        });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const validatedData = loginSchema.parse(req.body);
        const user = await User_1.default.findOne({ email: validatedData.email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        if (!user.isActive) {
            return res.status(403).json({ message: 'Account is inactive' });
        }
        const isPasswordValid = await user.comparePassword(validatedData.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const token = generateToken(user._id.toString(), user.email, user.role);
        const userObject = user.toObject();
        const { password, ...userWithoutPassword } = userObject;
        let delegationInfo = null;
        if (user.role === 'FACULTY' && user.hasDelegatedRights()) {
            delegationInfo = {
                delegatedBy: user.delegatedBy,
                startDate: user.delegationStartDate,
                endDate: user.delegationEndDate,
                permissions: user.delegationPermissions,
                isActive: user.hasDelegatedRights()
            };
        }
        return res.json({
            message: 'Login successful',
            token,
            user: {
                ...userWithoutPassword,
                delegation: delegationInfo
            }
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                message: 'Validation error',
                errors: error.errors
            });
        }
        console.error('Login error:', error);
        return res.status(500).json({
            message: 'Server error during login'
        });
    }
};
exports.login = login;
const getProfile = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        const user = await User_1.default.findById(req.user.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        let delegationInfo = null;
        if (user.role === 'FACULTY' && user.hasDelegatedRights()) {
            delegationInfo = {
                delegatedBy: user.delegatedBy,
                startDate: user.delegationStartDate,
                endDate: user.delegationEndDate,
                permissions: user.delegationPermissions,
                isActive: user.hasDelegatedRights()
            };
        }
        return res.json({
            user: {
                ...user.toObject(),
                delegation: delegationInfo
            }
        });
    }
    catch (error) {
        console.error('Get profile error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};
exports.getProfile = getProfile;
const changePassword = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                message: 'Current password and new password are required'
            });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({
                message: 'New password must be at least 6 characters long'
            });
        }
        const user = await User_1.default.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const isPasswordValid = await user.comparePassword(currentPassword);
        if (!isPasswordValid) {
            return res.status(401).json({
                message: 'Current password is incorrect'
            });
        }
        user.password = newPassword;
        await user.save();
        return res.json({ message: 'Password changed successfully' });
    }
    catch (error) {
        console.error('Change password error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};
exports.changePassword = changePassword;
//# sourceMappingURL=auth.controller.js.map