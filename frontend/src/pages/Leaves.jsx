import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { FileText, Plus, X, Check, AlertCircle } from 'lucide-react';

const Leaves = () => {
  const { user } = useContext(AuthContext);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({
    type: 'Annual', fromDate: '', toDate: '', reason: ''
  });

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      let endpoint = '/api/leaves/my';
      if (user.role === 'admin') endpoint = '/api/leaves/all';
      else if (user.role === 'manager') endpoint = '/api/leaves/team';

      const { data } = await axios.get(endpoint, { withCredentials: true });
      setLeaves(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [user.role]);

  const handleApply = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/leaves', formData, { withCredentials: true });
      setShowModal(false);
      fetchLeaves();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to apply for leave');
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await axios.put(`/api/leaves/${id}/status`, { status }, { withCredentials: true });
      fetchLeaves();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Leave Management</h1>
        <button 
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Apply for Leave
        </button>
      </div>

      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading leave requests...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                {user.role !== 'employee' && <th className="table-header">Employee</th>}
                <th className="table-header">Type</th>
                <th className="table-header">Dates</th>
                <th className="table-header">Reason</th>
                <th className="table-header">Status</th>
                {(user.role === 'admin' || user.role === 'manager') && <th className="table-header">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {leaves.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                  {user.role !== 'employee' && (
                    <td className="table-cell font-semibold text-slate-800">{l.user?.name || 'Self'}</td>
                  )}
                  <td className="table-cell">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded">
                      {l.type}
                    </span>
                  </td>
                  <td className="table-cell text-sm text-slate-600">
                    {new Date(l.fromDate).toLocaleDateString()} - {new Date(l.toDate).toLocaleDateString()}
                  </td>
                  <td className="table-cell text-slate-500 max-w-xs truncate">{l.reason}</td>
                  <td className="table-cell">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      l.status === 'Approved' ? 'bg-success/10 text-success' :
                      l.status === 'Rejected' ? 'bg-danger/10 text-danger' :
                      'bg-warning/10 text-warning'
                    }`}>
                      {l.status}
                    </span>
                  </td>
                  {(user.role === 'admin' || user.role === 'manager') && (
                    <td className="table-cell">
                      {l.status === 'Pending' && (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleStatusUpdate(l._id, 'Approved')}
                            className="p-1.5 bg-success/10 text-success hover:bg-success hover:text-white rounded-lg transition-all"
                            title="Approve"
                          >
                            <Check size={16} />
                          </button>
                          <button 
                            onClick={() => handleStatusUpdate(l._id, 'Rejected')}
                            className="p-1.5 bg-danger/10 text-danger hover:bg-danger hover:text-white rounded-lg transition-all"
                            title="Reject"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {leaves.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-slate-400">
                    No leave requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-slate-800 mb-6">Apply for Leave</h2>
            
            <form onSubmit={handleApply} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Leave Type</label>
                <select className="input-field mt-1" 
                  value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}
                >
                  <option value="Annual">Annual Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Casual">Casual Leave</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">From Date</label>
                  <input required type="date" className="input-field mt-1" 
                    value={formData.fromDate} onChange={e => setFormData({...formData, fromDate: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">To Date</label>
                  <input required type="date" className="input-field mt-1" 
                    value={formData.toDate} onChange={e => setFormData({...formData, toDate: e.target.value})} 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Reason</label>
                <textarea required rows="3" className="input-field mt-1" placeholder="Why are you taking leave?"
                  value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} 
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaves;
