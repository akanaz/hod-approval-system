"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStatusColor = exports.getUrgencyColor = exports.isDateInFuture = exports.generateRandomString = exports.sanitizeFilename = exports.getHoursDifference = exports.formatDate = exports.generateExitPassNumber = void 0;
const crypto_1 = __importDefault(require("crypto"));
const generateExitPassNumber = () => {
    const prefix = 'EP';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto_1.default.randomBytes(3).toString('hex').toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
};
exports.generateExitPassNumber = generateExitPassNumber;
const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
};
exports.formatDate = formatDate;
const getHoursDifference = (start, end) => {
    const diff = end.getTime() - start.getTime();
    return diff / (1000 * 60 * 60);
};
exports.getHoursDifference = getHoursDifference;
const sanitizeFilename = (filename) => {
    return filename
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/_{2,}/g, '_')
        .toLowerCase();
};
exports.sanitizeFilename = sanitizeFilename;
const generateRandomString = (length = 32) => {
    return crypto_1.default.randomBytes(length).toString('hex');
};
exports.generateRandomString = generateRandomString;
const isDateInFuture = (date) => {
    return date > new Date();
};
exports.isDateInFuture = isDateInFuture;
const getUrgencyColor = (urgency) => {
    const colors = {
        LOW: '#10b981',
        MEDIUM: '#f59e0b',
        HIGH: '#ef4444',
        CRITICAL: '#dc2626'
    };
    return colors[urgency] || colors.MEDIUM;
};
exports.getUrgencyColor = getUrgencyColor;
const getStatusColor = (status) => {
    const colors = {
        PENDING: '#f59e0b',
        APPROVED: '#10b981',
        REJECTED: '#ef4444',
        MORE_INFO_NEEDED: '#3b82f6'
    };
    return colors[status] || colors.PENDING;
};
exports.getStatusColor = getStatusColor;
//# sourceMappingURL=helpers.js.map