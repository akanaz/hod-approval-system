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
const mongoose_1 = __importStar(require("mongoose"));
const earlyDepartureRequestSchema = new mongoose_1.Schema({
    facultyId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    leaveType: {
        type: String,
        enum: ['PARTIAL', 'FULL_DAY'],
        default: 'PARTIAL',
        required: true,
    },
    departureDate: {
        type: Date,
        required: true,
    },
    departureTime: {
        type: String,
        required: function () {
            return this.leaveType === 'PARTIAL';
        },
    },
    expectedReturnTime: {
        type: String,
    },
    reason: {
        type: String,
        required: true,
        minlength: 10,
    },
    destination: {
        type: String,
    },
    urgencyLevel: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        default: 'MEDIUM',
    },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED', 'MORE_INFO_NEEDED'],
        default: 'PENDING',
    },
    hodId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    approvedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    approvedByRole: {
        type: String,
        enum: ['HOD', 'DELEGATED_FACULTY', 'DEAN'],
    },
    approvedAt: {
        type: Date,
    },
    rejectedAt: {
        type: Date,
    },
    rejectionReason: {
        type: String,
    },
    hodComments: {
        type: String,
    },
    exitPassNumber: {
        type: String,
        unique: true,
        sparse: true,
    },
    qrCode: {
        type: String,
    },
    currentWorkload: {
        type: mongoose_1.Schema.Types.Mixed,
    },
    coverageArrangement: {
        type: String,
    },
    attachments: [
        {
            filename: { type: String, required: true },
            originalName: { type: String, required: true },
            path: { type: String, required: true },
            mimetype: { type: String, required: true },
            size: { type: Number, required: true },
            uploadedAt: { type: Date, default: Date.now },
        },
    ],
    submittedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});
earlyDepartureRequestSchema.index({ facultyId: 1, status: 1 });
earlyDepartureRequestSchema.index({ status: 1, departureDate: 1 });
earlyDepartureRequestSchema.index({ urgencyLevel: 1, status: 1 });
earlyDepartureRequestSchema.index({ exitPassNumber: 1 });
earlyDepartureRequestSchema.index({ approvedBy: 1 });
earlyDepartureRequestSchema.index({ leaveType: 1 });
exports.default = mongoose_1.default.model('EarlyDepartureRequest', earlyDepartureRequestSchema);
//# sourceMappingURL=EarlyDepartureRequest.js.map