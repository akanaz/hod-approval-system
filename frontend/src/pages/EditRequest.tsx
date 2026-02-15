// frontend/src/pages/EditRequest.tsx
// ✅ NEW: Edit pending requests

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { requestsApi, fileApi } from '../services/api';
import toast from 'react-hot-toast';
import { Calendar, Clock, X, ArrowLeft } from 'lucide-react';
import type { EditRequestDTO, LeaveType, FileAttachment } from '../types';
import { formatFileSize, getFileIcon } from '../types';

const EditRequest: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<EditRequestDTO>({});
  const [uploadedFiles, setUploadedFiles] = useState<FileAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const { data: request, isLoading } = useQuery({
    queryKey: ['request', id],
    queryFn: () => requestsApi.getById(id!),
    enabled: !!id
  });

  useEffect(() => {
    if (request) {
      if (request.status !== 'PENDING') {
        toast.error('Only pending requests can be edited');
        navigate(`/requests/${id}`);
        return;
      }

      setFormData({
        leaveType: request.leaveType,
        departureDate: request.departureDate.split('T')[0],
        departureTime: request.departureTime || '',
        expectedReturnTime: request.expectedReturnTime || '',
        reason: request.reason,
        destination: request.destination || '',
        urgencyLevel: request.urgencyLevel,
        currentWorkload: request.currentWorkload || '',
        coverageArrangement: request.coverageArrangement || ''
      });

      setUploadedFiles(request.attachments || []);
    }
  }, [request, id, navigate]);

  const editMutation = useMutation({
    mutationFn: (data: EditRequestDTO) => requestsApi.edit(id!, { ...data, attachments: uploadedFiles }),
    onSuccess: () => {
      toast.success('Request updated successfully!');
      navigate(`/requests/${id}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update request');
    }
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
      return;
    }

    setIsUploading(true);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} exceeds 5MB limit`);
          return null;
        }

        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/jpeg',
          'image/png',
          'image/jpg'
        ];

        if (!allowedTypes.includes(file.type)) {
          toast.error(`${file.name} - Invalid file type`);
          return null;
        }

        const uploadedFile = await fileApi.upload(file);
        return uploadedFile;
      });

      const results = await Promise.all(uploadPromises);
      const validFiles = results.filter(f => f !== null) as FileAttachment[];

      setUploadedFiles(prev => [...prev, ...validFiles]);
      toast.success(`${validFiles.length} file(s) uploaded`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'File upload failed');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveFile = async (filename: string) => {
    try {
      await fileApi.delete(filename);
      setUploadedFiles(prev => prev.filter(f => f.filename !== filename));
      toast.success('File removed');
    } catch (error) {
      toast.error('Failed to remove file');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.departureDate || !formData.reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.leaveType === 'PARTIAL' && !formData.departureTime) {
      toast.error('Departure time is required for partial day leave');
      return;
    }

    editMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading request...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <button
              onClick={() => navigate(`/requests/${id}`)}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Request
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Edit Request
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Update your early departure request details
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destination
              </label>
              <input
                type="text"
                name="destination"
                value={formData.destination}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Urgency Level
              </label>
              <select
                name="urgencyLevel"
                value={formData.urgencyLevel}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="border-t border-gray-200 pt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supporting Documents
              </label>
              <input
                type="file"
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                multiple
                disabled={isUploading || uploadedFiles.length >= 3}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />

              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {uploadedFiles.map((file) => (
                    <div key={file.filename} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getFileIcon(file.mimetype || '')}</span>
                        <div>
                          <p className="text-sm font-medium">{file.originalName}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
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
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t">
              <button
                type="button"
                onClick={() => navigate(`/requests/${id}`)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editMutation.isPending || isUploading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {editMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditRequest;
