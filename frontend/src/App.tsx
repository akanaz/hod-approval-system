// frontend/src/App.tsx
// ✅ FIXED: Added React Router v7 future flags to prevent warnings

import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';

import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import HODDashboard from './pages/HODDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import CreateRequest from './pages/CreateRequest';
import EditRequest from './pages/EditRequest';
import DeanDashboard from './pages/DeanDashboard';
import RequestDetails from './pages/RequestDetails';
import Profile from './pages/Profile';
import NotFound from './components/NotFound';

import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

/* ================= REACT QUERY ================= */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000, // 30 seconds
    },
  },
});

/* ================= PROTECTED ROUTE ================= */

function ProtectedRoute({
  children,
  roles,
}: {
  children: JSX.Element;
  roles?: string[];
}) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

/* ================= ROOT REDIRECT ================= */

function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  if (!user) return <Navigate to="/login" replace />;

  if (user.role === 'DEAN') {
    return <Navigate to="/dean/dashboard" replace />;
  }

  if (user.role === 'ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (user.role === 'HOD') {
    return <Navigate to="/hod/dashboard" replace />;
  }

  return <Navigate to="/faculty/dashboard" replace />;
}

/* ================= APP ================= */

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        {/* ================= PUBLIC ================= */}
        <Route path="/login" element={<Login />} />

        {/* ================= PROTECTED + LAYOUT ================= */}
        <Route element={<Layout />}>
          <Route path="/" element={<RootRedirect />} />

          {/* ================= ADMIN ================= */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* ================= DEAN ================= */}
          <Route
            path="/dean/dashboard"
            element={
              <ProtectedRoute roles={['DEAN', 'ADMIN']}>
                <DeanDashboard />
              </ProtectedRoute>
            }
          />

          {/* ================= HOD ================= */}
          <Route
            path="/hod/dashboard"
            element={
              <ProtectedRoute roles={['HOD', 'ADMIN']}>
                <HODDashboard />
              </ProtectedRoute>
            }
          />

          {/* ================= FACULTY ================= */}
          <Route
            path="/faculty/dashboard"
            element={
              <ProtectedRoute roles={['FACULTY', 'ADMIN']}>
                <FacultyDashboard />
              </ProtectedRoute>
            }
          />

          {/* ================= REQUESTS ================= */}
          <Route
            path="/requests/new"
            element={
              <ProtectedRoute roles={['FACULTY', 'HOD']}>
                <CreateRequest />
              </ProtectedRoute>
            }
          />

          <Route
            path="/requests/:id/edit"
            element={
              <ProtectedRoute roles={['FACULTY', 'HOD']}>
                <EditRequest />
              </ProtectedRoute>
            }
          />

          <Route
            path="/requests/:id"
            element={
              <ProtectedRoute>
                <RequestDetails />
              </ProtectedRoute>
            }
          />

          {/* ================= PROFILE ================= */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* ================= 404 ================= */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* ================= TOAST ================= */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'white',
            color: '#1e293b',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </QueryClientProvider>
  );
}