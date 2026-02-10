// frontend/src/components/ProfileMenu.tsx

import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProfileMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [open]);

  const handleSignOut = () => {
    setOpen(false);
    logout();
  };

  if (!user) return null;

  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`;
  const bgColor = user.role === 'HOD' || user.role === 'ADMIN'
    ? 'bg-emerald-600'
    : 'bg-blue-600';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2 ${bgColor} text-white rounded-full hover:opacity-90 transition-all shadow-md hover:shadow-lg`}
        aria-label="User menu"
      >
        <span className="hidden sm:block text-sm font-medium">{user.firstName}</span>
        <div className={`h-9 w-9 ${bgColor} rounded-full flex items-center justify-center font-bold text-sm border-2 border-white`}>
          {initials}
        </div>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >

          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{user.email}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {user.employeeId} • {user.role}
            </p>
          </div>

          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="w-full px-4 py-3 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium flex items-center gap-2"
          >
            <span>👤</span>
            View Profile
          </Link>

          <button
            onClick={handleSignOut}
            className="w-full px-4 py-3 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium flex items-center gap-2 border-t border-slate-200 dark:border-slate-700"
          >
            <span>🚪</span>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
