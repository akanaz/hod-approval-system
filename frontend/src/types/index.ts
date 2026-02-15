// frontend/src/types/index.ts
// ✅ FIXED: FileAttachment type consistency

export type UserRole = 'FACULTY' | 'HOD' | 'ADMIN' | 'DEAN';

export type RequestStatus = 
  | 'PENDING' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'MORE_INFO_NEEDED';

export type UrgencyLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type LeaveType = 'PARTIAL' | 'FULL_DAY';

export type ApprovedByRole = 'HOD' | 'DEAN' | 'DELEGATED_FACULTY';

export interface User {
  id: string;
  _id?: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  department: string;
  role: UserRole;
  phoneNumber?: string;
  isActive: boolean;
  createdAt: string;
  delegatedBy?: string | User;
  delegationStartDate?: string;
  delegationEndDate?: string;
  delegationPermissions?: string[];
}

export interface EarlyDepartureRequest {
  id: string;
  _id?: string;
  faculty: User;
  leaveType: LeaveType;
  departureDate: string;
  departureTime?: string;
  expectedReturnTime?: string;
  reason: string;
  destination?: string;
  urgencyLevel: UrgencyLevel;
  currentWorkload?: string;
  coverageArrangement?: string;
  status: RequestStatus;
  hodId?: User;
  approvedBy?: User;
  approvedByRole?: ApprovedByRole;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  hodComments?: string;
  exitPassNumber?: string;
  qrCode?: string;
  attachments?: FileAttachment[];
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

// ✅ FIXED: Consistent mime type field naming
export interface FileAttachment {
  filename: string;
  originalName: string;
  size: number;
  mimetype: string; // ✅ Primary field (matches backend)
  mimeType?: string; // ✅ Optional alias for backward compatibility
  uploadedAt: string;
  path?: string; // ✅ Added for backend compatibility
}

export interface CreateRequestDTO {
  leaveType: LeaveType;
  departureDate: string;
  departureTime?: string;
  expectedReturnTime?: string;
  reason: string;
  destination?: string;
  urgencyLevel: UrgencyLevel;
  currentWorkload?: string;
  coverageArrangement?: string;
  attachments?: FileAttachment[];
}

export interface EditRequestDTO {
  leaveType?: LeaveType;
  departureDate?: string;
  departureTime?: string;
  expectedReturnTime?: string;
  reason?: string;
  destination?: string;
  urgencyLevel?: UrgencyLevel;
  currentWorkload?: string;
  coverageArrangement?: string;
  attachments?: FileAttachment[];
}

export interface CancelRequestDTO {
  cancellationReason: string;
}

export interface ApproveRequestDTO {
  hodComments?: string;
}

export interface RejectRequestDTO {
  rejectionReason: string;
  hodComments?: string;
}

export interface RequestMoreInfoDTO {
  hodComments: string;
}

export interface DashboardStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  recentRequests: EarlyDepartureRequest[];
  urgencyBreakdown?: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
  statusBreakdown?: {
    PENDING: number;
    APPROVED: number;
    REJECTED: number;
    MORE_INFO_NEEDED: number;
  };
  departmentBreakdown?: {
    department: string;
    hodCount: number;
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
  }[];
}

export interface Delegation {
  id: string;
  facultyId: string;
  faculty: User;
  startDate: string;
  endDate: string;
  permissions: string[];
  isCurrentlyActive: boolean;
  createdAt: string;
}

export interface DelegateRightsDTO {
  facultyId: string;
  startDate: string;
  endDate: string;
  permissions: string[];
}

export interface ExtendDelegationDTO {
  newEndDate: string;
}

export interface HODWithStats extends User {
  requestStats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

/* ==================== HELPER FUNCTIONS ==================== */

export const isHOD = (user: User | null): boolean => user?.role === 'HOD';
export const isDean = (user: User | null): boolean => user?.role === 'DEAN';
export const isFaculty = (user: User | null): boolean => user?.role === 'FACULTY';
export const isAdmin = (user: User | null): boolean => user?.role === 'ADMIN';

export const hasDelegatedRights = (user: User | null): boolean => {
  if (!user || !user.delegationEndDate) return false;
  const now = new Date();
  const endDate = new Date(user.delegationEndDate);
  return endDate > now && (user.delegationPermissions?.length || 0) > 0;
};

export const canEditRequest = (request: EarlyDepartureRequest, currentUser: User | null): boolean => {
  if (!currentUser) return false;
  if (request.status !== 'PENDING') return false;
  return request.faculty.id === currentUser.id || request.faculty._id === currentUser.id;
};

export const canCancelRequest = (request: EarlyDepartureRequest, currentUser: User | null): boolean => {
  return canEditRequest(request, currentUser);
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatTime = (timeString: string | undefined): string => {
  return timeString || 'N/A';
};

export const formatLeaveType = (leaveType: LeaveType): string => {
  return leaveType === 'FULL_DAY' ? 'Full Day' : 'Partial Day';
};

export const getStatusColor = (status: RequestStatus): string => {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'APPROVED':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'REJECTED':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'MORE_INFO_NEEDED':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

export const getUrgencyColor = (urgency: UrgencyLevel): string => {
  switch (urgency) {
    case 'CRITICAL':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'HIGH':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'LOW':
      return 'bg-green-100 text-green-800 border-green-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

// ✅ FIXED: Handle both mimetype and mimeType fields
export const getFileIcon = (mimeTypeOrMimetype: string): string => {
  const type = (mimeTypeOrMimetype || '').toLowerCase();
  if (type.startsWith('image/')) return '🖼️';
  if (type.includes('pdf')) return '📄';
  if (type.includes('word') || type.includes('document')) return '📝';
  return '📎';
};
