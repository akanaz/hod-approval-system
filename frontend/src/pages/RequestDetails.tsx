import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

/* ================= TYPES ================= */

type Attachment = {
  filename: string;
  originalName: string;
  path: string;
  mimetype: string;
  size: number;
  uploadedAt: string;
};

type FacultyHistoryItem = {
  id: string;
  departureDate: string;
  status: string;
  urgencyLevel: string;
  reason: string;
  submittedAt: string;
};

type RequestData = {
  id: string;
  faculty: {
    _id?: string;
    firstName: string;
    lastName: string;
    email: string;
    employeeId: string;
    department: string;
    phoneNumber?: string;
  };
  departureDate: string;
  departureTime: string;
  expectedReturnTime?: string;
  reason: string;
  destination?: string;
  urgencyLevel: string;
  status: string;
  hodComments?: string;
  rejectionReason?: string;
  exitPassNumber?: string;
  qrCode?: string;
  currentWorkload?: string;
  coverageArrangement?: string;
  attachments?: Attachment[];
  facultyHistory?: FacultyHistoryItem[];
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
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

export default function RequestDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [request, setRequest] = useState<RequestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [hodComments, setHodComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    api.get(`/requests/${id}`)
      .then(res => setRequest(res.data))
      .catch(() => {
        toast.error('Failed to load request');
        navigate(-1);
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  /* ================= ACTIONS ================= */

  const handleApprove = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await api.patch(`/requests/${id}/approve`, { hodComments });
      toast.success('Request approved! Faculty notified via email.');
      navigate(-1);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!id || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    setActionLoading(true);
    try {
      await api.patch(`/requests/${id}/reject`, { rejectionReason, hodComments });
      toast.success('Request rejected. Faculty notified via email.');
      navigate(-1);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject');
    } finally {
      setActionLoading(false);
      setShowRejectModal(false);
    }
  };

  const handleMoreInfo = async () => {
    if (!id || !hodComments.trim()) {
      toast.error('Please provide comments about what info is needed');
      return;
    }
    setActionLoading(true);
    try {
      await api.patch(`/requests/${id}/request-more-info`, { hodComments });
      toast.success('Request for more information sent');
      navigate(-1);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send request');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!request) return <div className="text-slate-800 text-center py-12">Request not found</div>;

  const isHOD = user?.role === 'HOD' || user?.role === 'ADMIN';
  const canTakeAction = isHOD && (request.status === 'PENDING' || request.status === 'MORE_INFO_NEEDED');
  const hasAttachments = request.attachments && request.attachments.length > 0;

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">

      {/* ================= HEADER ================= */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2 font-medium"
        >
          ← Back
        </button>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-1">Request Details</h1>
            {request.submittedAt && (
              <p className="text-sm text-slate-500">
                Submitted on {new Date(request.submittedAt).toLocaleString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={request.status} />
            <UrgencyBadge level={request.urgencyLevel} />
          </div>
        </div>
      </div>

      <div className="space-y-4">

        {/* ================= FACULTY INFO ================= */}
        <InfoCard title="Faculty Information" icon="👤">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem label="Name" value={`${request.faculty.firstName} ${request.faculty.lastName}`} />
            <InfoItem label="Employee ID" value={request.faculty.employeeId} />
            <InfoItem label="Department" value={request.faculty.department} />
            <InfoItem label="Email" value={request.faculty.email} />
            {request.faculty.phoneNumber && (
              <InfoItem label="Phone" value={request.faculty.phoneNumber} />
            )}
          </div>
        </InfoCard>

        {/* ================= REQUEST DETAILS ================= */}
        <InfoCard title="Request Details" icon="📋">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem label="Departure Date" value={new Date(request.departureDate).toLocaleDateString()} />
            <InfoItem label="Departure Time" value={request.departureTime} />
            {request.expectedReturnTime && (
              <InfoItem label="Expected Return" value={request.expectedReturnTime} />
            )}
            {request.destination && <InfoItem label="Destination" value={request.destination} />}
          </div>

          <div className="mt-4">
            <label className="text-sm font-semibold text-slate-600">Reason</label>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-1 text-slate-800">
              {request.reason}
            </div>
          </div>

          {request.currentWorkload && (
            <div className="mt-4">
              <label className="text-sm font-semibold text-slate-600">Current Workload Context</label>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-1 text-slate-800">
                {request.currentWorkload}
              </div>
            </div>
          )}

          {request.coverageArrangement && (
            <div className="mt-4">
              <label className="text-sm font-semibold text-slate-600">Coverage Arrangement</label>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-1 text-slate-800">
                {request.coverageArrangement}
              </div>
            </div>
          )}
        </InfoCard>

        {/* ✅ SUPPORTING DOCUMENTS - FULL VIEW */}
        {hasAttachments && (
          <InfoCard title="Supporting Documents" icon="📎">
            <p className="text-sm text-slate-500 mb-4">
              {request.attachments!.length} file{request.attachments!.length > 1 ? 's' : ''} attached by faculty
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {request.attachments!.map((file, idx) => (
                <div
                  key={idx}
                  className="flex flex-col bg-slate-50 border border-slate-200 rounded-xl overflow-hidden hover:border-blue-300 transition-colors"
                >
                  {/* Image Preview (inline thumbnail) */}
                  {file.mimetype.includes('image') && (
                    <div
                      className="relative bg-slate-100 cursor-pointer group overflow-hidden"
                      style={{ height: '160px' }}
                      onClick={() => setPreviewFile({ url: getFileUrl(file.path), name: file.originalName })}
                    >
                      <img
                        src={getFileUrl(file.path)}
                        alt={file.originalName}
                        className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                        onError={(e: any) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div
                        className="hidden absolute inset-0 items-center justify-center bg-slate-100"
                        style={{ display: 'none' }}
                      >
                        <span className="text-4xl">🖼️</span>
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="text-white font-semibold text-sm bg-black/50 px-3 py-1 rounded-lg">
                          Click to enlarge
                        </span>
                      </div>
                    </div>
                  )}

                  {/* PDF Icon Preview */}
                  {file.mimetype.includes('pdf') && (
                    <div className="flex items-center justify-center bg-rose-50 h-20">
                      <span className="text-5xl">📄</span>
                    </div>
                  )}

                  {/* Doc Icon Preview */}
                  {(file.mimetype.includes('word') || file.mimetype.includes('document')) && (
                    <div className="flex items-center justify-center bg-blue-50 h-20">
                      <span className="text-5xl">📝</span>
                    </div>
                  )}

                  {/* File Info */}
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{getFileIcon(file.mimetype)}</span>
                      <p className="text-sm font-semibold text-slate-800 truncate flex-1">
                        {file.originalName}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 mb-3">
                      {formatFileSize(file.size)} • Uploaded {new Date(file.uploadedAt).toLocaleDateString()}
                    </p>

                    <div className="flex gap-2">
                      {file.mimetype.includes('image') && (
                        <button
                          onClick={() => setPreviewFile({ url: getFileUrl(file.path), name: file.originalName })}
                          className="flex-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-200 transition-colors text-center"
                        >
                          👁️ Preview
                        </button>
                      )}
                      <a
                        href={getFileUrl(file.path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold hover:bg-emerald-200 transition-colors text-center"
                      >
                        ⬇️ Open / Download
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </InfoCard>
        )}

        {/* ================= HOD RESPONSE (for rejected) ================= */}
        {request.status === 'REJECTED' && (request.rejectionReason || request.hodComments) && (
          <InfoCard title="HOD Response" icon="💬">
            {request.rejectionReason && (
              <div className="mb-3">
                <label className="text-sm font-semibold text-rose-700">Rejection Reason</label>
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mt-1 text-rose-900">
                  {request.rejectionReason}
                </div>
              </div>
            )}
            {request.hodComments && (
              <div>
                <label className="text-sm font-semibold text-slate-600">Additional Comments</label>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-1 text-slate-800">
                  {request.hodComments}
                </div>
              </div>
            )}
            {request.rejectedAt && (
              <p className="text-xs text-slate-500 mt-3">
                Rejected on {new Date(request.rejectedAt).toLocaleString()}
              </p>
            )}
          </InfoCard>
        )}

        {/* ================= FACULTY HISTORY (HOD only) ================= */}
        {isHOD && request.facultyHistory && request.facultyHistory.length > 0 && (
          <InfoCard title={`Faculty Request History (${request.facultyHistory.length} past request${request.facultyHistory.length > 1 ? 's' : ''})`} icon="📊">
            <p className="text-sm text-slate-500 mb-4">
              Past requests from {request.faculty.firstName} {request.faculty.lastName}
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {request.facultyHistory.map((h) => (
                <div key={h.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <span className="text-sm font-semibold text-slate-700">
                      📅 {new Date(h.departureDate).toLocaleDateString()}
                    </span>
                    <StatusBadge status={h.status} />
                    <UrgencyBadge level={h.urgencyLevel} />
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-1">{h.reason}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Submitted {new Date(h.submittedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </InfoCard>
        )}

        {/* ================= EXIT PASS (approved) ================= */}
        {request.exitPassNumber && (
          <InfoCard title="Exit Pass" icon="🎫">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-1 space-y-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <p className="text-sm text-emerald-600 font-semibold mb-1">Exit Pass Number</p>
                  <p className="text-2xl font-bold text-emerald-700 tracking-wider">
                    {request.exitPassNumber}
                  </p>
                </div>
                {request.approvedAt && (
                  <p className="text-sm text-slate-500">
                    Approved on {new Date(request.approvedAt).toLocaleString()}
                  </p>
                )}
                {request.hodComments && (
                  <div>
                    <label className="text-sm font-semibold text-slate-600">HOD Comments</label>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mt-1 text-slate-800 text-sm">
                      {request.hodComments}
                    </div>
                  </div>
                )}
              </div>
              {request.qrCode && (
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-600 mb-2">QR Code</p>
                  <img
                    src={request.qrCode}
                    alt="Exit Pass QR"
                    className="w-48 h-48 border-2 border-slate-200 rounded-xl shadow-sm"
                  />
                  <p className="text-xs text-slate-400 mt-2">Scan to verify</p>
                </div>
              )}
            </div>
          </InfoCard>
        )}

        {/* ================= HOD ACTIONS ================= */}
        {canTakeAction && (
          <InfoCard title="Take Action" icon="⚡">
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                HOD Comments (optional for approval, required for more info)
              </label>
              <textarea
                value={hodComments}
                onChange={e => setHodComments(e.target.value)}
                rows={3}
                placeholder="Add comments for the faculty..."
                className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
            </div>

            <div className="flex gap-3 flex-wrap">
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex-1 min-w-[120px] bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white py-3 rounded-xl font-semibold transition-all shadow-sm hover:shadow-md disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : '✅ Approve'}
              </button>

              <button
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading}
                className="flex-1 min-w-[120px] bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white py-3 rounded-xl font-semibold transition-all shadow-sm hover:shadow-md disabled:opacity-50"
              >
                ❌ Reject
              </button>

              <button
                onClick={handleMoreInfo}
                disabled={actionLoading || !hodComments.trim()}
                className="flex-1 min-w-[120px] bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-3 rounded-xl font-semibold transition-all shadow-sm hover:shadow-md disabled:opacity-50"
                title="Add comments above first"
              >
                ℹ️ Need More Info
              </button>
            </div>
            {!hodComments.trim() && (
              <p className="text-xs text-blue-600 mt-2">
                💡 Add comments above to use "Need More Info" button
              </p>
            )}
          </InfoCard>
        )}

      </div>

      {/* ================= REJECT MODAL ================= */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              🚫 Reject Request
            </h3>
            <p className="text-sm text-slate-600 mb-3">
              Please provide a clear reason. This will be emailed to the faculty.
            </p>
            <textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-3 mb-4 focus:ring-2 focus:ring-rose-500 outline-none resize-none"
              placeholder="Reason for rejection (mandatory)..."
              rows={4}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim() || actionLoading}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= IMAGE PREVIEW MODAL ================= */}
      {previewFile && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden shadow-2xl max-w-3xl w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800">🖼️ {previewFile.name}</h3>
              <button
                onClick={() => setPreviewFile(null)}
                className="text-slate-500 hover:text-slate-800 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
            <div className="p-4 bg-slate-50">
              <img
                src={previewFile.url}
                alt={previewFile.name}
                className="w-full max-h-[65vh] object-contain rounded-lg"
              />
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
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

function InfoCard({ title, icon, children }: any) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <span>{icon}</span>{title}
      </h2>
      {children}
    </div>
  );
}

function InfoItem({ label, value }: any) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-600 mb-1">{label}</p>
      <p className="text-slate-800">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    REJECTED: 'bg-rose-100 text-rose-700 border-rose-300',
    PENDING: 'bg-amber-100 text-amber-700 border-amber-300',
    MORE_INFO_NEEDED: 'bg-blue-100 text-blue-700 border-blue-300',
  };
  const labels: any = {
    APPROVED: '✅ Approved',
    REJECTED: '❌ Rejected',
    PENDING: '⏳ Pending',
    MORE_INFO_NEEDED: 'ℹ️ More Info Needed',
  };
  return (
    <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${styles[status] || 'bg-slate-100 text-slate-700'}`}>
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
    <span className={`inline-flex items-center px-3 py-1 text-xs rounded-lg font-semibold border ${styles[level] || 'bg-slate-200'}`}>
      🚨 {level}
    </span>
  );
}
