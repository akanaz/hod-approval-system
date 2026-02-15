// frontend/src/components/DelegationManager.tsx
// ✅ COMPLETE FIXED VERSION - Working faculty dropdown, revoke functionality

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

interface Faculty {
  id: string;
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string;
  department: string;
}

interface Delegation {
  id: string;
  _id?: string;
  facultyId: {
    _id: string;
    id?: string;
    firstName: string;
    lastName: string;
    email: string;
    employeeId: string;
  };
  startDate: string;
  endDate: string;
  permissions: string[];
  isActive: boolean;
}

const DelegationManager: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [permissions, setPermissions] = useState({
    approveRequests: true,
    rejectRequests: true,
    requestMoreInfo: true
  });

  // Fetch department faculty
  const { data: facultyList = [], isLoading: loadingFaculty } = useQuery({
    queryKey: ['department-faculty'],
    queryFn: async () => {
      const response = await api.get('/hod/department-faculty');
      return response.data.faculty || [];
    }
  });

  // Fetch active delegations
  const { data: delegations = [], isLoading: loadingDelegations } = useQuery({
    queryKey: ['active-delegations'],
    queryFn: async () => {
      const response = await api.get('/hod/delegations');
      return response.data.delegations || [];
    }
  });

  // Create delegation mutation
  const createDelegation = useMutation({
    mutationFn: async (data: any) => {
      return await api.post('/hod/delegate', data);
    },
    onSuccess: () => {
      toast.success('Delegation created successfully');
      queryClient.invalidateQueries({ queryKey: ['active-delegations'] });
      queryClient.invalidateQueries({ queryKey: ['department-faculty'] });
      // Reset form
      setSelectedFaculty('');
      setStartDate('');
      setEndDate('');
      setPermissions({
        approveRequests: true,
        rejectRequests: true,
        requestMoreInfo: true
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create delegation');
    }
  });

  // Revoke delegation mutation
  const revokeDelegation = useMutation({
    mutationFn: async (delegationId: string) => {
      return await api.delete(`/hod/delegations/${delegationId}`);
    },
    onSuccess: () => {
      toast.success('Delegation revoked successfully');
      queryClient.invalidateQueries({ queryKey: ['active-delegations'] });
      queryClient.invalidateQueries({ queryKey: ['department-faculty'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to revoke delegation');
    }
  });

  // ✅ NEW: Extend delegation mutation
  const extendDelegation = useMutation({
    mutationFn: async ({ facultyId, newEndDate }: { facultyId: string; newEndDate: string }) => {
      return await api.patch(`/hod/extend/${facultyId}`, { newEndDate });
    },
    onSuccess: () => {
      toast.success('Delegation extended successfully');
      queryClient.invalidateQueries({ queryKey: ['active-delegations'] });
      setExtendingId(null);
      setNewEndDate('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to extend delegation');
    }
  });

  // ✅ NEW: State for extend functionality
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [newEndDate, setNewEndDate] = useState('');

  const handleDelegate = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFaculty || !startDate || !endDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      toast.error('End date must be after start date');
      return;
    }

    const selectedPermissions = Object.entries(permissions)
      .filter(([_, enabled]) => enabled)
      .map(([perm]) => {
        // Convert camelCase to snake_case
        if (perm === 'approveRequests') return 'approve_requests';
        if (perm === 'rejectRequests') return 'reject_requests';
        if (perm === 'requestMoreInfo') return 'request_more_info';
        return perm;
      });

    createDelegation.mutate({
      facultyId: selectedFaculty,
      startDate,
      endDate,
      permissions: selectedPermissions
    });
  };

  const handleRevoke = (delegationId: string) => {
    if (window.confirm('Are you sure you want to revoke this delegation?')) {
      revokeDelegation.mutate(delegationId);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <span>🛡️</span> Delegation Management
        </h2>
        <p className="text-slate-600 text-sm">Grant approval rights to faculty members</p>
      </div>

      {/* Delegate Form */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <span>➕</span> Delegate HOD Rights
        </h3>

        <form onSubmit={handleDelegate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Select Faculty <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedFaculty}
              onChange={(e) => setSelectedFaculty(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select a faculty member</option>
              {loadingFaculty ? (
                <option disabled>Loading faculty...</option>
              ) : facultyList.length === 0 ? (
                <option disabled>No faculty members found</option>
              ) : (
                facultyList.map((faculty: Faculty) => (
                  <option key={faculty.id || faculty._id} value={faculty.id || faculty._id}>
                    {faculty.firstName} {faculty.lastName} - {faculty.employeeId}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Permissions
            </label>
            <div className="space-y-2 bg-white rounded-lg p-4 border border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.approveRequests}
                  onChange={(e) => setPermissions({ ...permissions, approveRequests: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm">Approve Requests</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.rejectRequests}
                  onChange={(e) => setPermissions({ ...permissions, rejectRequests: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm">Reject Requests</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.requestMoreInfo}
                  onChange={(e) => setPermissions({ ...permissions, requestMoreInfo: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm">Request More Info</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedFaculty('');
                setStartDate('');
                setEndDate('');
                setPermissions({
                  approveRequests: true,
                  rejectRequests: true,
                  requestMoreInfo: true
                });
              }}
              className="px-6 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createDelegation.isPending}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createDelegation.isPending ? 'Delegating...' : 'Delegate'}
            </button>
          </div>
        </form>
      </div>

      {/* Active Delegations */}
      <div>
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <span>📋</span> Active Delegations
        </h3>

        {loadingDelegations ? (
          <div className="text-center py-8 text-slate-500">Loading delegations...</div>
        ) : delegations.length === 0 ? (
          <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
            No active delegations
          </div>
        ) : (
          <div className="space-y-3">
            {delegations.map((delegation: Delegation) => {
  const facultyId = delegation.facultyId._id || delegation.facultyId.id;
  const isActive = new Date(delegation.endDate) > new Date();
  
  return (
    <div
      key={delegation.id || delegation._id}
      className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
              {delegation.facultyId.firstName[0]}{delegation.facultyId.lastName[0]}
            </div>
            <div>
              <p className="font-bold text-slate-900">
                {delegation.facultyId.firstName} {delegation.facultyId.lastName}
              </p>
              <p className="text-sm text-slate-600">
                {delegation.facultyId.email} • {delegation.facultyId.employeeId}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm mt-3">
            <div>
              <p className="text-slate-500">Start Date</p>
              <p className="font-semibold">
                {new Date(delegation.startDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-slate-500">End Date</p>
              <p className="font-semibold">
                {new Date(delegation.endDate).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="mt-3">
            <p className="text-xs text-slate-500 mb-2">Permissions:</p>
            <div className="flex gap-2 flex-wrap">
              {delegation.permissions.map((perm, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold"
                >
                  {perm.replace(/([A-Z])/g, ' $1').trim()}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
              isActive 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {isActive ? '🟢 Active' : '🔴 Expired'}
            </span>
          </div>
        </div>

        {/* ✅ UPDATED: Extend and Revoke Buttons */}
        <div className="flex gap-2">
          {/* Extend Button - Only show for active delegations */}
          {isActive && (
            <button
              onClick={() => setExtendingId(facultyId)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold transition-colors"
            >
              📅 Extend
            </button>
          )}

          {/* Revoke Button */}
          <button
            onClick={() => {
              if (window.confirm(`Revoke delegation for ${delegation.facultyId.firstName} ${delegation.facultyId.lastName}?`)) {
                revokeDelegation.mutate(facultyId);
              }
            }}
            disabled={revokeDelegation.isPending}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {revokeDelegation.isPending ? 'Revoking...' : 'Revoke'}
          </button>
        </div>
      </div>

      {/* ✅ NEW: Extend Date Picker Modal */}
      {extendingId === facultyId && (
        <div className="mt-3 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
          <h4 className="font-semibold text-sm text-slate-700 mb-2">Extend Delegation</h4>
          <p className="text-xs text-slate-600 mb-3">
            Current end date: {new Date(delegation.endDate).toLocaleDateString()}
          </p>
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="date"
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
                min={new Date(delegation.endDate).toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="Select new end date"
              />
            </div>
            <button
              onClick={() => {
                if (!newEndDate) {
                  toast.error('Please select a new end date');
                  return;
                }
                const newEnd = new Date(newEndDate);
                const currentEnd = new Date(delegation.endDate);
                if (newEnd <= currentEnd) {
                  toast.error('New end date must be after current end date');
                  return;
                }
                extendDelegation.mutate({ facultyId, newEndDate });
              }}
              disabled={extendDelegation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {extendDelegation.isPending ? 'Extending...' : 'Confirm'}
            </button>
            <button
              onClick={() => {
                setExtendingId(null);
                setNewEndDate('');
              }}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
})}
          </div>
        )}
      </div>
    </div>
  );
};

export default DelegationManager;