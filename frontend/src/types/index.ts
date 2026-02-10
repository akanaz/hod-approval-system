// frontend/src/types/index.ts

export type UserRole = 'FACULTY' | 'HOD' | 'ADMIN';

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'MORE_INFO_NEEDED';

export type UrgencyLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  department: string;
  role: UserRole;
  phoneNumber?: string;
  createdAt: string;
}

export interface EarlyDepartureRequest {
  id: string;
  facultyId: string;
  faculty: {
    firstName: string;
    lastName: string;
    email: string;
    department: string;
    employeeId: string;
    phoneNumber?: string;
  };
  departureDate: string;
  departureTime: string;
  expectedReturnTime?: string;
  reason: string;
  destination?: string;
  urgencyLevel: UrgencyLevel;
  status: RequestStatus;
  hodId?: string;
  hod?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  hodComments?: string;
  exitPassNumber?: string;
  qrCode?: string;
  currentWorkload?: any;
  coverageArrangement?: string;
  submittedAt: string;
  lastUpdatedAt: string;
  documents?: Document[];
  comments?: Comment[];
  auditLogs?: AuditLog[];
  _count?: {
    comments: number;
  };
}

export interface Document {
  id: string;
  requestId: string;
  fileName: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  uploadedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  requestId?: string;
  request?: {
    id: string;
    departureDate: string;
    status: RequestStatus;
  };
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  requestId: string;
  userId: string;
  user: {
    firstName: string;
    lastName: string;
    role: UserRole;
  };
  content: string;
  isInternal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  requestId: string;
  userId: string;
  user: {
    firstName: string;
    lastName: string;
    role: UserRole;
  };
  action: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface DashboardStats {
  pending: number;
  approved: number;
  rejected: number;
  moreInfoNeeded?: number;
  total: number;
}

export interface HODDashboard {
  pendingRequests: EarlyDepartureRequest[];
  statistics: DashboardStats;
  urgencyBreakdown: Array<{
    urgency: UrgencyLevel;
    count: number;
  }>;
  recentActivity: AuditLog[];
  avgApprovalTimeHours: number;
  topFaculty: Array<{
    faculty: User;
    requestCount: number;
  }>;
}

export interface FacultyDashboard {
  requests: EarlyDepartureRequest[];
  statistics: DashboardStats;
  unreadNotifications: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  department: string;
  role?: UserRole;
  phoneNumber?: string;
}

export interface CreateRequestData {
  departureDate: string;
  departureTime: string;
  expectedReturnTime?: string;
  reason: string;
  destination?: string;
  urgencyLevel: UrgencyLevel;
  currentWorkload?: any;
  coverageArrangement?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface ApiError {
  message: string;
  errors?: any;
}
