import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
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
  reason: string;
  departureDate: string;
  departureTime: string;
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

/* ================= MAIN COMPONENT ================= */

export default function FacultyDashboard() {
  const { logout, user } = useAuth();

  const [stats, setStats] = useState<Stats>({ pending: 0, approved: 0, rejected: 0 });
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: string } | null>(null);

  useEffect(() => {
    api
      .get('/dashboard/faculty')
      .then(res => {
        setStats(res.data.statistics);
        setRequests(res.data.requests || []);
      })
      .catch(err => {
        if (err.response?.status === 401) logout();
      })
      .finally(() => setLoading(false));
  }, [logout]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ================= HEADER ================= */}
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

      {/* ================= STATS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Pending" value={stats.pending} icon="⏳" />
        <StatCard label="Approved" value={stats.approved} icon="✅" />
        <StatCard label="Rejected" value={stats.rejected} icon="❌" />
      </div>

      {/* ================= REQUESTS LIST ================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span>📋</span> Your Requests
          </h2>
          {requests.length > 0 && (
            <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-sm font-semibold">
              {requests.length} total
            </span>
          )}
        </div>

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
              return (
                <div
                  key={reqId}
                  className="bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-xl overflow-hidden hover:shadow-md hover:border-blue-300 transition-all"
                >
                  {/* Request Header - clickable to details */}
                  <Link to={`/requests/${reqId}`} className="block p-5">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap mb-2">
                          <StatusBadge status={req.status} />
                          {req.urgencyLevel && <UrgencyBadge level={req.urgencyLevel} />}
                          {/* ✅ Show attachment count badge */}
                          {req.attachments && req.attachments.length > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 border border-indigo-300 rounded-lg text-xs font-semibold">
                              📎 {req.attachments.length} file{req.attachments.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        <p className="text-slate-800 font-medium line-clamp-2 mb-2">{req.reason}</p>

                        <div className="flex items-center gap-4 text-sm text-slate-600 flex-wrap">
                          <span>📅 {new Date(req.departureDate).toLocaleDateString()}</span>
                          <span>🕐 {req.departureTime}</span>
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

                  {/* ✅ HOD RESPONSE - for REJECTED requests */}
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

                  {/* ✅ APPROVED - show exit pass */}
                  {req.status === 'APPROVED' && req.exitPassNumber && (
                    <div className="mx-5 mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
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

                  {/* ✅ SUPPORTING DOCUMENTS SECTION */}
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
                              {/* Preview for images */}
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
                              {/* Download */}
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
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ✅ IMAGE PREVIEW MODAL */}
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

/* ================= SMALL COMPONENTS ================= */

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
