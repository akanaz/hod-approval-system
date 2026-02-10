import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Profile</h1>

      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        {/* Profile Header */}
        <div className="flex items-center gap-6 mb-8 pb-8 border-b border-slate-200">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-lg">
            {user.firstName[0]}{user.lastName[0]}
          </div>
          <div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">
              {user.firstName} {user.lastName}
            </h2>
            <p className="text-slate-600">{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold">
                {user.role}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-600">{user.department}</span>
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ProfileField label="Role" value={user.role} icon="👔" />
          <ProfileField label="Employee ID" value={user.employeeId} icon="🆔" />
          <ProfileField label="Department" value={user.department} icon="🏢" />
          {user.phoneNumber && (
            <ProfileField label="Phone Number" value={user.phoneNumber} icon="📱" />
          )}
          <ProfileField 
            label="Member Since" 
            value={new Date(user.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })} 
            icon="📅" 
          />
        </div>
      </div>

      {/* Additional Info Card */}
      <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <span className="text-3xl">💡</span>
          <div>
            <h3 className="text-blue-800 font-semibold mb-2">Profile Information</h3>
            <p className="text-blue-700 text-sm">
              Keep your contact information up to date to ensure smooth communication regarding your requests. 
              If you need to update any information, please contact your system administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileField({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <label className="text-sm text-slate-600 font-semibold">{label}</label>
      </div>
      <div className="text-slate-800 font-semibold text-lg">{value}</div>
    </div>
  );
}
