import { useContext, useState, useRef, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Camera, Upload, User as UserIcon, Eye, EyeOff, Check, X } from 'lucide-react';

const Settings = () => {
  const { user, setUser } = useContext(AuthContext);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('app-theme') || 'dark');
  const fileInputRef = useRef(null);

  // Crop states
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState('');
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const passwordRules = [
    { label: 'Minimum 8 characters', test: (pwd) => pwd.length >= 8 },
    { label: 'At least 1 uppercase letter', test: (pwd) => /[A-Z]/.test(pwd) },
    { label: 'At least 1 lowercase letter', test: (pwd) => /[a-z]/.test(pwd) },
    { label: 'At least 1 number', test: (pwd) => /\d/.test(pwd) },
    { label: 'At least 1 special character (!@#$%^&* etc.)', test: (pwd) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd) },
    { label: 'No spaces allowed', test: (pwd) => pwd.length > 0 && !/\s/.test(pwd) }
  ];

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result);
      setShowCropModal(true);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDragStart = (e) => {
    setIsDragging(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setOffset({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleCropApply = () => {
    const img = new Image();
    img.src = cropImageSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 300, 300);
      
      const imageAspect = img.width / img.height;
      let drawWidth = 300;
      let drawHeight = 300;
      
      if (imageAspect > 1) {
        drawHeight = 300 / imageAspect;
      } else {
        drawWidth = 300 * imageAspect;
      }
      
      ctx.translate(150 + offset.x, 150 + offset.y);
      ctx.scale(zoom, zoom);
      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      
      canvas.toBlob((blob) => {
        const croppedFile = new File([blob], 'cropped-profile.jpg', { type: 'image/jpeg' });
        setFile(croppedFile);
        setShowCropModal(false);
      }, 'image/jpeg', 0.95);
    };
  };

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
                onChange={handleFileChange}
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
              <div className="mt-1 relative rounded-xl shadow-sm">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="••••••••" 
                  className="input-field pr-10" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {password && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password Requirements:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {passwordRules.map((rule, idx) => {
                    const passed = rule.test(password);
                    return (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        {passed ? (
                          <Check size={14} className="text-success" />
                        ) : (
                          <X size={14} className="text-danger" />
                        )}
                        <span className={passed ? 'text-success font-medium animate-in fade-in duration-300' : 'text-danger font-medium'}>
                          {rule.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button 
              onClick={handlePasswordUpdate}
              disabled={passwordUpdating || !password || !passwordRules.every(rule => rule.test(password))} 
              className="btn-primary mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {passwordUpdating ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </div>
      </div>

      {/* Profile Photo Crop Modal */}
      {showCropModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-primary p-5 text-white">
              <h3 className="text-lg font-bold">Crop Profile Photo</h3>
              <p className="text-primary-foreground/80 text-xs mt-1">Drag the photo to position, or use the slider to zoom.</p>
            </div>
            
            <div className="p-6 flex flex-col items-center gap-6">
              {/* Cropping Arena */}
              <div 
                className="relative w-64 h-64 border border-slate-200 bg-slate-900 rounded-xl overflow-hidden cursor-move select-none"
                onMouseDown={handleDragStart}
                onMouseMove={handleDragMove}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
                onTouchStart={handleDragStart}
                onTouchMove={handleDragMove}
                onTouchEnd={handleDragEnd}
              >
                <img 
                  src={cropImageSrc} 
                  alt="Crop Target" 
                  className="absolute pointer-events-none origin-center"
                  style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                    top: '0px',
                    left: '0px',
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                />
                {/* Circular overlay representing crop frame */}
                <div className="absolute inset-0 border-4 border-primary rounded-full pointer-events-none bg-slate-950/30 mix-blend-overlay"></div>
              </div>

              {/* Zoom Control Slider */}
              <div className="w-full space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                  <span>Zoom</span>
                  <span>{Math.round(zoom * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="3" 
                  step="0.05" 
                  value={zoom} 
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 w-full mt-2">
                <button 
                  onClick={() => {
                    setShowCropModal(false);
                    setFile(null);
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCropApply}
                  className="btn-primary flex-1"
                >
                  Crop & Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
