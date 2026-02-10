import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useRef, useEffect } from 'react';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const navItems =
    user?.role === 'ADMIN'
      ? [
        { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/profile', label: 'Profile', icon: '👤' },
      ]
      : user?.role === 'HOD'
        ? [
          { path: '/hod/dashboard', label: 'Dashboard', icon: '📊' },
          { path: '/profile', label: 'Profile', icon: '👤' },
        ]
        : [
          { path: '/faculty/dashboard', label: 'Dashboard', icon: '📊' },
          { path: '/requests/new', label: 'New Request', icon: '➕' },
          { path: '/profile', label: 'Profile', icon: '👤' },
        ];

  /* ================= CLICK OUTSIDE ================= */

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (menuRef.current.contains(event.target as Node)) return;
      setShowMenu(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSignOut = () => {
    setShowMenu(false);
    logout();
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden">

      {/* ================= BACKGROUND (ISOLATED) ================= */}
      <div className="fixed inset-0 -z-50 pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-300 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-indigo-300 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-purple-300 rounded-full blur-3xl opacity-30"></div>
      </div>

      {/* ================= HEADER ================= */}
      <header className="relative z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm pointer-events-auto">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center">
              <img
                src="/logo.png"
                alt="HOD Approval System Logo"
                className="w-10 h-10 object-contain"
              />
            </div>

            <div>
              <h1 className="text-xl font-bold text-slate-800">HOD Approval System</h1>
              <p className="text-xs text-slate-500">Early Departure Management</p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex gap-2">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${location.pathname === item.path
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                  }`}
              >
                {item.icon} {item.label}
              </Link>
            ))}
          </nav>

          {/* User Menu */}
          <div className="relative z-50" ref={menuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(v => !v);
              }}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold shadow-md"
            >
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </button>

            {showMenu && (
              <div
                className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 z-[9999]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 border-b">
                  <p className="font-semibold">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>

                <Link
                  to="/profile"
                  onClick={() => setShowMenu(false)}
                  className="block px-4 py-3 hover:bg-slate-50"
                >
                  👤 View Profile
                </Link>

                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 border-t"
                >
                  🚪 Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ================= MAIN ================= */}
      <main className="relative z-10 pointer-events-auto max-w-7xl mx-auto px-6 py-8">
        <Outlet />
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="relative z-10 py-6 text-center text-slate-500 text-sm bg-white/50 border-t">
        © 2026 HOD Approval System
      </footer>
    </div>
  );
}
