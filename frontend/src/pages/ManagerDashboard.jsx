import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Coffee, LogOut, CheckCircle, Users, Calendar, Ticket, X, UserCheck, Download, FileText, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { AuthContext } from '../context/AuthContext';

const formatWorkingHours = (hoursDecimal) => {
  if (!hoursDecimal) return '-';
  const num = parseFloat(hoursDecimal);
  if (isNaN(num)) return '-';
  const h = Math.floor(num);
  const m = Math.round((num - h) * 60);
  if (h === 0 && m === 0) return '0m';
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

const ManagerDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState(null);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    onLeave: 0,
    pendingTickets: 0,
    attendanceTrend: [],
    recentLeaves: [],
    presentList: [],
    staffList: [],
    leavesList: [],
    ticketsList: []
  });
  const [loading, setLoading] = useState(true);
  const [showPresentModal, setShowPresentModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showTicketsModal, setShowTicketsModal] = useState(false);
  const [showEodModal, setShowEodModal] = useState(false);
  const [eodData, setEodData] = useState({
    workDone: '',
    pendingTasks: '',
    attachment: null
  });
  const [submittingEod, setSubmittingEod] = useState(false);
  const [liveTime, setLiveTime] = useState({ work: 0, break: 0 });
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [selectedEodRecord, setSelectedEodRecord] = useState(null);

  const parseTimeToDate = (timeStr, recordDate) => {
    if (!timeStr) return null;
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':');
    if (hours === '12') hours = '00';
    if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
    const d = recordDate ? new Date(recordDate) : new Date();
    d.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    return d;
  };

  useEffect(() => {
    if (!attendance) {
      setLiveTime({ work: 0, break: 0 });
      return;
    }

    if (attendance.status === 'Checked Out' || attendance.checkOut) {
      // Calculate final static working time
      const checkInDate = attendance.checkInTimeISO 
        ? new Date(attendance.checkInTimeISO) 
        : parseTimeToDate(attendance.checkIn, attendance.date);
      const checkOutDate = attendance.checkOutTimeISO
        ? new Date(attendance.checkOutTimeISO)
        : parseTimeToDate(attendance.checkOut, attendance.date);

      if (checkInDate && checkOutDate) {
        const totalBreakMs = (attendance.breaks || []).reduce((acc, b) => {
          if (b.durationMinutes) return acc + (b.durationMinutes * 60000);
          return acc;
        }, 0);
        const totalElapsed = Math.max(0, checkOutDate - checkInDate);
        const workingMs = Math.max(0, totalElapsed - totalBreakMs);
        setLiveTime({ work: workingMs, break: 0 });
      }
      return;
    }

    const timer = setInterval(() => {
      const now = new Date();
      const checkInDate = attendance.checkInTimeISO 
        ? new Date(attendance.checkInTimeISO) 
        : parseTimeToDate(attendance.checkIn, attendance.date);
      if (!checkInDate) return;

      let totalBreakMs = (attendance.breaks || []).reduce((acc, b) => {
        if (b.durationMinutes) return acc + (b.durationMinutes * 60000);
        return acc;
      }, 0);

      let currentBreakMs = 0;
      if (attendance.status === 'On Break') {
        const activeBreak = attendance.breaks?.find(b => !b.endTime);
        if (activeBreak) {
          const breakStartDate = activeBreak.startTimeISO 
            ? new Date(activeBreak.startTimeISO) 
            : parseTimeToDate(activeBreak.startTime, attendance.date);
          if (breakStartDate) {
            currentBreakMs = Math.max(0, now - breakStartDate);
          }
        }
      }

      const totalElapsed = Math.max(0, now - checkInDate);
      const workingMs = totalElapsed - totalBreakMs - currentBreakMs;

      setLiveTime({
        work: Math.max(0, workingMs),
        break: Math.max(0, currentBreakMs)
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [attendance]);

  const formatMs = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const fetchStatus = async () => {
    try {
      const { data } = await axios.get('/api/attendance/status', { withCredentials: true });
      setAttendance(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await axios.get('/api/users/stats', { withCredentials: true });
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchStatus(), fetchStats()]);
      setLoading(false);
    };
    init();
  }, []);

  const handleAction = async (type) => {
    if (type === 'clock-out') {
      setShowEodModal(true);
      return;
    }
    try {
      await axios.post('/api/attendance/action', { type }, { withCredentials: true });
      fetchStatus();
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    }
  };

  const submitEod = async (e) => {
    e.preventDefault();
    if (!eodData.workDone.trim()) return alert('Please describe your work done today');

    try {
      setSubmittingEod(true);
      const formData = new FormData();
      formData.append('type', 'clock-out');
      formData.append('eodWork', eodData.workDone);
      formData.append('pendingTasks', eodData.pendingTasks);
      if (eodData.attachment) {
        formData.append('eodAttachment', eodData.attachment);
      }

      await axios.post('/api/attendance/action', formData, { 
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setShowEodModal(false);
      setEodData({ workDone: '', pendingTasks: '', attachment: null });
      fetchStatus();
      setShowSuccessAlert(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Clock out failed');
    } finally {
      setSubmittingEod(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]">Loading...</div>;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Manager Dashboard</h1>
        <div className="flex flex-col text-right">
          <p className="text-sm font-bold text-slate-800">{user?.name} ({user?.employeeId})</p>
          <p className="text-xs text-slate-500 font-medium">Reporting to: {user?.managerName || 'N/A'}</p>
        </div>
      </div>
      
      {showSuccessAlert && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 px-4 py-3 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-300 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-emerald-500" />
            <span className="font-semibold text-sm">Clocked-out Successfully! Have a great evening!</span>
          </div>
          <button onClick={() => setShowSuccessAlert(false)} className="hover:bg-emerald-500/10 p-1 rounded-full transition-all text-emerald-500">
            <X size={16} />
          </button>
        </div>
      )}
      
      <div className="glass-panel p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Clock size={20} className="text-primary" />
          My Attendance
        </h2>
        
        <div className="flex flex-wrap gap-4">
          {!attendance?.checkIn ? (
            <button 
              onClick={() => handleAction('clock-in')}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              <CheckCircle size={20} />
              Clock In
            </button>
          ) : (
            <>
              <div className="flex-1 min-w-[200px] bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Status: <span className="text-slate-800 font-bold">{attendance.status}</span></p>
                  <p className="text-sm text-slate-500 mt-1">Started at {attendance.checkIn}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-primary uppercase">Live Work Time</p>
                  <p className="text-2xl font-mono font-bold text-primary">{formatMs(liveTime.work)}</p>
                  {attendance.status === 'On Break' && (
                    <div className="mt-1">
                      <p className="text-[10px] font-bold text-amber-500 uppercase">Current Break</p>
                      <p className="text-lg font-mono font-bold text-amber-500">{formatMs(liveTime.break)}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                {attendance.status === 'On Break' ? (
                  <button 
                    onClick={() => handleAction('break-out')}
                    className="flex items-center gap-2 px-6 py-3 bg-success text-white rounded-xl font-semibold hover:bg-success/90 transition-all"
                  >
                    <Coffee size={20} />
                    End Break
                  </button>
                ) : (
                  <button 
                    disabled={attendance.status === 'Checked Out' || !!attendance.checkOut}
                    onClick={() => handleAction('break-in')}
                    className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-all disabled:opacity-50"
                  >
                    <Coffee size={20} />
                    Take Break
                  </button>
                )}

                <button 
                  disabled={attendance.status === 'Checked Out' || !!attendance.checkOut}
                  onClick={() => handleAction('clock-out')}
                  className="flex items-center gap-2 px-6 py-3 bg-danger text-white rounded-xl font-semibold hover:bg-danger/90 transition-all disabled:opacity-50"
                >
                  <LogOut size={20} />
                  Clock Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { title: 'Team Size', value: stats.totalEmployees, icon: Users, color: 'text-primary', clickable: true, type: 'staff' },
          { title: 'Present Today', value: stats.presentToday, icon: CheckCircle, color: 'text-success', clickable: true, type: 'present' },
          { title: 'On Leave', value: stats.onLeave, icon: Calendar, color: 'text-warning', clickable: true, type: 'leave' },
          { title: 'Team Tickets', value: stats.pendingTickets, icon: Ticket, color: 'text-danger', clickable: true, type: 'tickets' },
        ].map((card, i) => (
          <div 
            key={i} 
            onClick={() => {
              if (card.clickable) {
                if (card.type === 'staff') setShowStaffModal(true);
                if (card.type === 'present') setShowPresentModal(true);
                if (card.type === 'leave') setShowLeaveModal(true);
                if (card.type === 'tickets') setShowTicketsModal(true);
              }
            }}
            className={`glass-panel p-6 ${
              card.clickable ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.99] transition-all duration-300' : ''
            } ${
              card.type === 'staff' ? 'hover:border-primary/40' :
              card.type === 'present' ? 'hover:border-success/40' :
              card.type === 'leave' ? 'hover:border-warning/40' :
              card.type === 'tickets' ? 'hover:border-danger/40' : ''
            }`}
          >
             <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                {card.title}
             </p>
             <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-slate-800">{card.value}</h3>
                <card.icon size={20} className={card.color} />
             </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6 h-[400px] flex flex-col">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Team Attendance Trend</h2>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Area type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={2} fill="#4f46e5" fillOpacity={0.05} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6 h-[400px] flex flex-col">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Recent Team Leaves</h2>
          <div className="space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
            {stats.recentLeaves.map((l, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center font-bold text-primary text-xs">
                    {l.user?.name?.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{l.user?.name}</p>
                    <p className="text-[10px] text-slate-400">{new Date(l.fromDate).toLocaleDateString()} - {l.type}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  l.status === 'Approved' ? 'bg-success/10 text-success' :
                  l.status === 'Rejected' ? 'bg-danger/10 text-danger' :
                  'bg-warning/10 text-warning'
                }`}>
                  {l.status}
                </span>
              </div>
            ))}
            {stats.recentLeaves.length === 0 && <p className="text-center text-slate-400 py-12 text-sm italic">No team leave requests</p>}
          </div>
        </div>
    </div>

      {/* EOD Report Modal */}
      {showEodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-primary p-6 text-white">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <CheckCircle size={24} />
                End of Day Report
              </h2>
              <p className="text-primary-foreground/80 text-sm mt-1">Please summarize your progress before checking out.</p>
            </div>
            
            <form onSubmit={submitEod} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">What did you work on today? *</label>
                <textarea 
                  required
                  className="input-field min-h-[100px] resize-none"
                  placeholder="Describe your tasks and achievements..."
                  value={eodData.workDone}
                  onChange={e => setEodData({...eodData, workDone: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Any pending tasks for tomorrow?</label>
                <textarea 
                  className="input-field min-h-[80px] resize-none"
                  placeholder="List items to be followed up..."
                  value={eodData.pendingTasks}
                  onChange={e => setEodData({...eodData, pendingTasks: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Attachment (Optional)</label>
                <div className="mt-1 flex items-center justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl hover:border-primary transition-colors cursor-pointer relative">
                  <div className="space-y-1 text-center">
                    <svg className="mx-auto h-10 w-10 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="flex text-sm text-slate-600">
                      <span className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary/80">
                        Upload a file
                      </span>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-slate-500">PNG, JPG, PDF up to 10MB</p>
                    {eodData.attachment && <p className="text-xs font-bold text-success mt-2">Selected: {eodData.attachment.name}</p>}
                  </div>
                  <input 
                    type="file" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={e => setEodData({...eodData, attachment: e.target.files[0]})}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowEodModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submittingEod}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {submittingEod ? 'Saving...' : 'Submit & Clock Out'}
                  <LogOut size={18} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPresentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]">
            <div className="bg-success p-6 text-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <UserCheck size={24} />
                  Present Today ({stats.presentList?.length || 0})
                </h2>
                <p className="text-emerald-100 text-xs mt-1">Detailed log of checked-in team members for today.</p>
              </div>
              <button 
                onClick={() => setShowPresentModal(false)}
                className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-all"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {(!stats.presentList || stats.presentList.length === 0) ? (
                <div className="text-center py-12 text-slate-400">
                  <UserCheck size={48} className="mx-auto mb-3 opacity-25" />
                  <p className="font-semibold text-slate-600">No team members present today yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="pb-3 text-xs font-bold text-slate-400 uppercase">Team Member</th>
                        <th className="pb-3 text-xs font-bold text-slate-400 uppercase">Clock In</th>
                        <th className="pb-3 text-xs font-bold text-slate-400 uppercase">Clock Out</th>
                        <th className="pb-3 text-xs font-bold text-slate-400 uppercase">Working Hours</th>
                        <th className="pb-3 text-xs font-bold text-slate-400 uppercase">EOD Report</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {stats.presentList.map((entry) => (
                        <tr key={entry._id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 font-semibold text-slate-800">
                            <div className="flex flex-col">
                              <span>{entry.user?.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono font-medium">{entry.user?.employeeId}</span>
                            </div>
                          </td>
                          <td className="py-4 text-sm font-medium text-slate-600 font-mono">{entry.checkIn || '-'}</td>
                          <td className="py-4 text-sm font-medium text-slate-600 font-mono">{entry.checkOut || '-'}</td>
                          <td className="py-4 text-sm font-bold text-primary font-mono">{formatWorkingHours(entry.workingHours)}</td>
                          <td className="py-4">
                            {entry.eodWork ? (
                              <button
                                onClick={() => setSelectedEodRecord(entry)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold transition-all shadow-sm"
                              >
                                <FileText size={12} />
                                View Report
                              </button>
                            ) : (
                              <span className="text-slate-400 text-xs font-medium">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end shrink-0">
              <button 
                onClick={() => setShowPresentModal(false)}
                className="btn-secondary px-6"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Total Staff Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]">
            <div className="bg-primary p-6 text-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Users size={24} />
                  Team Size ({stats.staffList?.length || 0})
                </h2>
                <p className="text-indigo-100 text-xs mt-1">Full registry of active team members.</p>
              </div>
              <button 
                onClick={() => setShowStaffModal(false)}
                className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-all"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {(!stats.staffList || stats.staffList.length === 0) ? (
                <div className="text-center py-12 text-slate-400">
                  <Users size={48} className="mx-auto mb-3 opacity-25" />
                  <p className="font-semibold text-slate-600">No team members found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="pb-3 text-xs font-bold text-slate-400 uppercase">Employee ID</th>
                        <th className="pb-3 text-xs font-bold text-slate-400 uppercase">Name</th>
                        <th className="pb-3 text-xs font-bold text-slate-400 uppercase">Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {stats.staffList.map((member) => (
                        <tr key={member._id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 text-sm font-bold text-primary font-mono">{member.employeeId}</td>
                          <td className="py-4 font-semibold text-slate-800">{member.name}</td>
                          <td className="py-4">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-primary/15 text-primary">
                              {member.role === 'teamlead' ? 'Team Lead' : member.role}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end shrink-0">
              <button 
                onClick={() => setShowStaffModal(false)}
                className="btn-secondary px-6"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* On Leave / Absent Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]">
            <div className="bg-warning p-6 text-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Calendar size={24} />
                  On Leave / Absent Today ({stats.leavesList?.length || 0})
                </h2>
                <p className="text-amber-50 text-xs mt-1">Detailed log of team members currently on leave or absent today.</p>
              </div>
              <button 
                onClick={() => setShowLeaveModal(false)}
                className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-all"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {(!stats.leavesList || stats.leavesList.length === 0) ? (
                <div className="text-center py-12 text-slate-400">
                  <Calendar size={48} className="mx-auto mb-3 opacity-25" />
                  <p className="font-semibold text-slate-600">No team members on leave or absent today.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="pb-3 text-xs font-bold text-slate-400 uppercase">Employee Name</th>
                        <th className="pb-3 text-xs font-bold text-slate-400 uppercase">Employee ID</th>
                        <th className="pb-3 text-xs font-bold text-slate-400 uppercase">Date</th>
                        <th className="pb-3 text-xs font-bold text-slate-400 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {stats.leavesList.map((entry) => (
                        <tr key={entry._id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 font-semibold text-slate-800">{entry.user?.name}</td>
                          <td className="py-4 text-sm font-medium text-slate-500 font-mono">{entry.user?.employeeId}</td>
                          <td className="py-4 text-sm font-semibold text-slate-600 font-mono">
                            {new Date(entry.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}
                          </td>
                          <td className="py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                              entry.status === 'On Leave' ? 'bg-warning/15 text-warning-hover' : 'bg-danger/15 text-danger'
                            }`}>
                              {entry.status === 'On Leave' ? 'On Leave' : 'Absent'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end shrink-0">
              <button 
                onClick={() => setShowLeaveModal(false)}
                className="btn-secondary px-6"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Tickets Modal */}
      {showTicketsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]">
            <div className="bg-danger p-6 text-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Ticket size={24} />
                  Team Pending Tickets ({stats.ticketsList?.length || 0})
                </h2>
                <p className="text-rose-100 text-xs mt-1">Click on any ticket or name to jump directly to the support chat.</p>
              </div>
              <button 
                onClick={() => setShowTicketsModal(false)}
                className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-all"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {(!stats.ticketsList || stats.ticketsList.length === 0) ? (
                <div className="text-center py-12 text-slate-400">
                  <Ticket size={48} className="mx-auto mb-3 opacity-25" />
                  <p className="font-semibold text-slate-600">No team tickets found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="pb-3 text-xs font-bold text-slate-400 uppercase">Initiated By</th>
                        <th className="pb-3 text-xs font-bold text-slate-400 uppercase">Subject / Ticket</th>
                        <th className="pb-3 text-xs font-bold text-slate-400 uppercase">Priority</th>
                        <th className="pb-3 text-xs font-bold text-slate-400 uppercase">Created Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {stats.ticketsList.map((ticket) => (
                        <tr 
                          key={ticket._id} 
                          onClick={() => {
                            setShowTicketsModal(false);
                            navigate('/manager/tickets');
                          }}
                          className="hover:bg-danger/5 transition-colors cursor-pointer group"
                        >
                          <td className="py-4 font-semibold text-slate-800 group-hover:text-danger transition-colors">
                            <div className="flex flex-col">
                              <span>{ticket.user?.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono font-medium">{ticket.user?.employeeId}</span>
                            </div>
                          </td>
                          <td className="py-4 text-sm text-slate-700">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800">{ticket.title}</span>
                              <span className="text-xs text-slate-500 line-clamp-1">{ticket.description}</span>
                            </div>
                          </td>
                          <td className="py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                              ticket.priority === 'High' ? 'bg-danger/15 text-danger animate-pulse' :
                              ticket.priority === 'Medium' ? 'bg-warning/15 text-warning-hover' : 'bg-success/15 text-success'
                            }`}>
                              {ticket.priority}
                            </span>
                          </td>
                          <td className="py-4 text-xs font-medium text-slate-500 font-mono">
                            {new Date(ticket.createdAt).toLocaleString(undefined, {
                              month: 'short', 
                              day: 'numeric', 
                              hour: '2-digit', 
                              minute: '2-digit'
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end shrink-0">
              <button 
                onClick={() => setShowTicketsModal(false)}
                className="btn-secondary px-6"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* View EOD Modal */}
      {selectedEodRecord && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-primary p-6 text-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">End of Day Report</h2>
                <p className="text-primary-foreground/80 text-xs mt-1">Submitted by {selectedEodRecord.user?.name} on {selectedEodRecord.date}</p>
              </div>
              <button onClick={() => setSelectedEodRecord(null)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Work Done Today</h3>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">
                  {selectedEodRecord.eodWork}
                </div>
              </div>

              {selectedEodRecord.pendingTasks && (
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Pending Tasks</h3>
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">
                    {selectedEodRecord.pendingTasks}
                  </div>
                </div>
              )}

              {selectedEodRecord.eodAttachment && (
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Attachment</h3>
                  <a 
                    href={selectedEodRecord.eodAttachment.startsWith('http') ? selectedEodRecord.eodAttachment : `${axios.defaults.baseURL || ''}${selectedEodRecord.eodAttachment}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-primary hover:bg-primary/5 transition-all group"
                  >
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-primary border border-slate-100 shadow-sm group-hover:scale-110 transition-transform">
                      <CheckCircle size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">View Attachment</p>
                      <p className="text-xs text-slate-500">Click to open in new tab</p>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-primary transition-colors" />
                  </a>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={() => setSelectedEodRecord(null)} className="btn-primary px-8">Close Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
