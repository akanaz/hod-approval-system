import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

/* ================= TYPES ================= */

interface DepartmentStat {
  department: string;
  hodName: string;
  hodEmail: string;
  totalFaculty: number;
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  approvalRate: string;
}

interface MonthlyData {
  month: string;
  total: number;
  approved: number;
  rejected: number;
  pending: number;
}

interface TopFaculty {
  name: string;
  department: string;
  totalRequests: number;
  approved: number;
  rejected: number;
  pending: number;
}

interface AdminDashboardData {
  overallStats: {
    totalUsers: number;
    totalFaculty: number;
    totalHODs: number;
    totalAdmins: number;
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    moreInfoNeeded: number;
  };
  departmentStats: DepartmentStat[];
  urgencyBreakdown: Array<{ urgency: string; count: number }>;
  monthlyTrend: MonthlyData[];
  topFaculty: TopFaculty[];
  avgApprovalTimeHours: number;
}

interface CreateUserForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  employeeId: string;
  phoneNumber: string;
  department: string;
  role: 'FACULTY' | 'HOD';
}

interface UserItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string;
  department: string;
  role: string;
  phoneNumber?: string;
  isActive: boolean;
}

const DEPARTMENTS = [
  'Computer Science',
  'Artificial Intelligence & Machine Learning',
  'Data Science',
  'Information Technology',
  'Electronics & Communication',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'Biotechnology'
];

