import { useContext, useState, useRef, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Camera, Upload, User as UserIcon } from 'lucide-react';

const Settings = () => {
  const { user, setUser } = useContext(AuthContext);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('app-theme') || 'dark');
  const fileInputRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const handlePhotoUpload = async () => {
    if (!file) return;
    setUploading(true);
    setMessage('');
    
    const formData = new FormData();
    formData.append('profilePhoto', file);

    try {
      const { data } = await axios.put('/api/users/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true
      });
      
      setUser(data);
      localStorage.setItem('userInfo', JSON.stringify(data));
      setMessage('Profile photo updated successfully!');
      setFile(null);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!password || password.length < 6) {
      setMessage('Password must be at least 6 characters long');
      return;
    }
    setPasswordUpdating(true);
    setMessage('');
    
    try {
      await axios.put('/api/users/profile', { password }, { withCredentials: true });
      setMessage('Password updated successfully!');
      setPassword('');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to update password');
    } finally {
      setPasswordUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Settings & Profile</h1>
      <div className="glass-panel p-6 max-w-2xl">
        <h3 className="text-lg font-semibold text-slate-800 mb-6">Personal Information</h3>
        
        {message && (
          <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${message.includes('success') ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
            {message}
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-8 mb-8">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-32 h-32 rounded-full border-4 border-slate-100 overflow-hidden bg-slate-50 flex items-center justify-center">
              {file ? (
                <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
              ) : user?.profilePhoto ? (
                <img src={user.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={48} className="text-slate-300" />
              )}
            </div>
            
            <div className="flex flex-col gap-2 w-full">
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={(e) => setFile(e.target.files[0])}
                className="hidden" 
                accept="image/*"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary flex items-center justify-center gap-2 text-sm w-full"
              >
                <Camera size={16} /> Select Photo
              </button>
              
              {file && (
                <button 
                  onClick={handlePhotoUpload}
                  disabled={uploading}
                  className="btn-primary flex items-center justify-center gap-2 text-sm w-full"
                >
                  <Upload size={16} /> {uploading ? 'Uploading...' : 'Save Photo'}
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 space-y-4">
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

            <div className="grid grid-cols-2 gap-4">
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
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Application Theme</h3>
              <p className="text-sm text-slate-500">Toggle between Light and Dark mode</p>
            </div>
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${theme === 'dark' ? 'bg-primary' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Change Password</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">New Password</label>
              <div className="mt-1">
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  className="input-field" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <button 
              onClick={handlePasswordUpdate}
              disabled={passwordUpdating || !password} 
              className="btn-primary mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {passwordUpdating ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
