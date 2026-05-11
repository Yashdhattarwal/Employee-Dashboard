import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Calendar, Search, Filter, Plus, X, Edit2, Trash2, ChevronRight, User, ArrowLeft, Clock } from 'lucide-react';

const TeamManagement = () => {
  const { user } = useContext(AuthContext);
  const [employees, setEmployees] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    userId: '', date: new Date().toISOString().split('T')[0], status: 'Present', checkIn: '09:00', checkOut: '17:00', remarks: ''
  });

  const [corrections, setCorrections] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      let empEndpoint = '/api/users';
      let attEndpoint = '/api/attendance/all';
      
      if (user.role === 'manager') {
        empEndpoint = '/api/users/team';
        attEndpoint = '/api/attendance/team';
      }

      const [empRes, attRes, corrRes] = await Promise.all([
        axios.get(empEndpoint, { withCredentials: true }),
        axios.get(attEndpoint, { withCredentials: true }),
        axios.get('/api/attendance/corrections', { withCredentials: true }),
      ]);

      setEmployees(empRes.data);
      setAllRecords(attRes.data);
      setCorrections(corrRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user.role]);

  const handleSaveRecord = async (e) => {
    e.preventDefault();
    try {
      if (user.role === 'manager') {
        const payload = { 
          userId: editingId ? formData.userId : selectedEmployee.id, 
          date: formData.date,
          comment: formData.remarks || `Correction Request for ${formData.date}` 
        };
        await axios.post('/api/attendance/corrections', payload, { withCredentials: true });
      } else {
        const payload = { ...formData, userId: editingId ? formData.userId : selectedEmployee.id };
        await axios.post('/api/attendance', payload, { withCredentials: true });
      }
      setShowModal(false);
      setEditingId(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save record');
    }
  };

  const handleDeleteRecord = async (id) => {
    if (window.confirm('Delete this attendance record?')) {
      try {
        await axios.delete(`/api/attendance/${id}`, { withCredentials: true });
        fetchData();
      } catch (err) {
        alert('Failed to delete record');
      }
    }
  };

  const handleUpdateCorrectionStatus = async (id, status) => {
    try {
      await axios.put(`/api/attendance/corrections/${id}`, { status }, { withCredentials: true });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleEditClick = (r) => {
    setEditingId(r.id);
    setFormData({
      userId: r.userId,
      date: r.date,
      status: r.status,
      checkIn: r.checkIn || '09:00',
      checkOut: r.checkOut || '17:00',
      remarks: r.remarks || ''
    });
    setShowModal(true);
  };

  const filteredEmployees = employees.filter(e => 
    e.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateHours = (start, end, bStart, bEnd) => {
    if (!start || !end) return 0;
    const parseTime = (t) => {
      if (!t) return 0;
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    let mins = parseTime(end) - parseTime(start);
    if (bStart && bEnd) {
      const bMins = parseTime(bEnd) - parseTime(bStart);
      if (bMins > 0) mins -= bMins;
    }
    return Math.max(0, mins / 60);
  };

  const employeeRecords = selectedEmployee ? allRecords.filter(r => r.userId === selectedEmployee.id) : [];
  
  const stats = {
    presentDays: employeeRecords.filter(r => ['Present', 'Checked In', 'Checked Out'].includes(r.status)).length,
    totalHours: employeeRecords.reduce((acc, r) => acc + calculateHours(r.checkIn, r.checkOut, r.breakIn, r.breakOut), 0)
  };

  if (loading && employees.length === 0) return <div className="p-12 text-center text-slate-500">Loading team data...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {selectedEmployee && (
            <button onClick={() => setSelectedEmployee(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 className="text-2xl font-bold text-slate-800">
            {selectedEmployee ? `Manage: ${selectedEmployee.name}` : 'Team Management'}
          </h1>
        </div>
        
        {!selectedEmployee && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or ID..." 
              className="input-field pl-10 py-2 w-full md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}

        {selectedEmployee && (
          <button 
            onClick={() => { setEditingId(null); setShowModal(true); }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            Add Record
          </button>
        )}
      </div>

      {/* Main Content */}
      {!selectedEmployee ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map(emp => (
            <div 
              key={emp.id} 
              onClick={() => setSelectedEmployee(emp)}
              className="glass-panel p-5 cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all group border-transparent border-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <User size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{emp.name}</h3>
                    <p className="text-sm text-slate-500">{emp.employeeId}</p>
                  </div>
                </div>
                <ChevronRight className="text-slate-300 group-hover:text-primary transition-colors" />
              </div>
              <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between text-xs font-medium text-slate-400">
                <span>{emp.role.toUpperCase()}</span>
                <span className={emp.activeStatus ? 'text-success' : 'text-danger'}>
                  {emp.activeStatus ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          {/* Employee Info Card */}
          <div className="glass-panel p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
            <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <User size={40} />
            </div>
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Full Name</p>
                <p className="text-lg font-bold text-slate-800">{selectedEmployee.name}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Email</p>
                <p className="text-slate-600 text-sm truncate">{selectedEmployee.email}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Employee ID</p>
                <p className="text-slate-600 font-medium">{selectedEmployee.employeeId}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status</p>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold ${selectedEmployee.activeStatus ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                  {selectedEmployee.activeStatus ? 'ACTIVE' : 'DEACTIVATED'}
                </span>
              </div>
              <div className="bg-primary/5 p-3 rounded-xl border border-primary/10 text-center">
                <p className="text-[10px] font-bold text-primary uppercase">Total Present</p>
                <p className="text-xl font-bold text-primary">{stats.presentDays}</p>
              </div>
              <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 text-center">
                <p className="text-[10px] font-bold text-indigo-600 uppercase">Total Hours</p>
                <p className="text-xl font-bold text-indigo-600">{stats.totalHours.toFixed(1)}h</p>
              </div>
            </div>
          </div>

          {/* Attendance List */}
          <div className="glass-panel overflow-x-auto custom-scrollbar">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Calendar size={20} className="text-primary" />
                Attendance History
              </h2>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="table-header">Date</th>
                  <th className="table-header">Check In</th>
                  <th className="table-header">Check Out</th>
                  <th className="table-header">Hours</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Status</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employeeRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                    <td className="table-cell font-medium text-slate-600">{r.date}</td>
                    <td className="table-cell text-slate-600 font-medium text-success">{r.checkIn || '--:--'}</td>
                    <td className="table-cell text-slate-600 font-medium text-danger">{r.checkOut || '--:--'}</td>
                    <td className="table-cell font-bold text-slate-700">
                      {calculateHours(r.checkIn, r.checkOut, r.breakIn, r.breakOut).toFixed(1)}h
                    </td>
                    <td className="table-cell">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        r.status === 'On Leave' ? 'bg-amber-500/10 text-amber-600' :
                        r.status === 'Absent' ? 'bg-danger/10 text-danger' :
                        r.status === 'Weekoff' ? 'bg-indigo-100 text-indigo-600' :
                        'bg-success/10 text-success'
                      }`}>
                        {r.status === 'On Leave' ? 'On Leave' : r.status === 'Absent' ? 'Absent' : r.status === 'Weekoff' ? 'Weekoff' : 'Present'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        r.status === 'Present' ? 'bg-success/10 text-success' :
                        r.status === 'On Break' ? 'bg-amber-500/10 text-amber-600' :
                        r.status === 'Checked Out' ? 'bg-slate-500/10 text-slate-600' :
                        'bg-danger/10 text-danger'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="table-cell text-right">
                      {user.role === 'admin' && (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleEditClick(r)} className="p-2 text-slate-400 hover:text-primary transition-colors">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDeleteRecord(r.id)} className="p-2 text-slate-400 hover:text-danger transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {employeeRecords.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-12 text-center text-slate-400 italic">No attendance records found for this employee</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Correction Requests List */}
          <div className="glass-panel p-6 mt-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Clock size={20} className="text-primary" />
              Attendance Correction Requests
            </h2>
            <div className="space-y-3">
              {corrections.map(c => (
                <div key={c.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <p className="text-sm font-bold text-slate-800">
                      For: {c.user?.name} | Date: {c.date}
                    </p>
                    <span className="text-xs text-slate-400 font-medium">
                      {new Date(c.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm mt-2">"{c.comment}"</p>
                  <div className="flex justify-between items-center mt-2 flex-wrap gap-2">
                    <p className="text-xs font-semibold text-primary">Requested by Manager: {c.manager?.name}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`px-2 py-0.5 rounded-full font-bold ${
                        c.status === 'Approved' ? 'bg-success/10 text-success' :
                        c.status === 'Rejected' ? 'bg-danger/10 text-danger' :
                        'bg-warning/10 text-warning'
                      }`}>
                        {c.status || 'Pending'}
                      </span>
                      {user?.role === 'admin' && (c.status === 'Pending' || !c.status) && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleUpdateCorrectionStatus(c.id, 'Approved')} className="p-1 px-2 bg-success text-white rounded text-[10px] font-bold hover:bg-success/80">Approve</button>
                          <button onClick={() => handleUpdateCorrectionStatus(c.id, 'Rejected')} className="p-1 px-2 bg-danger text-white rounded text-[10px] font-bold hover:bg-danger/80">Disapprove</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {corrections.length === 0 && (
                <p className="text-sm text-slate-400 italic text-center py-4">No correction requests found.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-slate-800 mb-6">
              {user.role === 'manager' ? 'Request Attendance Correction' : `${editingId ? 'Edit' : 'New'} Record for ${selectedEmployee?.name}`}
            </h2>
            
            <form onSubmit={handleSaveRecord} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Date</label>
                <input type="date" className="input-field mt-1" 
                  value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} 
                />
              </div>

              {user.role === 'manager' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700">Correction Request / Comment</label>
                  <textarea 
                    className="input-field mt-1 h-24" 
                    placeholder="e.g. Mark employee present, wrong check-in time..."
                    value={formData.remarks} 
                    onChange={e => setFormData({...formData, remarks: e.target.value})}
                  />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Check In</label>
                      <input type="time" className="input-field mt-1" 
                        value={formData.checkIn} onChange={e => setFormData({...formData, checkIn: e.target.value})} 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Check Out</label>
                      <input type="time" className="input-field mt-1" 
                        value={formData.checkOut} onChange={e => setFormData({...formData, checkOut: e.target.value})} 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Status</label>
                    <select className="input-field mt-1" 
                      value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}
                    >
                      <option value="Present">Present</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Absent">Absent</option>
                      <option value="Weekoff">Weekoff</option>
                    </select>
                  </div>
                </>
              )}
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">{editingId ? 'Update' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;
