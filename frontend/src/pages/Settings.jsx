import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const Settings = () => {
  const { user } = useContext(AuthContext);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Settings & Profile</h1>
      <div className="glass-panel p-6 max-w-2xl">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Personal Information</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Full Name</label>
            <div className="mt-1">
              <input type="text" disabled value={user?.name || ''} className="input-field bg-slate-100" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700">Email Address</label>
            <div className="mt-1">
              <input type="email" disabled value={user?.email || ''} className="input-field bg-slate-100" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Role</label>
            <div className="mt-1">
              <input type="text" disabled value={user?.role || ''} className="input-field bg-slate-100 capitalize" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Designation</label>
            <div className="mt-1">
              <input type="text" disabled value={user?.designation || 'N/A'} className="input-field bg-slate-100" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Employment Type</label>
            <div className="mt-1">
              <input type="text" disabled value={user?.employmentType || 'Full-time'} className="input-field bg-slate-100" />
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Change Password</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Current Password</label>
              <div className="mt-1">
                <input type="password" placeholder="••••••••" className="input-field" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">New Password</label>
              <div className="mt-1">
                <input type="password" placeholder="••••••••" className="input-field" />
              </div>
            </div>
            <button className="btn-primary mt-2">Update Password</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
