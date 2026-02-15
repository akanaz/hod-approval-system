// backend/src/models/AuditLog.ts
// ✅ COMPLETE AUDIT LOG MODEL

import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  requestId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  action: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    requestId: {
      type: Schema.Types.ObjectId,
      ref: 'EarlyDepartureRequest',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'created',
        'edited',
        'cancelled',
        'approved',
        'rejected',
        'requested_more_info',
        'delegation_granted',
        'delegation_revoked',
        'delegation_extended',
        'comment_added'
      ],
    },
    details: {
      type: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
auditLogSchema.index({ requestId: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ createdAt: -1 });

export default mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
