import { useState, useEffect, useContext } from 'react';
import { X, Trash2, Shield, UserX, UserCheck, Pencil } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const Users = () => {
  const { user: currentUser } = useContext(AuthContext);
  const [showModal, setShowModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [users, setUsers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'employee', managerId: '',
    salaryINR: '', salaryUSD: '', salaryCurrency: 'INR',
    bankName: '', accountHolderName: '', accountNumber: '', ifscCode: '', branchName: '',
    shiftTime: '09:00 AM',
    shiftEndTime: '06:00 PM'
  });

  const fetchUsers = async () => {
    try {
      const { data } = await axios.get('/api/users', { withCredentials: true });
      setUsers(data);
      setManagers(data.filter(u => u.role === 'manager'));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      setError('');
      if (editingUserId) {
        // Don't enforce password update unless filled
        const payload = { ...formData };
        if (!payload.password) delete payload.password;
        await axios.put(`/api/users/${editingUserId}`, payload, { withCredentials: true });
      } else {
        await axios.post('/api/users', formData, { withCredentials: true });
      }
      setShowModal(false);
      setEditingUserId(null);
      setFormData({ name: '', email: '', password: '', role: 'employee', managerId: '',
        salaryINR: '', salaryUSD: '', salaryCurrency: 'INR',
        bankName: '', accountHolderName: '', accountNumber: '', ifscCode: '', branchName: '',
        shiftTime: '09:00 AM',
        shiftEndTime: '06:00 PM'
      });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save user');
    }
  };

  const handleStatusToggle = async (id, currentStatus) => {
    try {
      await axios.put(`/api/users/${id}/status`, { activeStatus: !currentStatus }, { withCredentials: true });
      fetchUsers();
    } catch (err) {
      alert('Failed to update status');
    }
  };
  const handleEditClick = (u) => {
    setEditingUserId(u.id);
    setFormData({
      name: u.name || '',
      email: u.email || '',
      password: '', 
      role: u.role || 'employee',
      managerId: u.managerId || '',
      salaryINR: u.salaryINR || '',
      salaryUSD: u.salaryUSD || '',
      salaryCurrency: u.salaryCurrency || 'INR',
      bankName: u.bankName || '',
      accountHolderName: u.accountHolderName || '',
      accountNumber: u.accountNumber || '',
      ifscCode: u.ifscCode || '',
      branchName: u.branchName || '',
      shiftTime: u.shiftTime || '09:00 AM',
      shiftEndTime: u.shiftEndTime || '06:00 PM'
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('PERMANENTLY DELETE this user? All their attendance and records will be lost.')) {
      try {
        await axios.delete(`/api/users/${id}`, { withCredentials: true });
        fetchUsers();
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete user');
      }
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
        <button className="btn-primary" onClick={() => setShowModal(true)}>Add New User</button>
      </div>
      
      <div className="glass-panel overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="table-header">Emp ID</th>
              <th className="table-header">Name</th>
              <th className="table-header">Email</th>
              <th className="table-header">Role</th>
              <th className="table-header">Manager</th>
              <th className="table-header">Status</th>
              <th className="table-header text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="table-cell font-medium text-slate-500">{u.employeeId}</td>
                <td className="table-cell font-medium">{u.name}</td>
                <td className="table-cell">{u.email}</td>
                <td className="table-cell capitalize">
                  <span className={`flex items-center gap-1 ${u.role === 'admin' ? 'text-primary font-bold' : ''}`}>
                    {u.role === 'admin' && <Shield size={14} />}
                    {u.role}
                  </span>
                </td>
                <td className="table-cell">{u.manager?.name || '-'}</td>
                <td className="table-cell">
                  <button 
                    onClick={() => handleStatusToggle(u.id, u.activeStatus)}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-all flex items-center gap-1 ${u.activeStatus ? 'bg-success/10 text-success hover:bg-success/20' : 'bg-danger/10 text-danger hover:bg-danger/20'}`}
                  >
                    {u.activeStatus ? <UserCheck size={12} /> : <UserX size={12} />}
                    {u.activeStatus ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="table-cell text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => handleEditClick(u)}
                      className="p-2 text-slate-400 hover:text-primary transition-colors"
                      title="Edit User"
                    >
                      <Pencil size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(u.id)}
                      disabled={u.id === currentUser.id}
                      className="p-2 text-slate-400 hover:text-danger disabled:opacity-30 transition-colors"
                      title="Delete User"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center py-8 text-slate-500 italic">No users found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-slate-800 mb-6">{editingUserId ? 'Edit User Details' : 'Add New User'}</h2>
            
            {error && <div className="mb-4 bg-danger/10 text-danger px-4 py-2 rounded-lg text-sm">{error}</div>}

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Full Name</label>
                  <input required type="text" className="input-field mt-1" 
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Email Address</label>
                <input required type="email" className="input-field mt-1" 
                  value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Password {editingUserId && '(Leave blank to keep current)'}</label>
                <input required={!editingUserId} type="password" placeholder={editingUserId ? "Optional" : "Min 6 characters"} className="input-field mt-1" 
                  value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} 
                />
              </div>

              {/* Salary Fields */}
              <div className="border-t border-slate-100 pt-4">
                <h3 className="text-sm font-bold text-slate-800 mb-2">Salary Details (Optional)</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700">Salary in INR</label>
                    <input type="number" className="input-field mt-1" placeholder="INR Amount"
                      value={formData.salaryINR} onChange={e => setFormData({...formData, salaryINR: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">Salary in USD</label>
                    <input type="number" className="input-field mt-1" placeholder="USD Amount"
                      value={formData.salaryUSD} onChange={e => setFormData({...formData, salaryUSD: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">Preferred Currency</label>
                    <select className="input-field mt-1" value={formData.salaryCurrency} onChange={e => setFormData({...formData, salaryCurrency: e.target.value})}>
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              <div className="border-t border-slate-100 pt-4">
                <h3 className="text-sm font-bold text-slate-800 mb-2">Bank Details (Optional)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700">Bank Name</label>
                    <input type="text" className="input-field mt-1" 
                      value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">Account Holder Name</label>
                    <input type="text" className="input-field mt-1" 
                      value={formData.accountHolderName} onChange={e => setFormData({...formData, accountHolderName: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">Account Number</label>
                    <input type="text" className="input-field mt-1" 
                      value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">IFSC Code</label>
                    <input type="text" className="input-field mt-1" 
                      value={formData.ifscCode} onChange={e => setFormData({...formData, ifscCode: e.target.value})} 
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-700">Branch Name</label>
                    <input type="text" className="input-field mt-1" 
                      value={formData.branchName} onChange={e => setFormData({...formData, branchName: e.target.value})} 
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Role</label>
                  <select className="input-field mt-1" 
                    value={formData.role} onChange={e => setFormData({...formData, role: e.target.value, managerId: ''})}
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Shift Start Time</label>
                    <input type="text" placeholder="e.g. 09:00 AM" className="input-field mt-1"
                      value={formData.shiftTime} onChange={e => setFormData({...formData, shiftTime: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Shift End Time</label>
                    <input type="text" placeholder="e.g. 06:00 PM" className="input-field mt-1"
                      value={formData.shiftEndTime} onChange={e => setFormData({...formData, shiftEndTime: e.target.value})}
                    />
                  </div>
                </div>
                
                {formData.role === 'employee' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Assign Manager</label>
                    <select required className="input-field mt-1" 
                      value={formData.managerId} onChange={e => setFormData({...formData, managerId: e.target.value})}
                    >
                      <option value="">Select Manager</option>
                      {managers.map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.employeeId})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => { setShowModal(false); setEditingUserId(null); }} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">{editingUserId ? 'Save Changes' : 'Create User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
