// frontend/src/pages/FacultyDashboard.tsx
// ✅ COMPLETE FIXED VERSION - All bugs fixed, all features working

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

/* ================= TYPES ================= */

type Stats = {
  pending: number;
  approved: number;
  rejected: number;
};

type Attachment = {
  filename: string;
  originalName: string;
  path: string;
  mimetype: string;
  size: number;
  uploadedAt: string;
};

type RequestItem = {
  _id: string;
  id?: string;
  leaveType: 'PARTIAL' | 'FULL_DAY';
  reason: string;
  departureDate: string;
  departureTime?: string;
  expectedReturnTime?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MORE_INFO_NEEDED';
  urgencyLevel?: string;
  destination?: string;
  rejectionReason?: string;
  hodComments?: string;
  exitPassNumber?: string;
  qrCode?: string;
  attachments?: Attachment[];
  submittedAt?: string;
  faculty?: {
    _id?: string;
    id?: string;
    firstName: string;
    lastName: string;
    email: string;
    employeeId: string;
    department: string;
  };
};

/* ================= HELPERS ================= */

const getFileIcon = (mimetype: string) => {
  if (mimetype.includes('pdf')) return '📄';
  if (mimetype.includes('image')) return '🖼️';
  if (mimetype.includes('word') || mimetype.includes('document')) return '📝';
  return '📎';
};

