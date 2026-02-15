import mongoose, { Document } from 'mongoose';
export interface INotification extends Document {
    userId: mongoose.Types.ObjectId;
    requestId?: mongoose.Types.ObjectId;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    createdAt: Date;
}
declare const _default: mongoose.Model<INotification, {}, {}, {}, mongoose.Document<unknown, {}, INotification, {}, {}> & INotification & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
export interface IAuditLog extends Document {
    requestId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    action: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
}
export declare const AuditLog: mongoose.Model<IAuditLog, {}, {}, {}, mongoose.Document<unknown, {}, IAuditLog, {}, {}> & IAuditLog & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export interface IComment extends Document {
    requestId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    content: string;
    isInternal: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Comment: mongoose.Model<IComment, {}, {}, {}, mongoose.Document<unknown, {}, IComment, {}, {}> & IComment & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export interface IDocument extends Document {
    requestId: mongoose.Types.ObjectId;
    fileName: string;
    originalName: string;
    fileType: string;
    fileSize: number;
    filePath: string;
    uploadedAt: Date;
}
export declare const DocumentModel: mongoose.Model<IDocument, {}, {}, {}, mongoose.Document<unknown, {}, IDocument, {}, {}> & IDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
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
export declare const DepartmentStats: mongoose.Model<IDepartmentStats, {}, {}, {}, mongoose.Document<unknown, {}, IDepartmentStats, {}, {}> & IDepartmentStats & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=index.d.ts.map