/* ================= MAIN COMPONENT ================= */

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const usersRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<CreateUserForm>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    employeeId: '',
    phoneNumber: '',
    department: DEPARTMENTS[0],
    role: 'FACULTY'
  });

  /* ================= FETCH DASHBOARD ================= */

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = () => {
    setLoading(true);
    api
      .get('/admin/dashboard')
      .then(res => setData(res.data))
      .catch(err => {
        console.error('Admin dashboard error:', err);
        if (err.response?.status === 401) logout();
        else toast.error('Failed to load dashboard data');
      })
      .finally(() => setLoading(false));
  };

  /* ================= FETCH USERS ================= */

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.users || []);
    } catch (err) {
      toast.error('Failed to load users');
    }
  };

  useEffect(() => {
    if (showUsers && users.length === 0) {
      fetchUsers();
    }
  }, [showUsers]);

  /* ================= DELETE USER ================= */

  const handleDeleteUser = async (userId: string, userName: string, role: string) => {
    if (!confirm(`Are you sure you want to delete ${userName} (${role})? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success(`${role} deleted successfully`);
      fetchUsers();
      fetchDashboard();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to delete user';
      toast.error(errorMsg);
    }
  };

  /* ================= CREATE USER ================= */

  const handleCreateUser = async () => {
    // Validation
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || 
        !form.password.trim() || !form.employeeId.trim()) {
      toast.error('Please fill all required fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Password strength
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    // Check if trying to add HOD to department that already has one
    if (form.role === 'HOD' && data) {
      const deptHasHOD = data.departmentStats.some(
        dept => dept.department === form.department && dept.hodName !== 'N/A'
      );
      
      if (deptHasHOD) {
        toast.error(`${form.department} already has an HOD. Only one HOD allowed per department.`);
        return;
      }
    }

    setFormLoading(true);
    try {
      await api.post('/admin/users', form);
      toast.success(`${form.role} created successfully!`);
      setShowForm(false);
      
      // Reset form
      setForm({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        employeeId: '',
        phoneNumber: '',
        department: DEPARTMENTS[0],
        role: 'FACULTY'
      });
      
      // Refresh dashboard data
      fetchDashboard();
      if (showUsers) fetchUsers();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to create user';
      toast.error(errorMsg);
    } finally {
      setFormLoading(false);
    }
  };

  /* ================= SCROLL TO FORM ================= */

  useEffect(() => {
    if (showForm && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showForm]);

  if (loading) return <LoadingSpinner />;
  if (!data) return <div className="text-center text-slate-600">No data available</div>;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ================= HEADER ================= */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text mb-2">
              📊 Admin Dashboard
            </h1>
            <p className="text-slate-600">
              Welcome back, {user?.firstName}! Complete system overview and user management
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-emerald-700 font-medium">Live Data</span>
            </div>
            
            <button
              onClick={() => {
                setShowUsers(!showUsers);
                setShowForm(false);
              }}
              className={`px-5 py-2.5 rounded-xl font-semibold transition-all shadow-sm hover:shadow-md ${
                showUsers
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-white border-2 border-purple-600 text-purple-600 hover:bg-purple-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <span>👥</span>
                <span>{showUsers ? 'Hide Users' : 'Manage Users'}</span>
              </span>
            </button>

            <button
              onClick={() => {
                setShowForm(!showForm);
                setShowUsers(false);
              }}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm hover:shadow-md flex items-center gap-2"
            >
              {showForm ? (
                <>
                  <span>✕</span>
                  <span>Cancel</span>
                </>
              ) : (
                <>
                  <span>➕</span>
                  <span>Add User</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ================= CREATE USER FORM ================= */}
      {showForm && (
        <div ref={formRef} className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 shadow-sm">
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <span className="text-2xl">👤</span>
                Create New {form.role === 'HOD' ? 'HOD' : 'Faculty Member'}
              </h2>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setForm({ ...form, role: 'FACULTY' })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    form.role === 'FACULTY'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  👨‍🏫 Faculty
                </button>
                <button
                  onClick={() => setForm({ ...form, role: 'HOD' })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    form.role === 'HOD'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  👔 HOD
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <FormInput
                label="First Name"
                value={form.firstName}
                onChange={(v) => setForm({ ...form, firstName: v })}
                icon="👤"
                placeholder="Enter first name"
                required
              />
              
              <FormInput
                label="Last Name"
                value={form.lastName}
                onChange={(v) => setForm({ ...form, lastName: v })}
                icon="👤"
                placeholder="Enter last name"
                required
              />
              
              <FormInput
                label="Email Address"
                type="email"
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
                icon="✉️"
                placeholder="user@university.edu"
                required
              />
              
              <FormInput
                label="Password"
                type="password"
                value={form.password}
                onChange={(v) => setForm({ ...form, password: v })}
                icon="🔒"
                placeholder="Min. 6 characters"
                required
              />
              
              <FormInput
                label="Employee ID"
                value={form.employeeId}
                onChange={(v) => setForm({ ...form, employeeId: v })}
                icon="🆔"
                placeholder="e.g., EMP001"
                required
              />
              
              <FormInput
                label="Phone Number"
                value={form.phoneNumber}
                onChange={(v) => setForm({ ...form, phoneNumber: v })}
                icon="📱"
                placeholder="+1 (555) 000-0000"
              />

              <FormSelect
                label="Department"
                value={form.department}
                onChange={(v) => setForm({ ...form, department: v })}
                options={DEPARTMENTS}
                icon="🏢"
                required
              />
            </div>

            {form.role === 'HOD' && data.departmentStats.some(dept => dept.department === form.department && dept.hodName !== 'N/A') && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <p className="text-sm font-semibold text-amber-800">Warning: HOD Already Exists</p>
                  <p className="text-sm text-amber-700 mt-1">
                    {form.department} already has an HOD. Only one HOD is allowed per department.
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-all"
                disabled={formLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUser}
                disabled={formLoading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {formLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Creating...
                  </span>
                ) : (
                  `✓ Create ${form.role}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= OVERALL STATS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Total Users" 
          value={data.overallStats.totalUsers} 
          icon="👥" 
          color="blue"
          subtitle={`${data.overallStats.totalFaculty} Faculty, ${data.overallStats.totalHODs} HODs`}
        />
        <StatCard 
          label="Total Requests" 
          value={data.overallStats.totalRequests} 
          icon="📋" 
          color="purple"
          subtitle="All time"
        />
        <StatCard 
          label="Pending Review" 
          value={data.overallStats.pendingRequests} 
          icon="⏳" 
          color="amber"
          subtitle="Awaiting action"
        />
        <StatCard 
          label="Approval Rate" 
          value={`${data.overallStats.totalRequests > 0 
            ? ((data.overallStats.approvedRequests / data.overallStats.totalRequests) * 100).toFixed(1)
            : 0}%`}
          icon="✅" 
          color="emerald"
          subtitle={`${data.overallStats.approvedRequests} approved`}
        />
      </div>

      {/* ================= CHARTS ROW ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span>📈</span>
            Monthly Trend
          </h2>
          <div className="space-y-3">
            {data.monthlyTrend.map((month, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-slate-700">{month.month}</span>
                  <span className="text-slate-500">{month.total} total</span>
                </div>
                <div className="flex gap-1 h-8 bg-slate-100 rounded-lg overflow-hidden">
                  {month.approved > 0 && (
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-green-500 flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: `${(month.approved / month.total) * 100}%` }}
                      title={`${month.approved} approved`}
                    >
                      {month.approved}
                    </div>
                  )}
                  {month.rejected > 0 && (
                    <div 
                      className="bg-gradient-to-r from-rose-500 to-red-500 flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: `${(month.rejected / month.total) * 100}%` }}
                      title={`${month.rejected} rejected`}
                    >
                      {month.rejected}
                    </div>
                  )}
                  {month.pending > 0 && (
                    <div 
                      className="bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: `${(month.pending / month.total) * 100}%` }}
                      title={`${month.pending} pending`}
                    >
                      {month.pending}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded"></div>
              <span className="text-slate-600">Approved</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-rose-500 rounded"></div>
              <span className="text-slate-600">Rejected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-500 rounded"></div>
              <span className="text-slate-600">Pending</span>
            </div>
          </div>
        </div>

        {/* Urgency Breakdown */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span>🚨</span>
            Urgency Distribution
          </h2>
          <div className="space-y-4">
            {data.urgencyBreakdown.map(item => (
              <UrgencyBar 
                key={item.urgency} 
                urgency={item.urgency} 
                count={item.count} 
                total={data.overallStats.totalRequests} 
              />
            ))}
          </div>
        </div>
      </div>

      {/* ================= DEPARTMENT STATS TABLE ================= */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <span>🏢</span>
          Department Statistics
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Department</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">HOD</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Faculty</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Total</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Pending</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Approved</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Rejected</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Approval %</th>
              </tr>
            </thead>
            <tbody>
              {data.departmentStats.map((dept, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-4">
                    <div className="font-semibold text-slate-800">{dept.department}</div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm">
                      <div className="font-medium text-slate-700">{dept.hodName}</div>
                      <div className="text-slate-500 text-xs">{dept.hodEmail}</div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-flex items-center justify-center px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold">
                      {dept.totalFaculty}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="font-semibold text-slate-700">{dept.totalRequests}</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-flex items-center justify-center px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-sm font-semibold">
                      {dept.pendingRequests}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-flex items-center justify-center px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-semibold">
                      {dept.approvedRequests}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-flex items-center justify-center px-3 py-1 bg-rose-100 text-rose-700 rounded-lg text-sm font-semibold">
                      {dept.rejectedRequests}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="font-bold text-slate-800">{dept.approvalRate}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


      {/* ================= USER MANAGEMENT TABLE ================= */}
      {showUsers && (
        <div ref={usersRef} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <span>👥</span>
              User Management
            </h2>
            <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-xl text-sm font-semibold">
              {users.length} total users
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Employee ID</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Department</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Role</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-semibold text-slate-800">{u.firstName} {u.lastName}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm text-slate-600">{u.email}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm font-mono text-slate-700">{u.employeeId}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm text-slate-600">{u.department}</div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center justify-center px-3 py-1 rounded-lg text-xs font-semibold ${
                        u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                        u.role === 'HOD' ? 'bg-blue-100 text-blue-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center justify-center px-3 py-1 rounded-lg text-xs font-semibold ${
                        u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {u.role !== 'ADMIN' && (
                        <button
                          onClick={() => handleDeleteUser(u.id, `${u.firstName} ${u.lastName}`, u.role)}
                          className="px-3 py-1.5 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-lg text-xs font-semibold transition-colors"
                          title="Delete User"
                        >
                          🗑️ Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {users.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👥</div>
              <p className="text-slate-600">No users found</p>
            </div>
          )}
        </div>
      )}


      {/* ================= QUICK METRICS ================= */}
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span>⚡</span>
          Key Performance Indicators
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {data.avgApprovalTimeHours}h
            </div>
            <div className="text-sm text-slate-600 mt-2 font-medium">Avg. Approval Time</div>
          </div>
          <div className="text-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
              {((data.overallStats.approvedRequests / (data.overallStats.totalRequests || 1)) * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-slate-600 mt-2 font-medium">Overall Approval Rate</div>
          </div>
          <div className="text-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {(data.overallStats.totalRequests / data.departmentStats.length).toFixed(1)}
            </div>
            <div className="text-sm text-slate-600 mt-2 font-medium">Avg. Requests per Dept</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= HELPER COMPONENTS ================= */

function StatCard({ label, value, icon, color, subtitle }: any) {
  const colorClasses: any = {
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-amber-600',
    emerald: 'from-emerald-500 to-emerald-600',
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`text-4xl`}>
          {icon}
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-slate-800">{value}</div>
        </div>
      </div>
      <div className="text-sm font-semibold text-slate-700">{label}</div>
      {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
    </div>
  );
}

function UrgencyBar({ urgency, count, total }: { urgency: string; count: number; total: number }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  const colors: any = {
    CRITICAL: { bg: 'from-red-500 to-rose-600', text: 'text-red-700' },
    HIGH: { bg: 'from-orange-500 to-amber-600', text: 'text-orange-700' },
    MEDIUM: { bg: 'from-yellow-500 to-amber-500', text: 'text-yellow-700' },
    LOW: { bg: 'from-green-500 to-emerald-600', text: 'text-green-700' },
  };

  return (
    <div>
      <div className="flex justify-between mb-2 text-sm">
        <span className="font-semibold text-slate-700">{urgency}</span>
        <span className="text-slate-500 font-medium">{count} ({percentage.toFixed(1)}%)</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
        <div 
          className={`bg-gradient-to-r ${colors[urgency].bg} h-3 rounded-full transition-all duration-500 shadow-sm`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}

function FormInput({ label, value, onChange, type = 'text', icon, placeholder, required = false }: any) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2">
        {icon && <span className="mr-2">{icon}</span>}
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-slate-800 placeholder-slate-400"
      />
    </div>
  );
}

function FormSelect({ label, value, onChange, options, icon, required = false }: any) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2">
        {icon && <span className="mr-2">{icon}</span>}
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-slate-800"
      >
        {options.map((opt: string) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
