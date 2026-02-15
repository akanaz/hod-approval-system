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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const userSchema = new mongoose_1.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
    },
    firstName: {
        type: String,
        required: true,
        trim: true,
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
    },
    employeeId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    department: {
        type: String,
        required: true,
        trim: true,
    },
    role: {
        type: String,
        enum: ['FACULTY', 'HOD', 'DEAN', 'ADMIN'],
        default: 'FACULTY',
    },
    hodId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
    },
    phoneNumber: {
        type: String,
        trim: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    delegatedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
    },
    delegationStartDate: {
        type: Date,
        required: false,
    },
    delegationEndDate: {
        type: Date,
        required: false,
    },
    delegationPermissions: {
        type: [String],
        default: [],
        enum: ['approve_requests', 'reject_requests', 'request_more_info'],
    },
}, {
    timestamps: true,
});
userSchema.index({ email: 1 });
userSchema.index({ employeeId: 1 });
userSchema.index({ department: 1, role: 1 });
userSchema.index({ hodId: 1 });
userSchema.index({ delegatedBy: 1 });
userSchema.index({ delegationEndDate: 1 });
userSchema.pre('save', async function (next) {
    if (!this.isModified('password'))
        return next();
    try {
        const salt = await bcryptjs_1.default.genSalt(10);
        this.password = await bcryptjs_1.default.hash(this.password, salt);
        next();
    }
    catch (error) {
        next(error);
    }
});
userSchema.pre('save', function (next) {
    if (this.delegationEndDate && this.delegationEndDate < new Date()) {
        this.delegatedBy = undefined;
        this.delegationStartDate = undefined;
        this.delegationEndDate = undefined;
        this.delegationPermissions = [];
    }
    next();
});
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcryptjs_1.default.compare(candidatePassword, this.password);
};
userSchema.methods.hasDelegatedRights = function () {
    if (!this.delegatedBy || !this.delegationEndDate) {
        return false;
    }
    const now = new Date();
    return (this.delegationStartDate <= now &&
        this.delegationEndDate >= now &&
        this.delegationPermissions.length > 0);
};
userSchema.methods.canApproveDepartmentRequests = function () {
    if (this.role === 'HOD') {
        return true;
    }
    if (this.role === 'FACULTY' && this.hasDelegatedRights()) {
        return this.delegationPermissions.includes('approve_requests');
    }
    return false;
};
exports.default = mongoose_1.default.model('User', userSchema);
//# sourceMappingURL=User.js.map