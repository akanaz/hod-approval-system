// frontend/src/pages/DeanDashboard.tsx
// ✅ COMPLETELY REDESIGNED - Clean, organized, professional UI

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FileText, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface EarlyDepartureRequest {
  id: string;
  faculty: {
    firstName: string;
    lastName: string;
    email: string;
    employeeId: string;
    department: string;
  };
  leaveType: 'PARTIAL' | 'FULL_DAY';
  departureDate: string;
  departureTime?: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  urgencyLevel: string;
  destination?: string;
  submittedAt: string;
}

interface HODWithStats {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  requestStats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
}

const DeanDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<EarlyDepartureRequest | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [hodComments, setHodComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showHODs, setShowHODs] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['dean-dashboard'],
    queryFn: async () => {
      const response = await api.get('/dean/dashboard');
      return response.data;
    }
  });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['hod-requests', filter],
    queryFn: async () => {
      const response = await api.get('/dean/hod-requests', {
        params: filter === 'all' ? {} : { status: filter.toUpperCase() }
      });
      return response.data.requests || [];
    }
  });

  const { data: hods = [] } = useQuery({
    queryKey: ['all-hods'],
    queryFn: async () => {
      const response = await api.get('/dean/hods');
      return response.data.hods || [];
    }
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.post(`/requests/${id}/approve`, { hodComments: hodComments || 'Approved by Dean' });
    },
    onSuccess: () => {
      toast.success('Request approved successfully');
      queryClient.invalidateQueries({ queryKey: ['hod-requests'] });
      queryClient.invalidateQueries({ queryKey: ['dean-dashboard'] });
      setShowApproveModal(false);
      setSelectedRequest(null);
      setHodComments('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to approve');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.post(`/requests/${id}/reject`, { 
        rejectionReason: rejectionReason || 'Rejected by Dean', 
        hodComments 
      });
    },
    onSuccess: () => {
      toast.success('Request rejected');
      queryClient.invalidateQueries({ queryKey: ['hod-requests'] });
      queryClient.invalidateQueries({ queryKey: ['dean-dashboard'] });
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectionReason('');
      setHodComments('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reject');
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'APPROVED': return 'bg-green-100 text-green-800 border-green-300';
      case 'REJECTED': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dean Dashboard</h1>
          <p className="text-gray-600 mt-1">Review and approve HOD leave requests</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Requests"
            value={stats?.totalRequests || 0}
            icon={<FileText className="w-6 h-6" />}
            color="blue"
          />
          <StatCard
            title="Pending"
            value={stats?.pendingRequests || 0}
            icon={<Clock className="w-6 h-6" />}
            color="yellow"
          />
          <StatCard
            title="Approved"
            value={stats?.approvedRequests || 0}
            icon={<CheckCircle className="w-6 h-6" />}
            color="green"
          />
          <StatCard
            title="Rejected"
            value={stats?.rejectedRequests || 0}
            icon={<XCircle className="w-6 h-6" />}
            color="red"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Content - Requests List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              
              {/* Filter Tabs */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex gap-2 flex-wrap">
                  <FilterButton
                    label="All"
                    count={stats?.totalRequests || 0}
                    active={filter === 'all'}
                    onClick={() => setFilter('all')}
                  />
                  <FilterButton
                    label="Pending"
                    count={stats?.pendingRequests || 0}
                    active={filter === 'pending'}
                    onClick={() => setFilter('pending')}
                    color="yellow"
                  />
                  <FilterButton
                    label="Approved"
                    count={stats?.approvedRequests || 0}
                    active={filter === 'approved'}
                    onClick={() => setFilter('approved')}
                    color="green"
                  />
                  <FilterButton
                    label="Rejected"
                    count={stats?.rejectedRequests || 0}
                    active={filter === 'rejected'}
                    onClick={() => setFilter('rejected')}
                    color="red"
                  />
                </div>
              </div>

              {/* Requests List */}
              <div className="divide-y divide-gray-200">
                {isLoading ? (
                  <div className="p-12 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4">Loading requests...</p>
                  </div>
                ) : requests.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="font-semibold text-lg">No {filter !== 'all' ? filter : ''} requests</p>
                    <p className="text-sm mt-1">HOD leave requests will appear here</p>
                  </div>
                ) : (
                  requests.map((request: EarlyDepartureRequest) => (
                    <div key={request.id} className="p-6 hover:bg-gray-50 transition-colors">
                      
                      {/* Request Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-lg text-gray-900">
                              {request.faculty.firstName} {request.faculty.lastName}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getUrgencyColor(request.urgencyLevel)}`}>
                              {request.urgencyLevel}
                            </span>
                            {request.leaveType === 'FULL_DAY' && (
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                                Full Day
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {request.faculty.department} • {request.faculty.employeeId}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </div>

                      {/* Request Details */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm">
                          <span className="font-medium text-gray-700 w-24">Date:</span>
                          <span className="text-gray-900">
                            {new Date(request.departureDate).toLocaleDateString()}
                            {request.departureTime && ` at ${request.departureTime}`}
                          </span>
                        </div>
                        <div className="flex items-start text-sm">
                          <span className="font-medium text-gray-700 w-24 flex-shrink-0">Reason:</span>
                          <span className="text-gray-900">{request.reason}</span>
                        </div>
                        {request.destination && (
                          <div className="flex items-center text-sm">
                            <span className="font-medium text-gray-700 w-24">Destination:</span>
                            <span className="text-gray-900">{request.destination}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      {request.status === 'PENDING' && (
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowApproveModal(true);
                            }}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowRejectModal(true);
                            }}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-colors"
                          >
                            ✗ Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - HODs Overview */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 sticky top-6">
              <div 
                className="px-6 py-4 border-b border-gray-200 flex items-center justify-between cursor-pointer"
                onClick={() => setShowHODs(!showHODs)}
              >
                <h2 className="font-bold text-lg">HODs Overview</h2>
                {showHODs ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
              
              {showHODs && (
                <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                  {hods.map((hod: HODWithStats) => (
                    <div key={hod.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {hod.firstName} {hod.lastName}
                      </h3>
                      <p className="text-xs text-gray-600 mb-3">{hod.department}</p>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="text-center p-2 bg-white rounded">
                          <p className="font-bold text-lg">{hod.requestStats.total}</p>
                          <p className="text-gray-600">Total</p>
                        </div>
                        <div className="text-center p-2 bg-yellow-50 rounded">
                          <p className="font-bold text-lg text-yellow-700">{hod.requestStats.pending}</p>
                          <p className="text-gray-600">Pending</p>
                        </div>
                        <div className="text-center p-2 bg-green-50 rounded">
                          <p className="font-bold text-lg text-green-700">{hod.requestStats.approved}</p>
                          <p className="text-gray-600">Approved</p>
                        </div>
                        <div className="text-center p-2 bg-red-50 rounded">
                          <p className="font-bold text-lg text-red-700">{hod.requestStats.rejected}</p>
                          <p className="text-gray-600">Rejected</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Approve Modal */}
        {showApproveModal && selectedRequest && (
          <Modal
            title="Approve Request"
            onClose={() => {
              setShowApproveModal(false);
              setHodComments('');
            }}
          >
            <div className="space-y-4">
              <p className="text-gray-700">
                Approve request from <span className="font-semibold">
                  {selectedRequest.faculty.firstName} {selectedRequest.faculty.lastName}
                </span>?
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comments (Optional)
                </label>
                <textarea
                  value={hodComments}
                  onChange={(e) => setHodComments(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  rows={3}
                  placeholder="Add any comments..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowApproveModal(false);
                    setHodComments('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => approveMutation.mutate(selectedRequest.id)}
                  disabled={approveMutation.isPending}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {approveMutation.isPending ? 'Approving...' : 'Approve'}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Reject Modal */}
        {showRejectModal && selectedRequest && (
          <Modal
            title="Reject Request"
            onClose={() => {
              setShowRejectModal(false);
              setRejectionReason('');
              setHodComments('');
            }}
          >
            <div className="space-y-4">
              <p className="text-gray-700">
                Reject request from <span className="font-semibold">
                  {selectedRequest.faculty.firstName} {selectedRequest.faculty.lastName}
                </span>?
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  rows={3}
                  placeholder="Reason for rejection..."
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason('');
                    setHodComments('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!rejectionReason.trim()) {
                      toast.error('Please provide a rejection reason');
                      return;
                    }
                    rejectMutation.mutate(selectedRequest.id);
                  }}
                  disabled={rejectMutation.isPending}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

// Helper Components
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'yellow' | 'green' | 'red';
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    red: 'bg-red-50 text-red-600 border-red-200',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg border ${colors[color]}`}>
          {icon}
        </div>
      </div>
      <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

interface FilterButtonProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color?: 'yellow' | 'green' | 'red';
}

function FilterButton({ label, count, active, onClick, color }: FilterButtonProps) {
  const colors = {
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    green: 'bg-green-100 text-green-800 border-green-300',
    red: 'bg-red-100 text-red-800 border-red-300',
  };

  const activeClass = active 
    ? `${color ? colors[color] : 'bg-blue-600 text-white'} border-2`
    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50';

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeClass}`}
    >
      {label} <span className="ml-1">({count})</span>
    </button>
  );
}

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export default DeanDashboard;