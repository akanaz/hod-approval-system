// backend/src/models/EarlyDepartureRequest.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface IEarlyDepartureRequest extends Document {
  facultyId: mongoose.Types.ObjectId;
  departureDate: Date;
  departureTime: string;
  expectedReturnTime?: string;
  reason: string;
  destination?: string;
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MORE_INFO_NEEDED';
  hodId?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  hodComments?: string;
  exitPassNumber?: string;
  qrCode?: string;
  currentWorkload?: any;
  coverageArrangement?: string;
  attachments?: Array<{
    filename: string;
    originalName: string;
    path: string;
    mimetype: string;
    size: number;
    uploadedAt: Date;
  }>;
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
    departureDate: {
      type: Date,
      required: true,
    },
    departureTime: {
      type: String,
      required: true,
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
    attachments: [{
      filename: { type: String, required: true },
      originalName: { type: String, required: true },
      path: { type: String, required: true },
      mimetype: { type: String, required: true },
      size: { type: Number, required: true },
      uploadedAt: { type: Date, default: Date.now }
    }],
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

export default mongoose.model<IEarlyDepartureRequest>(
  'EarlyDepartureRequest',
  earlyDepartureRequestSchema
);
