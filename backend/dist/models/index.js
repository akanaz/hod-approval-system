"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepartmentStats = exports.DocumentModel = exports.Comment = exports.AuditLog = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const notificationSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    requestId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'EarlyDepartureRequest',
    },
    title: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true,
    },
    isRead: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });
exports.default = mongoose_1.default.model('Notification', notificationSchema);
const auditLogSchema = new mongoose_1.Schema({
    requestId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'EarlyDepartureRequest',
        required: true,
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    action: {
        type: String,
        required: true,
    },
    details: {
        type: mongoose_1.Schema.Types.Mixed,
    },
    ipAddress: {
        type: String,
    },
    userAgent: {
        type: String,
    },
}, {
    timestamps: true,
});
auditLogSchema.index({ requestId: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1 });
exports.AuditLog = mongoose_1.default.model('AuditLog', auditLogSchema);
const commentSchema = new mongoose_1.Schema({
    requestId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'EarlyDepartureRequest',
        required: true,
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    isInternal: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});
commentSchema.index({ requestId: 1, createdAt: -1 });
exports.Comment = mongoose_1.default.model('Comment', commentSchema);
const documentSchema = new mongoose_1.Schema({
    requestId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'EarlyDepartureRequest',
        required: true,
    },
    fileName: {
        type: String,
        required: true,
    },
    originalName: {
        type: String,
        required: true,
    },
    fileType: {
        type: String,
        required: true,
    },
    fileSize: {
        type: Number,
        required: true,
    },
    filePath: {
        type: String,
        required: true,
    },
    uploadedAt: {
        type: Date,
        default: Date.now,
    },
});
documentSchema.index({ requestId: 1 });
exports.DocumentModel = mongoose_1.default.model('Document', documentSchema);
const departmentStatsSchema = new mongoose_1.Schema({
    department: {
        type: String,
        required: true,
        unique: true,
    },
    totalFaculty: {
        type: Number,
        default: 0,
    },
    totalRequests: {
        type: Number,
        default: 0,
    },
    approvedRequests: {
        type: Number,
        default: 0,
    },
    rejectedRequests: {
        type: Number,
        default: 0,
    },
    pendingRequests: {
        type: Number,
        default: 0,
    },
    avgApprovalTime: {
        type: Number,
    },
    lastUpdated: {
        type: Date,
        default: Date.now,
    },
});
departmentStatsSchema.index({ department: 1 });
exports.DepartmentStats = mongoose_1.default.model('DepartmentStats', departmentStatsSchema);
//# sourceMappingURL=index.js.map