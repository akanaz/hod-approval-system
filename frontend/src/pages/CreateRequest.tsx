// frontend/src/pages/CreateRequest.tsx
// ✅ COMPLETE FIXED VERSION - File upload error fixed

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Calendar, Clock, FileText, MapPin, AlertCircle, Upload, X } from 'lucide-react';

/* ================= TYPES ================= */

type LeaveType = 'PARTIAL' | 'FULL_DAY';

interface CreateRequestDTO {
  leaveType: LeaveType;
  departureDate: string;
  departureTime?: string;
  expectedReturnTime?: string;
  reason: string;
  destination?: string;
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  currentWorkload?: string;
  coverageArrangement?: string;
  attachments?: FileAttachment[];
}

interface FileAttachment {
  filename: string;
  originalName: string;
  mimetype: string; // ✅ FIXED: lowercase to match backend
  mimeType?: string; // ✅ FIXED: Optional alias
  size: number;
}

/* ================= HELPERS ================= */

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ✅ FIXED: Handle both mimetype and mimeType
const getFileIcon = (mimeType?: string) => {
  const type = (mimeType || '').toLowerCase();
  if (type.includes('pdf')) return '📄';
  if (type.includes('image')) return '🖼️';
  if (type.includes('word') || type.includes('document')) return '📝';
  return '📎';
};

/* ================= COMPONENT ================= */

/* Statuses that block a new request for the same date.
   REJECTED is included — HOD's decision is final for that date;
   faculty should speak to HOD directly rather than resubmitting. */
const BLOCKING_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'MORE_INFO_NEEDED'];

const statusLabel: Record<string, string> = {
  PENDING: 'pending review',
  APPROVED: 'already approved',
  REJECTED: 'already rejected by HOD',
  MORE_INFO_NEEDED: 'awaiting more information from you',
};

