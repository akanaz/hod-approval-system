// frontend/src/pages/HODDashboard.tsx
// ✅ COMPLETE FIXED VERSION - All features + Delegation tab + New Request button

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import DelegationManager from '../components/DelegationManager';
import toast from 'react-hot-toast';

type RequestItem = {
  id: string;
  faculty: {
    firstName: string;
    lastName: string;
    email: string;
    employeeId: string;
    department: string;
  };
  departureDate: string;
  departureTime: string;
  leaveType?: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MORE_INFO_NEEDED';
  urgencyLevel: string;
  submittedAt: string;
  destination?: string;
};

type Stats = {
  pending: number;
  approved: number;
  rejected: number;
  moreInfoNeeded: number;
};

type UrgencyCount = {
  CRITICAL: number;
  HIGH: number;
  MEDIUM: number;
  LOW: number;
};

export default function HODDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [allRequests, setAllRequests] = useState<RequestItem[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL' | 'DELEGATION'>('PENDING');
  
  const [sortBy, setSortBy] = useState<'urgency' | 'time-desc' | 'time-asc' | 'faculty'>('urgency');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState<string>('');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('');

  const [stats, setStats] = useState<Stats>({
    pending: 0,
    approved: 0,
    rejected: 0,
    moreInfoNeeded: 0
  });

  const [urgencyBreakdown, setUrgencyBreakdown] = useState<UrgencyCount>({
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0
  });

  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showMoreInfoModal, setShowMoreInfoModal] = useState(false);
  const [hodComments, setHodComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [moreInfoReason, setMoreInfoReason] = useState('');

  const uniqueFaculty = Array.from(
    new Set(allRequests.map(r => `${r.faculty.firstName} ${r.faculty.lastName}`))
  ).sort();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/requests');
      const requests = res.data.requests || [];
      
      setAllRequests(requests);
      
      const statsCalc = {
        pending: requests.filter((r: RequestItem) => r.status === 'PENDING').length,
        approved: requests.filter((r: RequestItem) => r.status === 'APPROVED').length,
        rejected: requests.filter((r: RequestItem) => r.status === 'REJECTED').length,
        moreInfoNeeded: requests.filter((r: RequestItem) => r.status === 'MORE_INFO_NEEDED').length
      };
      setStats(statsCalc);

      const urgencyCalc: UrgencyCount = {
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0
      };
      requests.forEach((r: RequestItem) => {
        if (r.urgencyLevel && urgencyCalc.hasOwnProperty(r.urgencyLevel)) {
          urgencyCalc[r.urgencyLevel as keyof UrgencyCount]++;
        }
      });
      setUrgencyBreakdown(urgencyCalc);
      
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    applyFiltersAndSort();
  }, [activeTab, sortBy, searchTerm, selectedFaculty, urgencyFilter, allRequests]);

  const applyFiltersAndSort = () => {
    let filtered = [...allRequests];

    if (activeTab !== 'ALL' && activeTab !== 'DELEGATION') {
      filtered = filtered.filter(r => r.status === activeTab);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.faculty.firstName.toLowerCase().includes(term) ||
        r.faculty.lastName.toLowerCase().includes(term) ||
        r.faculty.email.toLowerCase().includes(term) ||
        r.reason.toLowerCase().includes(term)
      );
    }

    if (selectedFaculty) {
      filtered = filtered.filter(r =>
        `${r.faculty.firstName} ${r.faculty.lastName}` === selectedFaculty
      );
    }

    if (urgencyFilter) {
      filtered = filtered.filter(r => r.urgencyLevel === urgencyFilter);
    }

    const urgencyOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

    filtered.sort((a, b) => {
      if (sortBy === 'urgency') {
        return urgencyOrder[a.urgencyLevel as keyof typeof urgencyOrder] - 
               urgencyOrder[b.urgencyLevel as keyof typeof urgencyOrder];
      }
      if (sortBy === 'time-desc') {
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      }
      if (sortBy === 'time-asc') {
        return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      }
      if (sortBy === 'faculty') {
        return `${a.faculty.firstName} ${a.faculty.lastName}`.localeCompare(
          `${b.faculty.firstName} ${b.faculty.lastName}`
        );
      }
      return 0;
    });

    setFilteredRequests(filtered);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    try {
      await api.post(`/requests/${selectedRequest.id}/approve`, { hodComments });
      toast.success('Request approved successfully');
      setShowApproveModal(false);
      setSelectedRequest(null);
      setHodComments('');
      fetchRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    try {
      await api.post(`/requests/${selectedRequest.id}/reject`, {
        rejectionReason,
        hodComments
      });
      toast.success('Request rejected');
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectionReason('');
      setHodComments('');
      fetchRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject');
    }
  };

  const handleMoreInfo = async () => {
    if (!selectedRequest || !moreInfoReason.trim()) {
      toast.error('Please provide a reason for requesting more info');
      return;
    }
    try {
      await api.post(`/requests/${selectedRequest.id}/request-more-info`, {
        reason: moreInfoReason
      });
      toast.success('Request for more information sent');
      setShowMoreInfoModal(false);
      setSelectedRequest(null);
      setMoreInfoReason('');
      fetchRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to request more info');
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedFaculty('');
    setUrgencyFilter('');
    setSortBy('urgency');
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                HOD Dashboard
              </h1>
              <p className="text-slate-600">Welcome back, {user?.firstName}! Manage your department's requests</p>
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

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Pending" value={stats.pending} icon="⏳" color="amber" />
          <StatCard label="Approved" value={stats.approved} icon="✅" color="green" />
          <StatCard label="Rejected" value={stats.rejected} icon="❌" color="red" />
          <StatCard label="More Info" value={stats.moreInfoNeeded} icon="ℹ️" color="blue" />
        </div>

        {/* Urgency Breakdown */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span>🚨</span> Urgency Breakdown
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <UrgencyCard label="Critical" count={urgencyBreakdown.CRITICAL} color="rose" />
            <UrgencyCard label="High" count={urgencyBreakdown.HIGH} color="orange" />
            <UrgencyCard label="Medium" count={urgencyBreakdown.MEDIUM} color="amber" />
            <UrgencyCard label="Low" count={urgencyBreakdown.LOW} color="emerald" />
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'PENDING', label: 'Pending', icon: '⏳' },
                { key: 'APPROVED', label: 'Approved', icon: '✅' },
                { key: 'REJECTED', label: 'Rejected', icon: '❌' },
                { key: 'ALL', label: 'All', icon: '📋' },
                { key: 'DELEGATION', label: 'Delegation', icon: '🛡️' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-6 py-3 font-semibold rounded-xl transition-all ${
                    activeTab === tab.key
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                  {tab.key !== 'DELEGATION' && tab.key !== 'ALL' && (
                    <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                      {stats[tab.key.toLowerCase() as keyof Stats]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'DELEGATION' ? (
            <div className="p-6">
              <DelegationManager />
            </div>
          ) : (
            <>
              {/* Filters */}
              <div className="p-6 bg-slate-50 border-b border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      🔍 Search Faculty
                    </label>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Type faculty name..."
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      📊 Sort By
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="urgency">Urgency (High to Low)</option>
                      <option value="time-desc">Time (Newest First)</option>
                      <option value="time-asc">Time (Oldest First)</option>
                      <option value="faculty">Faculty Name</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      🚨 Filter by Urgency
                    </label>
                    <select
                      value={urgencyFilter}
                      onChange={(e) => setUrgencyFilter(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Urgencies</option>
                      <option value="CRITICAL">Critical</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      👤 Filter by Faculty
                    </label>
                    <select
                      value={selectedFaculty}
                      onChange={(e) => setSelectedFaculty(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Faculty</option>
                      {uniqueFaculty.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={resetFilters}
                  className="mt-4 px-4 py-2 text-sm bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                >
                  🔄 Reset Filters
                </button>
              </div>

              {/* Requests List */}
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-slate-600">
                    Showing {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {filteredRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📭</div>
                    <p className="text-slate-600 font-medium">No requests found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredRequests.map(req => (
                      <div
                        key={req.id}
                        className="bg-gradient-to-r from-white to-slate-50 border border-slate-200 rounded-xl p-5 hover:shadow-lg transition-all"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <StatusBadge status={req.status} />
                              <UrgencyBadge level={req.urgencyLevel} />
                              {req.leaveType && (
                                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold">
                                  {req.leaveType === 'FULL_DAY' ? 'Full Day' : 'Partial Day'}
                                </span>
                              )}
                            </div>

                            <div className="mb-2">
                              <p className="font-bold text-slate-900 text-lg">
                                {req.faculty.firstName} {req.faculty.lastName}
                              </p>
                              <p className="text-sm text-slate-600">
                                {req.faculty.email} • {req.faculty.employeeId}
                              </p>
                            </div>

                            <p className="text-slate-800 mb-2">{req.reason}</p>

                            <div className="flex items-center gap-4 text-sm text-slate-600">
                              <span>📅 {new Date(req.departureDate).toLocaleDateString()}</span>
                              <span>🕐 {req.departureTime}</span>
                              {req.destination && <span>📍 {req.destination}</span>}
                            </div>
                          </div>

                          <button
                            onClick={() => navigate(`/requests/${req.id}`)}
                            className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            View Details →
                          </button>
                        </div>

                        {req.status === 'PENDING' && (
                          <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200">
                            <button
                              onClick={() => {
                                setSelectedRequest(req);
                                setShowApproveModal(true);
                              }}
                              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors"
                            >
                              ✅ Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedRequest(req);
                                setShowRejectModal(true);
                              }}
                              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-colors"
                            >
                              ❌ Reject
                            </button>
                            <button
                              onClick={() => {
                                setSelectedRequest(req);
                                setShowMoreInfoModal(true);
                              }}
                              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
                            >
                              ℹ️ More Info
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {showApproveModal && selectedRequest && (
        <Modal
          title="✅ Approve Request"
          onClose={() => {
            setShowApproveModal(false);
            setSelectedRequest(null);
            setHodComments('');
          }}
        >
          <p className="text-sm text-slate-700 mb-4">
            Approve request from <strong>{selectedRequest.faculty.firstName} {selectedRequest.faculty.lastName}</strong>?
          </p>
          <textarea
            value={hodComments}
            onChange={(e) => setHodComments(e.target.value)}
            placeholder="Comments (optional)"
            rows={3}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg mb-4"
          />
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowApproveModal(false);
                setSelectedRequest(null);
                setHodComments('');
              }}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleApprove}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Approve
            </button>
          </div>
        </Modal>
      )}

      {showRejectModal && selectedRequest && (
        <Modal
          title="❌ Reject Request"
          onClose={() => {
            setShowRejectModal(false);
            setSelectedRequest(null);
            setRejectionReason('');
            setHodComments('');
          }}
        >
          <p className="text-sm text-slate-700 mb-4">
            Reject request from <strong>{selectedRequest.faculty.firstName} {selectedRequest.faculty.lastName}</strong>?
          </p>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Rejection reason (required)*"
            rows={3}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg mb-3"
          />
          <textarea
            value={hodComments}
            onChange={(e) => setHodComments(e.target.value)}
            placeholder="Additional comments (optional)"
            rows={2}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg mb-4"
          />
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowRejectModal(false);
                setSelectedRequest(null);
                setRejectionReason('');
                setHodComments('');
              }}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Reject
            </button>
          </div>
        </Modal>
      )}

      {showMoreInfoModal && selectedRequest && (
        <Modal
          title="ℹ️ Request More Information"
          onClose={() => {
            setShowMoreInfoModal(false);
            setSelectedRequest(null);
            setMoreInfoReason('');
          }}
        >
          <p className="text-sm text-slate-700 mb-4">
            Request more information from <strong>{selectedRequest.faculty.firstName} {selectedRequest.faculty.lastName}</strong>
          </p>
          <textarea
            value={moreInfoReason}
            onChange={(e) => setMoreInfoReason(e.target.value)}
            placeholder="What additional information do you need? (required)*"
            rows={4}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg mb-4"
          />
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowMoreInfoModal(false);
                setSelectedRequest(null);
                setMoreInfoReason('');
              }}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleMoreInfo}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Send Request
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color }: any) {
  const colors: any = {
    amber: 'from-amber-50 to-amber-100 border-amber-200',
    green: 'from-green-50 to-green-100 border-green-200',
    red: 'from-red-50 to-red-100 border-red-200',
    blue: 'from-blue-50 to-blue-100 border-blue-200'
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-2xl p-6 shadow-lg`}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-4xl">{icon}</span>
        <span className="text-3xl font-bold text-slate-800">{value}</span>
      </div>
      <p className="text-sm font-semibold text-slate-700">{label}</p>
    </div>
  );
}

function UrgencyCard({ label, count, color }: any) {
  const colors: any = {
    rose: 'bg-rose-100 text-rose-700',
    orange: 'bg-orange-100 text-orange-700',
    amber: 'bg-amber-100 text-amber-700',
    emerald: 'bg-emerald-100 text-emerald-700'
  };
  return (
    <div className={`${colors[color]} rounded-xl p-4 text-center`}>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-sm font-semibold">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: any) {
  const styles: any = {
    PENDING: 'bg-amber-100 text-amber-700 border-amber-300',
    APPROVED: 'bg-green-100 text-green-700 border-green-300',
    REJECTED: 'bg-red-100 text-red-700 border-red-300',
    MORE_INFO_NEEDED: 'bg-blue-100 text-blue-700 border-blue-300'
  };
  return (
    <span className={`px-3 py-1 ${styles[status]} border rounded-lg text-xs font-bold`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function UrgencyBadge({ level }: any) {
  const styles: any = {
    CRITICAL: 'bg-rose-100 text-rose-700',
    HIGH: 'bg-orange-100 text-orange-700',
    MEDIUM: 'bg-amber-100 text-amber-700',
    LOW: 'bg-emerald-100 text-emerald-700'
  };
  return (
    <span className={`px-2 py-1 ${styles[level]} rounded-lg text-xs font-bold`}>
      🚨 {level}
    </span>
  );
}

function Modal({ title, onClose, children }: any) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}