const getFileUrl = (path: string) => {
  const API_BASE = (import.meta as any).env?.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
  return `${API_BASE}${path}`;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatLeaveType = (type: 'PARTIAL' | 'FULL_DAY') => {
  return type === 'FULL_DAY' ? 'Full Day' : 'Partial Day';
};

const hasDelegatedRights = (user: any) => {
  if (!user || !user.delegationEndDate) return false;
  const now = new Date();
  const endDate = new Date(user.delegationEndDate);
  return endDate > now && (user.delegationPermissions?.length || 0) > 0;
};

const canEditRequest = (request: RequestItem, userId: string) => {
  if (request.status !== 'PENDING') return false;
  return true;
};




/* ================= MAIN COMPONENT ================= */

export default function FacultyDashboard() {
  const { logout, user } = useAuth();
  if (!user) return null;

  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'my-requests' | 'department-requests'>('my-requests');

  const [stats, setStats] = useState<Stats>({ pending: 0, approved: 0, rejected: 0 });
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [departmentRequests, setDepartmentRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: string } | null>(null);

  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedQRRequest, setSelectedQRRequest] = useState<RequestItem | null>(null);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [hodComments, setHodComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await api.post(`/requests/${id}/cancel`, {
        cancellationReason: reason
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Request cancelled successfully');
      setShowCancelModal(false);
      setSelectedRequest(null);
      setCancellationReason('');
      loadData();
    },
    onError: (error: any) => {
      console.error('Cancel error:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel request');
    }
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, comments }: { id: string; comments: string }) => {
      const response = await api.post(`/requests/${id}/approve`, {
        hodComments: comments || 'Approved by delegated faculty'
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Request approved successfully');
      setShowApproveModal(false);
      setSelectedRequest(null);
      setHodComments('');
      loadData();
    },
    onError: (error: any) => {
      console.error('Approve error:', error);
      toast.error(error.response?.data?.message || 'Failed to approve request');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason, comments }: {
      id: string;
      reason: string;
      comments: string
    }) => {
      const response = await api.post(`/requests/${id}/reject`, {
        rejectionReason: reason,
        hodComments: comments || 'Rejected by delegated faculty'
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Request rejected successfully');
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectionReason('');
      setHodComments('');
      loadData();
    },
    onError: (error: any) => {
      console.error('Reject error:', error);
      toast.error(error.response?.data?.message || 'Failed to reject request');
    }
  });

  const loadData = () => {
    api
      .get('/dashboard/faculty')
      .then(res => {
        console.log('✅ Dashboard API response:', res.data);

        // ✅ FIXED: Handle flat response structure from backend
        setStats({
          pending: res.data.pendingRequests || 0,
          approved: res.data.approvedRequests || 0,
          rejected: res.data.rejectedRequests || 0,
        });

        // ✅ FIXED: Backend returns 'recentRequests' not 'requests'
        setRequests(res.data.recentRequests || res.data.requests || []);
      })
      .catch(err => {
        if (err.response?.status === 401) logout();
      })
      .finally(() => setLoading(false));

    if (hasDelegatedRights(user)) {
      api.get('/requests', { params: { status: 'PENDING' } })
        .then(res => {
          setDepartmentRequests(res.data.requests || []);
        })
        .catch(err => {
          console.error('Failed to load department requests:', err);
        });
    }
  };

  useEffect(() => {
    loadData();
  }, [logout, user]);

  const handleCancelClick = (request: RequestItem) => {
    setSelectedRequest(request);
    setShowCancelModal(true);
  };

  const handleCancelConfirm = () => {
    if (!cancellationReason.trim() || cancellationReason.length < 5) {
      toast.error('Please provide a reason (minimum 5 characters)');
      return;
    }

    const reqId = selectedRequest?.id || selectedRequest?._id;
    if (reqId) {
      cancelMutation.mutate({ id: reqId, reason: cancellationReason });
    }
  };

  const handleApprove = () => {
    const reqId = selectedRequest?.id || selectedRequest?._id;
    if (reqId) {
      approveMutation.mutate({ id: reqId, comments: hodComments });
    }
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    const reqId = selectedRequest?.id || selectedRequest?._id;
    if (reqId) {
      rejectMutation.mutate({
        id: reqId,
        reason: rejectionReason,
        comments: hodComments
      });
    }
  };

  if (loading) return <LoadingSpinner />;

  const showDelegationBanner = hasDelegatedRights(user);
  const showDelegationTab = showDelegationBanner;

  return (
    <div className="space-y-6 animate-fade-in">

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-8 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text mb-2">
              Welcome back, {user?.firstName}! 👋
            </h1>
            <p className="text-slate-700">Manage your early departure requests</p>
          </div>
          <Link
            to="/requests/new"
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <span>➕</span>
            <span>New Request</span>
          </Link>
        </div>
      </div>

      {showDelegationBanner && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg shadow-sm">
          <div className="flex items-center">
            <span className="text-2xl mr-3">🛡️</span>
            <div>
              <p className="font-semibold text-blue-900">Delegated HOD Rights Active</p>
              <p className="text-sm text-blue-700">
                You have been granted approval rights until{' '}
                {user?.delegationEndDate &&
                  new Date(user.delegationEndDate).toLocaleDateString('en-IN')}

              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Pending" value={stats?.pending ?? 0} icon="⏳" />
        <StatCard label="Approved" value={stats.approved} icon="✅" />
        <StatCard label="Rejected" value={stats.rejected} icon="❌" />
      </div>

      {showDelegationTab && (
        <div className="bg-white border border-slate-200 rounded-t-2xl">
          <div className="border-b border-slate-200 flex">
            <button
              onClick={() => setActiveTab('my-requests')}
              className={`flex-1 px-6 py-4 font-semibold transition-all ${activeTab === 'my-requests'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
            >
              📋 My Requests
            </button>
            <button
              onClick={() => setActiveTab('department-requests')}
              className={`flex-1 px-6 py-4 font-semibold transition-all ${activeTab === 'department-requests'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
            >
              🛡️ Department Requests (Delegated)
            </button>
          </div>
        </div>
      )}

      <div className={`bg-white border border-slate-200 ${showDelegationTab ? 'rounded-b-2xl border-t-0' : 'rounded-2xl'} p-6 shadow-sm`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span>{activeTab === 'my-requests' ? '📋' : '🛡️'}</span>
            {activeTab === 'my-requests' ? 'Your Requests' : 'Department Requests'}
          </h2>
          {((activeTab === 'my-requests' && requests.length > 0) ||
            (activeTab === 'department-requests' && departmentRequests.length > 0)) && (
              <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-sm font-semibold">
                {activeTab === 'my-requests' ? requests.length : departmentRequests.length} total
              </span>
            )}
        </div>

        {activeTab === 'my-requests' && (
          <>
            {requests.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <p className="text-slate-600 font-medium mb-4">No requests yet</p>
                <Link
                  to="/requests/new"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all"
                >
                  <span>➕</span> Create Your First Request
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map(req => {
                  const reqId = req.id || req._id;
                  const isPending = req.status === 'PENDING';
                  const canEdit = canEditRequest(req, user?.id || '');

                  return (
                    <div
                      key={reqId}
                      className="bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-xl overflow-hidden hover:shadow-md hover:border-blue-300 transition-all"
                    >
                      <Link to={`/requests/${reqId}`} className="block p-5">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap mb-2">
                              <StatusBadge status={req.status} />
                              {req.urgencyLevel && <UrgencyBadge level={req.urgencyLevel} />}
                              <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 border border-purple-300 rounded-lg text-xs font-semibold">
                                {formatLeaveType(req.leaveType)}
                              </span>
                              {req.attachments && req.attachments.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 border border-indigo-300 rounded-lg text-xs font-semibold">
                                  📎 {req.attachments.length} file{req.attachments.length > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>

                            <p className="text-slate-800 font-medium line-clamp-2 mb-2">{req.reason}</p>

                            <div className="flex items-center gap-4 text-sm text-slate-600 flex-wrap">
                              <span>📅 {new Date(req.departureDate).toLocaleDateString()}</span>
                              <span>🕐 {req.leaveType === 'FULL_DAY' ? 'Full Day' : req.departureTime}</span>
                              {req.destination && <span>📍 {req.destination}</span>}
                              {req.submittedAt && (
                                <span className="text-slate-400">
                                  Submitted {new Date(req.submittedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-blue-600 group-hover:translate-x-1 transition-transform flex-shrink-0 text-lg">→</span>
                        </div>
                      </Link>

                      {canEdit && isPending && (
                        <div className="px-5 pb-4 flex gap-2">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              navigate(`/requests/${reqId}/edit`);
                            }}
                            className="flex-1 flex items-center justify-center px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-semibold transition-all"
                          >
                            <span className="mr-2">✏️</span> Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              handleCancelClick(req);
                            }}
                            className="flex-1 flex items-center justify-center px-4 py-2 border-2 border-red-600 text-red-600 rounded-lg hover:bg-red-50 font-semibold transition-all"
                          >
                            <span className="mr-2">❌</span> Cancel
                          </button>
                        </div>
                      )}

                      {req.status === 'REJECTED' && (req.rejectionReason || req.hodComments) && (
                        <div className="mx-5 mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <span className="text-lg">💬</span>
                            <div className="flex-1">
                              <div className="text-xs font-semibold text-rose-700 mb-1">HOD Response</div>
                              {req.rejectionReason && (
                                <p className="text-sm text-rose-900">
                                  <span className="font-semibold">Reason:</span> {req.rejectionReason}
                                </p>
                              )}
                              {req.hodComments && (
                                <p className="text-sm text-rose-800 mt-1">
                                  <span className="font-semibold">Comments:</span> {req.hodComments}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {req.status === 'APPROVED' && req.exitPassNumber && (
                        <div
                          onClick={(e) => {
                            e.preventDefault();
                            setSelectedQRRequest(req);
                            setShowQRModal(true);
                          }}
                          className="mx-5 mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg cursor-pointer hover:bg-emerald-100 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span>🎫</span>
                            <span className="text-sm font-semibold text-emerald-700">
                              Exit Pass: {req.exitPassNumber}
                            </span>
                            <span className="text-xs text-emerald-600 ml-auto">
                              Click to view QR code →
                            </span>
                          </div>
                        </div>
                      )}



                      {req.attachments && req.attachments.length > 0 && (
                        <div className="border-t border-slate-200 bg-white px-5 py-4">
                          <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                            <span>📎</span> Supporting Documents ({req.attachments.length})
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {req.attachments.map((file, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                              >
                                <span className="text-2xl flex-shrink-0">
                                  {getFileIcon(file.mimetype)}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-800 truncate">
                                    {file.originalName}
                                  </p>
                                  <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {file.mimetype.includes('image') && (
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        setPreviewFile({
                                          url: getFileUrl(file.path),
                                          name: file.originalName,
                                          type: file.mimetype
                                        });
                                      }}
                                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold hover:bg-blue-200 transition-colors"
                                    >
                                      👁️ View
                                    </button>
                                  )}
                                  <a
                                    href={getFileUrl(file.path)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-semibold hover:bg-emerald-200 transition-colors"
                                  >
                                    ⬇️ Open
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* QR CODE MODAL */}
                      {showQRModal && selectedQRRequest && (
                        <div
                          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                          onClick={() => setShowQRModal(false)}
                        >
                          <div
                            className="bg-white rounded-2xl overflow-hidden shadow-2xl max-w-md w-full"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-emerald-50">
                              <h3 className="font-bold text-emerald-900 flex items-center gap-2">
                                <span>🎫</span> Exit Pass Details
                              </h3>
                              <button
                                onClick={() => setShowQRModal(false)}
                                className="text-slate-500 hover:text-slate-800 text-2xl font-bold"
                              >
                                ✕
                              </button>
                            </div>

                            <div className="p-6 text-center">
                              {selectedQRRequest.qrCode && (
                                <div className="mb-6">
                                  <img
                                    src={selectedQRRequest.qrCode}
                                    alt="Exit Pass QR Code"
                                    className="w-64 h-64 mx-auto border-4 border-emerald-200 rounded-xl shadow-lg"
                                  />
                                </div>
                              )}

                              <div className="bg-emerald-50 rounded-lg p-4 mb-4">
                                <p className="text-sm text-emerald-700 mb-1">Exit Pass Number</p>
                                <p className="text-2xl font-bold text-emerald-900">
                                  {selectedQRRequest.exitPassNumber}
                                </p>
                              </div>

                              <div className="bg-slate-50 rounded-lg p-4 text-left space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-600">Date:</span>
                                  <span className="font-semibold">
                                    {new Date(selectedQRRequest.departureDate).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-600">Time:</span>
                                  <span className="font-semibold">{selectedQRRequest.departureTime}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-600">Destination:</span>
                                  <span className="font-semibold">{selectedQRRequest.destination || 'N/A'}</span>
                                </div>
                              </div>

                              <p className="text-xs text-slate-500 mt-4">
                                Show this QR code at the gate for verification
                              </p>
                            </div>

                            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                              <button
                                onClick={() => {
                                  if (selectedQRRequest.qrCode) {
                                    const link = document.createElement('a');
                                    link.href = selectedQRRequest.qrCode;
                                    link.download = `exit-pass-${selectedQRRequest.exitPassNumber}.png`;
                                    link.click();
                                  }
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 text-sm"
                              >
                                📥 Download QR
                              </button>
                              <button
                                onClick={() => setShowQRModal(false)}
                                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 text-sm"
                              >
                                Close
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'department-requests' && (
          <>
            {departmentRequests.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🛡️</div>
                <p className="text-slate-600 font-medium mb-4">No department requests</p>
              </div>
            ) : (
              <div className="space-y-4">
                {departmentRequests.map(req => {
                  const reqId = req.id || req._id;
                  const isPending = req.status === 'PENDING';
                  const isOwnRequest = req.faculty?.email === user?.email;

                  return (
                    <div
                      key={reqId}
                      className="bg-gradient-to-r from-slate-50 to-purple-50 border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-all"
                    >
                      <div className="p-5">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 flex-wrap mb-3">
                              <StatusBadge status={req.status} />
                              {req.urgencyLevel && <UrgencyBadge level={req.urgencyLevel} />}
                              <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 border border-purple-300 rounded-lg text-xs font-semibold">
                                {formatLeaveType(req.leaveType)}
                              </span>
                              {isOwnRequest && (
                                <span className="inline-flex items-center px-2 py-1 bg-amber-100 text-amber-700 border border-amber-300 rounded-lg text-xs font-semibold">
                                  👤 Your Request
                                </span>
                              )}
                            </div>

                            {req.faculty && (
                              <div className="mb-2 p-2 bg-white rounded-lg border border-slate-200">
                                <div className="text-xs text-slate-600 mb-1">Faculty</div>
                                <div className="font-semibold text-slate-900">
                                  {req.faculty.firstName} {req.faculty.lastName}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {req.faculty.email} • {req.faculty.employeeId}
                                </div>
                              </div>
                            )}

                            <p className="text-slate-800 font-medium mb-2">{req.reason}</p>

                            <div className="flex items-center gap-4 text-sm text-slate-600 flex-wrap">
                              <span>📅 {new Date(req.departureDate).toLocaleDateString()}</span>
                              <span>🕐 {req.leaveType === 'FULL_DAY' ? 'Full Day' : req.departureTime}</span>
                              {req.destination && <span>📍 {req.destination}</span>}
                            </div>
                          </div>
                        </div>

                        {isPending && !isOwnRequest && (
                          <div className="mt-4 flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedRequest(req);
                                setShowApproveModal(true);
                              }}
                              className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-all"
                            >
                              <span className="mr-2">✅</span> Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedRequest(req);
                                setShowRejectModal(true);
                              }}
                              className="flex-1 flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-all"
                            >
                              <span className="mr-2">❌</span> Reject
                            </button>
                            <Link
                              to={`/requests/${reqId}`}
                              className="px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-semibold transition-all"
                            >
                              👁️ View
                            </Link>
                          </div>
                        )}

                        {isPending && isOwnRequest && (
                          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-sm text-amber-800">
                              ⚠️ You cannot approve your own request
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>





      {showCancelModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span>❌</span> Cancel Request
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to cancel this request? This action cannot be undone.
            </p>
            <div className="bg-blue-50 p-3 rounded-lg mb-4">
              <p className="text-sm font-semibold text-blue-900 mb-1">Request Details:</p>
              <p className="text-sm text-blue-800">{selectedRequest.reason}</p>
              <p className="text-xs text-blue-600 mt-1">
                {new Date(selectedRequest.departureDate).toLocaleDateString()} • {formatLeaveType(selectedRequest.leaveType)}
              </p>
            </div>
            <textarea
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="Please provide a reason for cancellation (minimum 5 characters)..."
              rows={4}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg mb-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedRequest(null);
                  setCancellationReason('');
                }}
                className="px-5 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition-all"
              >
                No, Keep It
              </button>
              <button
                onClick={handleCancelConfirm}
                disabled={cancelMutation.isPending}
                className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-all disabled:opacity-50"
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Yes, Cancel Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span>✅</span> Approve Request
            </h3>
            <p className="text-sm text-gray-700 mb-4">
              Approve request from <strong>{selectedRequest.faculty?.firstName} {selectedRequest.faculty?.lastName}</strong>?
            </p>
            <div className="bg-green-50 p-3 rounded-lg mb-4">
              <p className="text-sm font-semibold text-green-900 mb-1">Request:</p>
              <p className="text-sm text-green-800">{selectedRequest.reason}</p>
              <p className="text-xs text-green-600 mt-1">
                {new Date(selectedRequest.departureDate).toLocaleDateString()} • {formatLeaveType(selectedRequest.leaveType)}
              </p>
            </div>
            <textarea
              value={hodComments}
              onChange={(e) => setHodComments(e.target.value)}
              placeholder="Comments (optional)"
              rows={3}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg mb-4 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setSelectedRequest(null);
                  setHodComments('');
                }}
                className="px-5 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={approveMutation.isPending}
                className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-all disabled:opacity-50"
              >
                {approveMutation.isPending ? 'Approving...' : 'Approve Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span>❌</span> Reject Request
            </h3>
            <p className="text-sm text-gray-700 mb-4">
              Reject request from <strong>{selectedRequest.faculty?.firstName} {selectedRequest.faculty?.lastName}</strong>?
            </p>
            <div className="bg-red-50 p-3 rounded-lg mb-4">
              <p className="text-sm font-semibold text-red-900 mb-1">Request:</p>
              <p className="text-sm text-red-800">{selectedRequest.reason}</p>
            </div>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Rejection reason (required)*"
              rows={3}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg mb-3 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
            />
            <textarea
              value={hodComments}
              onChange={(e) => setHodComments(e.target.value)}
              placeholder="Additional comments (optional)"
              rows={2}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg mb-4 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedRequest(null);
                  setRejectionReason('');
                  setHodComments('');
                }}
                className="px-5 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={rejectMutation.isPending}
                className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-all disabled:opacity-50"
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewFile && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden shadow-2xl max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                🖼️ {previewFile.name}
              </h3>
              <button
                onClick={() => setPreviewFile(null)}
                className="text-slate-500 hover:text-slate-800 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <img
                src={previewFile.url}
                alt={previewFile.name}
                className="w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-3">
              <a
                href={previewFile.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 text-sm"
              >
                ⬇️ Download
              </a>
              <button
                onClick={() => setPreviewFile(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: any) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="text-4xl">{icon}</div>
        <div className="text-3xl font-bold text-slate-800">{value}</div>
      </div>
      <div className="text-sm font-semibold text-slate-700">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700 border-amber-300',
    APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    REJECTED: 'bg-rose-100 text-rose-700 border-rose-300',
    MORE_INFO_NEEDED: 'bg-blue-100 text-blue-700 border-blue-300'
  };
  const labels: Record<string, string> = {
    PENDING: '⏳ Pending',
    APPROVED: '✅ Approved',
    REJECTED: '❌ Rejected',
    MORE_INFO_NEEDED: 'ℹ️ More Info Needed'
  };
  return (
    <span className={`inline-flex items-center px-3 py-1.5 text-sm rounded-lg font-semibold border ${styles[status]}`}>
      {labels[status] || status}
    </span>
  );
}

function UrgencyBadge({ level }: { level: string }) {
  const styles: any = {
    CRITICAL: 'bg-rose-100 text-rose-700 border-rose-300',
    HIGH: 'bg-orange-100 text-orange-700 border-orange-300',
    MEDIUM: 'bg-amber-100 text-amber-700 border-amber-300',
    LOW: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  };
  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs rounded-lg font-semibold border ${styles[level] || 'bg-slate-200'}`}>
      🚨 {level}
    </span>
  );
}