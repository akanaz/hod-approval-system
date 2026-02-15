// backend/src/models/index.ts
// ✅ FIXED: Proper exports for all models

import mongoose, { Schema, Document } from 'mongoose';

/* ===============================================
   NOTIFICATION MODEL
=============================================== */
export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  requestId?: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    requestId: {
      type: Schema.Types.ObjectId,
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
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);

/* ===============================================
   AUDIT LOG MODEL
   ✅ FIXED: Now exported as both default AND named export
=============================================== */
export interface IAuditLog extends Document {
  requestId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  action: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
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

auditLogSchema.index({ requestId: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ createdAt: -1 });

// ✅ CRITICAL: Export as BOTH named and default
export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
export default AuditLog; // ✅ Also export as default for consistency

/* ===============================================
   COMMENT MODEL
=============================================== */
export interface IComment extends Document {
  requestId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  content: string;
  isInternal: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
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
    content: {
      type: String,
      required: true,
    },
    isInternal: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

commentSchema.index({ requestId: 1, createdAt: -1 });

export const Comment = mongoose.model<IComment>('Comment', commentSchema);

/* ===============================================
   DOCUMENT MODEL
=============================================== */
export interface IDocument extends Document {
  requestId: mongoose.Types.ObjectId;
  fileName: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  uploadedAt: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    requestId: {
      type: Schema.Types.ObjectId,
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
  }
);

documentSchema.index({ requestId: 1 });

export const DocumentModel = mongoose.model<IDocument>('Document', documentSchema);

/* ===============================================
   DEPARTMENT STATS MODEL
=============================================== */
export interface IDepartmentStats extends Document {
  department: string;
  totalFaculty: number;
  totalRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  pendingRequests: number;
  avgApprovalTime?: number;
  lastUpdated: Date;
}

const departmentStatsSchema = new Schema<IDepartmentStats>(
  {
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
  }
);

departmentStatsSchema.index({ department: 1 });

export const DepartmentStats = mongoose.model<IDepartmentStats>(
  'DepartmentStats',
  departmentStatsSchema
);