const CreateRequest: React.FC = () => {
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<FileAttachment[]>([]);

  // Pre-load faculty's own requests so date conflict checks are instant
  const [existingRequests, setExistingRequests] = useState<any[]>([]);
  const [dateConflict, setDateConflict] = useState<{ status: string } | null>(null);

  useEffect(() => {
    api.get('/requests').then(res => {
      setExistingRequests(res.data.requests || []);
    }).catch(() => { /* non-critical — submit will re-validate */ });
  }, []);

  const [formData, setFormData] = useState({
    leaveType: 'PARTIAL' as LeaveType,
    departureDate: '',
    departureTime: '',
    expectedReturnTime: '',
    reasonCategory: '' as '' | 'MEDICAL' | 'FAMILY' | 'PERSONAL' | 'LEGAL' | 'EDUCATIONAL' | 'VEHICLE' | 'CHILDCARE' | 'OTHER',
    reason: '',
    scheduledCommitments: '',
    destination: '',
    urgencyLevel: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    currentWorkload: '',
    coverageArrangement: ''
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateRequestDTO) => api.post('/requests', data),
    onSuccess: () => {
      toast.success('Request submitted successfully!');
      navigate('/faculty/dashboard');
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.message || 'Failed to create request';
      toast.error(errorMsg);
    }
  });

  /* Check the chosen date against pre-loaded requests and set inline warning */
  const checkDateConflict = (date: string) => {
    if (!date) { setDateConflict(null); return; }
    const chosen = new Date(date).toISOString().split('T')[0];
    const conflict = existingRequests.find((req: any) => {
      const reqDate = new Date(req.departureDate).toISOString().split('T')[0];
      return reqDate === chosen && BLOCKING_STATUSES.includes(req.status);
    });
    setDateConflict(conflict ? { status: conflict.status } : null);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'departureDate') checkDateConflict(value);
  };

  const handleLeaveTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const leaveType = e.target.value as LeaveType;
    setFormData(prev => ({
      ...prev,
      leaveType,
      departureTime: leaveType === 'FULL_DAY' ? '' : prev.departureTime,
      expectedReturnTime: leaveType === 'FULL_DAY' ? '' : prev.expectedReturnTime
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (uploadedFiles.length + files.length > 3) {
      toast.error('Maximum 3 files allowed');
      e.target.value = '';
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (!file) continue;
        
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} exceeds 5MB limit`);
          continue;
        }

        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/jpeg',
          'image/jpg',
          'image/png'
        ];

        if (!allowedTypes.includes(file.type)) {
          toast.error(`${file.name} - Invalid file type`);
          continue;
        }

        formData.append('files', file);
      }

      if (!formData.has('files')) {
        toast.error('No valid files to upload');
        setIsUploading(false);
        e.target.value = '';
        return;
      }

      const response = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const uploadedFileData = response.data.files || [];
      setUploadedFiles(prev => [...prev, ...uploadedFileData]);
      toast.success(`${uploadedFileData.length} file(s) uploaded successfully`);

    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'File upload failed');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveFile = async (filename: string) => {
    try {
      await api.delete(`/files/delete/${filename}`);
      setUploadedFiles(prev => prev.filter(f => f.filename !== filename));
      toast.success('File removed');
    } catch (error) {
      console.error('Remove file error:', error);
      toast.error('Failed to remove file');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.departureDate || !formData.reason || !formData.reasonCategory) {
      toast.error('Please fill in all required fields including reason category');
      return;
    }

    if (formData.leaveType === 'PARTIAL' && !formData.departureTime) {
      toast.error('Departure time is required for partial day leave');
      return;
    }

    // Re-validate at submit time (handles edge case where requests loaded after date was picked)
    const chosen = new Date(formData.departureDate).toISOString().split('T')[0];
    const conflict = existingRequests.find((req: any) => {
      const reqDate = new Date(req.departureDate).toISOString().split('T')[0];
      return reqDate === chosen && BLOCKING_STATUSES.includes(req.status);
    });
    if (conflict) {
      toast.error(`You already have a request for this date that is ${statusLabel[conflict.status] ?? conflict.status}.`);
      setDateConflict({ status: conflict.status });
      return;
    }

    const submitData: CreateRequestDTO = {
      ...formData,
      attachments: uploadedFiles
    };

    createMutation.mutate(submitData);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">
              Create Early Departure Request
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Fill in the details for your early departure request
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Leave Type <span className="text-red-500">*</span>
              </label>
              <select
                name="leaveType"
                value={formData.leaveType}
                onChange={handleLeaveTypeChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="PARTIAL">Partial Day (Early Departure)</option>
                <option value="FULL_DAY">Full Day Leave</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline w-4 h-4 mr-1" />
                Departure Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="departureDate"
                value={formData.departureDate}
                onChange={handleInputChange}
                min={new Date().toISOString().split('T')[0]}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  dateConflict ? 'border-amber-400 bg-amber-50' : 'border-gray-300'
                }`}
                required
              />
              {dateConflict && (
                <div className="mt-2 flex items-start gap-2 p-3 bg-amber-50 border border-amber-300 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">
                      You already have a request for this date that is {statusLabel[dateConflict.status] ?? dateConflict.status}.
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      {dateConflict.status === 'APPROVED'
                        ? 'An approved pass already exists for this date. You cannot submit another request.'
                        : dateConflict.status === 'REJECTED'
                        ? 'Your request for this date was rejected by the HOD. Please contact your HOD directly if circumstances have changed.'
                        : dateConflict.status === 'MORE_INFO_NEEDED'
                        ? "Please respond to the HOD's request for more information on your existing request instead."
                        : 'Please wait for your existing request to be resolved before submitting a new one.'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {formData.leaveType === 'PARTIAL' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="inline w-4 h-4 mr-1" />
                    Departure Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    name="departureTime"
                    value={formData.departureTime}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Return Time
                  </label>
                  <input
                    type="time"
                    name="expectedReturnTime"
                    value={formData.expectedReturnTime}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="inline w-4 h-4 mr-1" />
                Reason Category <span className="text-red-500">*</span>
              </label>
              <select
                name="reasonCategory"
                value={formData.reasonCategory}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">-- Select a category --</option>
                <option value="MEDICAL">🏥 Medical / Health Appointment</option>
                <option value="FAMILY">👨‍👩‍👧 Family Emergency</option>
                <option value="PERSONAL">🏠 Personal Work / Errands</option>
                <option value="LEGAL">⚖️ Legal Consultation / Proceedings</option>
                <option value="EDUCATIONAL">🎓 Educational / Training Program</option>
                <option value="VEHICLE">🚗 Vehicle / Transport Emergency</option>
                <option value="CHILDCARE">👶 Child / Elderly Care</option>
                <option value="OTHER">📝 Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="inline w-4 h-4 mr-1" />
                Detailed Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                rows={3}
                placeholder="Please provide a detailed description of your reason for early departure"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📅 Scheduled Commitments on Departure Date
              </label>
              <textarea
                name="scheduledCommitments"
                value={formData.scheduledCommitments}
                onChange={handleInputChange}
                rows={2}
                placeholder="e.g., 10:00 AM - Lab session (3rd year CS), 2:00 PM - Tutorial class. Leave blank if none."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">List any classes, labs, or meetings you have scheduled on this day.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="inline w-4 h-4 mr-1" />
                Destination
              </label>
              <input
                type="text"
                name="destination"
                value={formData.destination}
                onChange={handleInputChange}
                placeholder="Where will you be going? (Optional)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <AlertCircle className="inline w-4 h-4 mr-1" />
                Urgency Level
              </label>
              <select
                name="urgencyLevel"
                value={formData.urgencyLevel}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Workload
              </label>
              <textarea
                name="currentWorkload"
                value={formData.currentWorkload}
                onChange={handleInputChange}
                rows={2}
                placeholder="Describe your current workload and any pending tasks"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Coverage Arrangement
              </label>
              <textarea
                name="coverageArrangement"
                value={formData.coverageArrangement}
                onChange={handleInputChange}
                rows={2}
                placeholder="Who will cover your responsibilities while you're away?"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="border-t border-gray-200 pt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Upload className="inline w-4 h-4 mr-1" />
                Supporting Documents
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Upload up to 3 files (PDF, DOC, DOCX, JPG, PNG - Max 5MB each)
              </p>
              <input
                type="file"
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                multiple
                disabled={isUploading || uploadedFiles.length >= 3}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100
                  disabled:opacity-50 disabled:cursor-not-allowed"
              />

              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.filename}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center space-x-3">
                        {/* ✅ FIXED: Handle both mimetype and mimeType */}
                        <span className="text-2xl">{getFileIcon(file.mimetype || file.mimeType)}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {file.originalName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(file.filename)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {isUploading && (
                <p className="mt-2 text-sm text-blue-600">
                  Uploading files...
                </p>
              )}
            </div>

            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/faculty/dashboard')}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || isUploading || !!dateConflict}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title={dateConflict ? `Cannot submit: request for this date is ${statusLabel[dateConflict.status] ?? dateConflict.status}` : undefined}
              >
                {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateRequest;