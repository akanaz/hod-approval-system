import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';

const URGENCY_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function CreateRequest() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    departureDate: '',
    departureTime: '',
    expectedReturnTime: '',
    reason: '',
    destination: '',
    urgencyLevel: 'MEDIUM',
    currentWorkload: '',
    coverageArrangement: ''
  });

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  /* ================= FILE UPLOAD ================= */

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check total files limit
    if (uploadedFiles.length + files.length > 3) {
      toast.error('Maximum 3 files allowed');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        // Validate file size
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 5MB)`);
          return;
        }
        formData.append('files', file);
      });

      const res = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setUploadedFiles(prev => [...prev, ...res.data.files]);
      toast.success(`${files.length} file(s) uploaded`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  const removeFile = async (index: number) => {
    const file = uploadedFiles[index];
    
    try {
      // Delete from server
      const filename = file.path.split('/').pop();
      await api.delete(`/files/delete/${filename}`);
      
      // Remove from state
      setUploadedFiles(prev => prev.filter((_, i) => i !== index));
      toast.success('File removed');
    } catch (error) {
      toast.error('Failed to remove file');
    }
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.departureDate || !form.departureTime || !form.reason.trim()) {
      toast.error('Please fill all required fields');
      return;
    }

    const selectedDate = new Date(form.departureDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      toast.error('Cannot create request for past dates');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...form,
        attachments: uploadedFiles // Include uploaded files
      };

      await api.post('/requests', payload);
      toast.success('Request submitted! HOD notified via email.');
      navigate('/faculty/dashboard');
    } catch (error: any) {
      if (error.response?.status === 409) {
        toast.error(error.response.data.message || 'Duplicate request for this date');
      } else {
        toast.error(error.response?.data?.message || 'Failed to create request');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 hover:text-blue-800 transition-colors mb-4 flex items-center gap-2 font-medium"
        >
          ← Back
        </button>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
          <h1 className="text-3xl font-bold bg-clip-text mb-2">
            📝 New Early Departure Request
          </h1>
          <p className="text-slate-600">
            Fill in the details. HOD will be notified automatically.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        
        {/* Date & Time */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800 border-b pb-2">📅 Date & Time</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Departure Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="departureDate"
                value={form.departureDate}
                onChange={handleChange}
                required
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Departure Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                name="departureTime"
                value={form.departureTime}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Expected Return Time
              </label>
              <input
                type="time"
                name="expectedReturnTime"
                value={form.expectedReturnTime}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Urgency Level <span className="text-red-500">*</span>
              </label>
              <select
                name="urgencyLevel"
                value={form.urgencyLevel}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {URGENCY_LEVELS.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Request Details */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800 border-b pb-2">📋 Request Details</h2>
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              name="reason"
              value={form.reason}
              onChange={handleChange}
              required
              rows={4}
              placeholder="Detailed reason..."
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Destination
            </label>
            <input
              type="text"
              name="destination"
              value={form.destination}
              onChange={handleChange}
              placeholder="Where are you going?"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Additional Info */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800 border-b pb-2">ℹ️ Additional Info</h2>
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Current Workload
            </label>
            <textarea
              name="currentWorkload"
              value={form.currentWorkload}
              onChange={handleChange}
              rows={3}
              placeholder="Describe responsibilities..."
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Coverage Arrangement
            </label>
            <textarea
              name="coverageArrangement"
              value={form.coverageArrangement}
              onChange={handleChange}
              rows={3}
              placeholder="Who will cover your duties?"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>
        </div>

        {/* ✅ FILE UPLOAD SECTION */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800 border-b pb-2">📎 Supporting Documents</h2>
          
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
            <input
              type="file"
              id="file-upload"
              multiple
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              disabled={uploading || uploadedFiles.length >= 3}
              className="hidden"
            />
            <label
              htmlFor="file-upload"
              className={`cursor-pointer ${uploading || uploadedFiles.length >= 3 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="text-4xl mb-2">📎</div>
              <p className="text-slate-700 font-semibold mb-1">
                {uploading ? 'Uploading...' : 'Click or drag files here'}
              </p>
              <p className="text-sm text-slate-500">
                PDF, DOC, DOCX, JPG, PNG • Max 5MB • Up to 3 files
              </p>
            </label>
          </div>

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">
                Uploaded Files ({uploadedFiles.length}/3):
              </p>
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-2xl">
                      {file.mimetype.includes('pdf') ? '📄' : 
                       file.mimetype.includes('image') ? '🖼️' : '📝'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {file.originalName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-red-600 hover:text-red-800 font-bold text-lg px-2"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Important Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">ℹ️</span>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Important:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• One request per date only</li>
                <li>• You'll get email when processed</li>
                <li>• Attach relevant documents if needed</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={uploading || loading}
            className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || uploading}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg disabled:opacity-50"
          >
            {loading ? 'Submitting...' : uploading ? 'Uploading...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  );
}
