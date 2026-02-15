// backend/src/models/EarlyDepartureRequest.ts
// ✅ UPDATED: Added leaveType for full-day vs partial-day leaves

import mongoose, { Schema, Document } from 'mongoose';

// ✅ Shape of each uploaded supporting document
export interface IAttachment {
  filename: string;
  originalName: string;
  path: string;
  mimetype: string;
  size: number;
  uploadedAt: Date;
}

export interface IEarlyDepartureRequest extends Document {
  facultyId: mongoose.Types.ObjectId;
  
  // ✅ NEW: Leave type field
  leaveType: 'PARTIAL' | 'FULL_DAY';
  
  departureDate: Date;
  departureTime?: string; // ✅ CHANGED: Optional for full-day leaves
  expectedReturnTime?: string;
  
  reason: string;
  destination?: string;
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MORE_INFO_NEEDED';
  
  hodId?: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId; // ✅ NEW: Who approved (HOD or delegated faculty)
  approvedByRole?: string; // ✅ NEW: Track if approved by HOD or delegated faculty
  
  approvedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  hodComments?: string;
  exitPassNumber?: string;
  qrCode?: string;
  currentWorkload?: any;
  coverageArrangement?: string;
  attachments?: IAttachment[];
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const earlyDepartureRequestSchema = new Schema<IEarlyDepartureRequest>(
  {
    facultyId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    // ✅ NEW: Leave type
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
      required: function(this: IEarlyDepartureRequest) {
        // ✅ Only required for partial-day leaves
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
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    
    // ✅ NEW: Track who approved (for delegation tracking)
    approvedBy: {
      type: Schema.Types.ObjectId,
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
      type: Schema.Types.Mixed,
    },
    coverageArrangement: {
      type: String,
    },
    attachments: [
      {
        filename:     { type: String, required: true },
        originalName: { type: String, required: true },
        path:         { type: String, required: true },
        mimetype:     { type: String, required: true },
        size:         { type: Number, required: true },
        uploadedAt:   { type: Date,   default: Date.now },
      },
    ],
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
earlyDepartureRequestSchema.index({ facultyId: 1, status: 1 });
earlyDepartureRequestSchema.index({ status: 1, departureDate: 1 });
earlyDepartureRequestSchema.index({ urgencyLevel: 1, status: 1 });
earlyDepartureRequestSchema.index({ exitPassNumber: 1 });
earlyDepartureRequestSchema.index({ approvedBy: 1 }); // ✅ NEW: Index for delegation queries
earlyDepartureRequestSchema.index({ leaveType: 1 }); // ✅ NEW: Index for leave type filtering

export default mongoose.model<IEarlyDepartureRequest>(
  'EarlyDepartureRequest',
  earlyDepartureRequestSchema
);
