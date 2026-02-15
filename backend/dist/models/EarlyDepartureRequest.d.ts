import mongoose, { Document } from 'mongoose';
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
    leaveType: 'PARTIAL' | 'FULL_DAY';
    departureDate: Date;
    departureTime?: string;
    expectedReturnTime?: string;
    reason: string;
    destination?: string;
    urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MORE_INFO_NEEDED';
    hodId?: mongoose.Types.ObjectId;
    approvedBy?: mongoose.Types.ObjectId;
    approvedByRole?: string;
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
declare const _default: mongoose.Model<IEarlyDepartureRequest, {}, {}, {}, mongoose.Document<unknown, {}, IEarlyDepartureRequest, {}, {}> & IEarlyDepartureRequest & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=EarlyDepartureRequest.d.ts.map