// frontend/src/services/api.ts
// ✅ COMPLETE VERSION with all new endpoints

import axios, { AxiosError } from 'axios';
import type {
  User,
  EarlyDepartureRequest,
  CreateRequestDTO,
  EditRequestDTO,
  CancelRequestDTO,
  ApproveRequestDTO,
  RejectRequestDTO,
  RequestMoreInfoDTO,
  DashboardStats,
  Delegation,
  DelegateRightsDTO,
  ExtendDelegationDTO,
  HODWithStats,
  FileAttachment
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  register: async (userData: any) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  getProfile: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const requestsApi = {
  getAll: async (status?: string): Promise<EarlyDepartureRequest[]> => {
    const params = status ? { status } : {};
    const response = await api.get('/requests', { params });
    return response.data.requests;
  },
  getById: async (id: string): Promise<EarlyDepartureRequest> => {
    const response = await api.get(`/requests/${id}`);
    return response.data;
  },
  create: async (data: CreateRequestDTO): Promise<EarlyDepartureRequest> => {
    const response = await api.post('/requests', data);
    return response.data.request;
  },
  edit: async (id: string, data: EditRequestDTO): Promise<EarlyDepartureRequest> => {
    const response = await api.patch(`/requests/${id}/edit`, data);
    return response.data.request;
  },
  cancel: async (id: string, data: CancelRequestDTO): Promise<EarlyDepartureRequest> => {
    const response = await api.post(`/requests/${id}/cancel`, data);
    return response.data.request;
  },
  approve: async (id: string, data: ApproveRequestDTO): Promise<EarlyDepartureRequest> => {
    const response = await api.post(`/requests/${id}/approve`, data);
    return response.data.request;
  },
  reject: async (id: string, data: RejectRequestDTO): Promise<EarlyDepartureRequest> => {
    const response = await api.post(`/requests/${id}/reject`, data);
    return response.data.request;
  },
  requestMoreInfo: async (id: string, data: RequestMoreInfoDTO): Promise<EarlyDepartureRequest> => {
    const response = await api.post(`/requests/${id}/request-more-info`, data);
    return response.data.request;
  },
};

export const dashboardApi = {
  getFacultyDashboard: async (): Promise<DashboardStats> => {
    const response = await api.get('/dashboard/faculty');
    return response.data;
  },
  getHODDashboard: async (): Promise<DashboardStats> => {
    const response = await api.get('/dashboard/hod');
    return response.data;
  },
  getDeanDashboard: async (): Promise<DashboardStats> => {
    const response = await api.get('/dean/dashboard');
    return response.data;
  },
};

export const fileApi = {
  upload: async (file: File): Promise<FileAttachment> => {
    const formData = new FormData();
    formData.append('files', file);
    const response = await api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.files[0];
  },
  delete: async (filename: string): Promise<void> => {
    await api.delete(`/files/delete/${filename}`);
  },
  getUrl: (filename: string): string => {
    return `${API_URL.replace('/api', '')}/uploads/requests/${filename}`;
  },
};

export const delegationApi = {
  getEligibleFaculty: async (): Promise<User[]> => {
    const response = await api.get('/delegation/eligible-faculty');
    return response.data.faculty;
  },
  getMyDelegations: async (): Promise<Delegation[]> => {
    const response = await api.get('/delegation/my-delegations');
    return response.data.delegations;
  },
  delegate: async (data: DelegateRightsDTO): Promise<Delegation> => {
    const response = await api.post('/delegation/delegate', data);
    return response.data.delegation;
  },
  revoke: async (facultyId: string): Promise<void> => {
    await api.delete(`/delegation/revoke/${facultyId}`);
  },
  extend: async (facultyId: string, data: ExtendDelegationDTO): Promise<Delegation> => {
    const response = await api.patch(`/delegation/extend/${facultyId}`, data);
    return response.data.delegation;
  },
};

export const deanApi = {
  getDashboard: async (): Promise<DashboardStats> => {
    const response = await api.get('/dean/dashboard');
    return response.data || {};
  },

  getHODRequests: async (
    status?: string,
    department?: string
  ): Promise<EarlyDepartureRequest[]> => {
    const params: any = {};
    if (status) params.status = status;
    if (department) params.department = department;

    const response = await api.get('/dean/hod-requests', { params });

    return response.data || []; // ✅ backend now returns array directly
  },

  getAllHODs: async (): Promise<HODWithStats[]> => {
    const response = await api.get('/dean/hods');

    return response.data || []; // ✅ backend now returns array directly
  },
};


export const adminApi = {
  getDashboard: async (): Promise<DashboardStats> => {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },
  getAllUsers: async (role?: string): Promise<User[]> => {
    const params = role ? { role } : {};
    const response = await api.get('/admin/users', { params });
    return response.data.users;
  },
  createUser: async (userData: any): Promise<User> => {
    const response = await api.post('/admin/users', userData);
    return response.data.user;
  },
};

export default api;
