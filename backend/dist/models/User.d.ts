import mongoose, { Document } from 'mongoose';
export interface IUser extends Document {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    department: string;
    role: 'FACULTY' | 'HOD' | 'DEAN' | 'ADMIN';
    hodId?: mongoose.Types.ObjectId;
    phoneNumber?: string;
    isActive: boolean;
    delegatedBy?: mongoose.Types.ObjectId;
    delegationStartDate?: Date;
    delegationEndDate?: Date;
    delegationPermissions?: string[];
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
    hasDelegatedRights(): boolean;
    canApproveDepartmentRequests(): boolean;
}
declare const _default: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=User.d.ts.map