// backend/src/models/User.ts
// ✅ UPDATED: Added DEAN role + delegation fields

import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  department: string;
  role: 'FACULTY' | 'HOD' | 'DEAN' | 'ADMIN'; // ✅ Added DEAN
  hodId?: mongoose.Types.ObjectId; // Faculty/HOD mapped to their HOD/DEAN
  phoneNumber?: string;
  isActive: boolean;
  
  // ✅ NEW: Delegation fields
  delegatedBy?: mongoose.Types.ObjectId; // Which HOD delegated rights to this faculty
  delegationStartDate?: Date;
  delegationEndDate?: Date;
  delegationPermissions?: string[]; // ['approve_requests', 'reject_requests', 'request_more_info']
  
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  
  // ✅ NEW: Helper methods
  hasDelegatedRights(): boolean;
  canApproveDepartmentRequests(): boolean;
}

const userSchema = new Schema<IUser>(
  {
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
      enum: ['FACULTY', 'HOD', 'DEAN', 'ADMIN'], // ✅ Added DEAN
      default: 'FACULTY',
    },
    hodId: {
      type: Schema.Types.ObjectId,
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
    
    // ✅ NEW: Delegation fields
    delegatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User', // References the HOD who delegated
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
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
userSchema.index({ email: 1 });
userSchema.index({ employeeId: 1 });
userSchema.index({ department: 1, role: 1 });
userSchema.index({ hodId: 1 });
userSchema.index({ delegatedBy: 1 }); // ✅ NEW: Index for delegation queries
userSchema.index({ delegationEndDate: 1 }); // ✅ NEW: Index for checking active delegations

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// ✅ NEW: Automatically revoke expired delegations before save
userSchema.pre('save', function (next) {
  if (this.delegationEndDate && this.delegationEndDate < new Date()) {
    this.delegatedBy = undefined;
    this.delegationStartDate = undefined;
    this.delegationEndDate = undefined;
    this.delegationPermissions = [];
  }
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// ✅ NEW: Check if user has active delegated rights
userSchema.methods.hasDelegatedRights = function (): boolean {
  if (!this.delegatedBy || !this.delegationEndDate) {
    return false;
  }
  
  const now = new Date();
  return (
    this.delegationStartDate! <= now &&
    this.delegationEndDate >= now &&
    this.delegationPermissions!.length > 0
  );
};

// ✅ NEW: Check if user can approve department requests (HOD or delegated faculty)
userSchema.methods.canApproveDepartmentRequests = function (): boolean {
  if (this.role === 'HOD') {
    return true;
  }
  
  if (this.role === 'FACULTY' && this.hasDelegatedRights()) {
    return this.delegationPermissions!.includes('approve_requests');
  }
  
  return false;
};

export default mongoose.model<IUser>('User', userSchema);
