import mongoose, { Document } from 'mongoose';
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
declare const _default: mongoose.Model<IAuditLog, {}, {}, {}, mongoose.Document<unknown, {}, IAuditLog, {}, {}> & IAuditLog & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=AuditLog.d.ts.map