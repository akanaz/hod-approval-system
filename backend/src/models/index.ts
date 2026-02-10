// backend/src/models/Notification.ts

import mongoose, { Schema, Document } from 'mongoose';

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

export default mongoose.model<INotification>('Notification', notificationSchema);

// backend/src/models/AuditLog.ts

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

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);

// backend/src/models/Comment.ts

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

// backend/src/models/Document.ts

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

// backend/src/models/DepartmentStats.ts

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
