import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

/* ================= TYPES ================= */

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

/* ================= MAIN COMPONENT ================= */

export default function HODDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [allRequests, setAllRequests] = useState<RequestItem[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  
  // Sort & Filter state
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

  // Get unique faculty list
  const uniqueFaculty = Array.from(
    new Set(allRequests.map(r => `${r.faculty.firstName} ${r.faculty.lastName}`))
  ).sort();

  /* ================= FETCH DATA ================= */

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/requests');
      const requests = res.data.requests || [];
      
      setAllRequests(requests);
      
      // Calculate stats
      const statsCalc = {
        pending: requests.filter((r: RequestItem) => r.status === 'PENDING').length,
        approved: requests.filter((r: RequestItem) => r.status === 'APPROVED').length,
        rejected: requests.filter((r: RequestItem) => r.status === 'REJECTED').length,
        moreInfoNeeded: requests.filter((r: RequestItem) => r.status === 'MORE_INFO_NEEDED').length
      };
      setStats(statsCalc);

      // Calculate urgency breakdown
      const urgency = {
        CRITICAL: requests.filter((r: RequestItem) => r.urgencyLevel === 'CRITICAL').length,
        HIGH: requests.filter((r: RequestItem) => r.urgencyLevel === 'HIGH').length,
        MEDIUM: requests.filter((r: RequestItem) => r.urgencyLevel === 'MEDIUM').length,
        LOW: requests.filter((r: RequestItem) => r.urgencyLevel === 'LOW').length
      };
      setUrgencyBreakdown(urgency);

    } catch (err: any) {
      if (err.response?.status === 401) logout();
      else toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  /* ================= FILTERING & SORTING ================= */

  useEffect(() => {
    let result = [...allRequests];

    // 1. Filter by tab (status)
    if (activeTab !== 'ALL') {
      result = result.filter(r => r.status === activeTab);
    }

    // 2. Filter by search term (faculty name)
    if (searchTerm) {
      result = result.filter(r => {
        const fullName = `${r.faculty.firstName} ${r.faculty.lastName}`.toLowerCase();
        return fullName.includes(searchTerm.toLowerCase());
      });
    }

    // 3. Filter by selected faculty
    if (selectedFaculty) {
      result = result.filter(r => {
        const fullName = `${r.faculty.firstName} ${r.faculty.lastName}`;
        return fullName === selectedFaculty;
      });
    }

    // 4. Filter by urgency
    if (urgencyFilter) {
      result = result.filter(r => r.urgencyLevel === urgencyFilter);
    }

    // 5. Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'urgency':
          const urgencyOrder: any = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
          return urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel];
        
        case 'time-desc':
          return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
        
        case 'time-asc':
          return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
        
        case 'faculty':
          const nameA = `${a.faculty.firstName} ${a.faculty.lastName}`;
          const nameB = `${b.faculty.firstName} ${b.faculty.lastName}`;
          return nameA.localeCompare(nameB);
        
        default:
          return 0;
      }
    });

    setFilteredRequests(result);
  }, [allRequests, activeTab, searchTerm, selectedFaculty, urgencyFilter, sortBy]);

  /* ================= RESET FILTERS ================= */

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedFaculty('');
    setUrgencyFilter('');
    setSortBy('urgency');
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ================= HEADER ================= */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-8 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text mb-2">
              👔 HOD Dashboard
            </h1>
            <p className="text-slate-700">
              Welcome back, {user?.firstName}! Manage your department's requests
            </p>
          </div>
          <button
            onClick={() => fetchRequests()}
            className="px-5 py-2.5 bg-white border-2 border-blue-600 text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all shadow-sm hover:shadow-md flex items-center gap-2"
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ================= STATS CARDS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Pending" value={stats.pending} icon="⏳" color="amber" />
        <StatCard label="Approved" value={stats.approved} icon="✅" color="emerald" />
        <StatCard label="Rejected" value={stats.rejected} icon="❌" color="rose" />
        <StatCard label="More Info" value={stats.moreInfoNeeded} icon="ℹ️" color="blue" />
      </div>

      {/* ================= URGENCY BREAKDOWN ================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span>🚨</span>
          Urgency Breakdown
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <UrgencyCard level="CRITICAL" count={urgencyBreakdown.CRITICAL} />
          <UrgencyCard level="HIGH" count={urgencyBreakdown.HIGH} />
          <UrgencyCard level="MEDIUM" count={urgencyBreakdown.MEDIUM} />
          <UrgencyCard level="LOW" count={urgencyBreakdown.LOW} />
        </div>
      </div>

      {/* ================= TABS ================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
            <TabButton
              label={`Pending (${stats.pending})`}
              active={activeTab === 'PENDING'}
              onClick={() => setActiveTab('PENDING')}
            />
            <TabButton
              label={`Approved (${stats.approved})`}
              active={activeTab === 'APPROVED'}
              onClick={() => setActiveTab('APPROVED')}
            />
            <TabButton
              label={`Rejected (${stats.rejected})`}
              active={activeTab === 'REJECTED'}
              onClick={() => setActiveTab('REJECTED')}
            />
            <TabButton
              label="All"
              active={activeTab === 'ALL'}
              onClick={() => setActiveTab('ALL')}
            />
          </div>
        </div>

        {/* ================= FILTERS & SEARCH ================= */}
        <div className="mb-6 space-y-4">
          {/* Search & Sort Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                🔍 Search Faculty
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type faculty name..."
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                📊 Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="urgency">Urgency (High to Low)</option>
                <option value="time-desc">Newest First</option>
                <option value="time-asc">Oldest First</option>
                <option value="faculty">Faculty Name (A-Z)</option>
              </select>
            </div>

            {/* Urgency Filter */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                🚨 Filter by Urgency
              </label>
              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All Urgencies</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>

          {/* Faculty Dropdown Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                👤 Filter by Faculty
              </label>
              <select
                value={selectedFaculty}
                onChange={(e) => setSelectedFaculty(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All Faculty</option>
                {uniqueFaculty.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="px-6 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
              >
                🔄 Reset Filters
              </button>
            </div>
          </div>
        </div>

        {/* ================= RESULTS INFO ================= */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Showing <strong>{filteredRequests.length}</strong> request(s)
            {selectedFaculty && <span> from <strong>{selectedFaculty}</strong></span>}
          </p>
        </div>

        {/* ================= REQUESTS LIST ================= */}
        {filteredRequests.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-slate-600 font-medium">No requests found</p>
            {(searchTerm || selectedFaculty || urgencyFilter) && (
              <button
                onClick={resetFilters}
                className="mt-4 text-blue-600 hover:text-blue-800 font-semibold"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map(req => (
              <Link
                key={req.id}
                to={`/requests/${req.id}`}
                className="block bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-blue-300 transition-all group"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <StatusBadge status={req.status} />
                      <UrgencyBadge level={req.urgencyLevel} />
                    </div>
                    
                    <div className="mb-2">
                      <span className="text-sm text-slate-600">Faculty: </span>
                      <span className="font-semibold text-slate-800">
                        {req.faculty.firstName} {req.faculty.lastName}
                      </span>
                      <span className="text-sm text-slate-500 ml-2">
                        ({req.faculty.employeeId})
                      </span>
                    </div>

                    <p className="text-slate-800 font-medium line-clamp-2 mb-3">
                      {req.reason}
                    </p>

                    <div className="flex items-center gap-4 text-sm text-slate-600 flex-wrap">
                      <span className="flex items-center gap-1">
                        <span>📅</span>
                        {new Date(req.departureDate).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <span>🕐</span>
                        {req.departureTime}
                      </span>
                      {req.destination && (
                        <span className="flex items-center gap-1">
                          <span>📍</span>
                          {req.destination}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <span>📨</span>
                        {new Date(req.submittedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <span className="text-blue-600 group-hover:translate-x-1 transition-transform">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= SMALL COMPONENTS ================= */

function StatCard({ label, value, icon, color }: any) {
  const colorClasses: any = {
    amber: 'from-amber-500 to-orange-500',
    emerald: 'from-emerald-500 to-green-500',
    rose: 'from-rose-500 to-red-500',
    blue: 'from-blue-500 to-indigo-500',
  };

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

function UrgencyCard({ level, count }: { level: string; count: number }) {
  const colors: any = {
    CRITICAL: 'bg-rose-100 text-rose-700 border-rose-300',
    HIGH: 'bg-orange-100 text-orange-700 border-orange-300',
    MEDIUM: 'bg-amber-100 text-amber-700 border-amber-300',
    LOW: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  };

  return (
    <div className={`border-2 rounded-xl p-4 ${colors[level]}`}>
      <div className="text-2xl font-bold mb-1">{count}</div>
      <div className="text-sm font-semibold">{level}</div>
    </div>
  );
}

function TabButton({ label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
        active
          ? 'bg-blue-600 text-white shadow-sm'
          : 'text-slate-600 hover:text-slate-800 hover:bg-white'
      }`}
    >
      {label}
    </button>
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
    MORE_INFO_NEEDED: 'ℹ️ More Info'
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 text-xs rounded-lg font-semibold border ${styles[status]}`}>
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
