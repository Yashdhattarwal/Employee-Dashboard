import { useState, useEffect } from 'react';
import { Clock, Coffee, LogOut, CheckCircle, Users, Calendar, Ticket } from 'lucide-react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { AuthContext } from '../context/AuthContext';
import { useContext } from 'react';

const ManagerDashboard = () => {
  const { user } = useContext(AuthContext);
  const [attendance, setAttendance] = useState(null);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    onLeave: 0,
    pendingTickets: 0,
    attendanceTrend: [],
    recentLeaves: []
  });
  const [loading, setLoading] = useState(true);
  const [showEodModal, setShowEodModal] = useState(false);
  const [eodData, setEodData] = useState({
    workDone: '',
    pendingTasks: '',
    attachment: null
  });
  const [submittingEod, setSubmittingEod] = useState(false);
  const [liveTime, setLiveTime] = useState({ work: 0, break: 0 });

  const parseTimeToDate = (timeStr) => {
    if (!timeStr) return null;
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':');
    if (hours === '12') hours = '00';
    if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
    const d = new Date();
    d.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    return d;
  };

  useEffect(() => {
    if (!attendance || attendance.status === 'Checked Out') {
      setLiveTime({ work: 0, break: 0 });
      return;
    }

    const timer = setInterval(() => {
      const now = new Date();
      const checkInDate = parseTimeToDate(attendance.checkIn);
      if (!checkInDate) return;

      let totalBreakMs = (attendance.breaks || []).reduce((acc, b) => {
        if (b.durationMinutes) return acc + (b.durationMinutes * 60000);
        return acc;
      }, 0);

      let currentBreakMs = 0;
      if (attendance.status === 'On Break') {
        const activeBreak = attendance.breaks?.find(b => !b.endTime);
        if (activeBreak) {
          const breakStartDate = parseTimeToDate(activeBreak.startTime);
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
                    disabled={attendance.status === 'Checked Out'}
                    onClick={() => handleAction('break-in')}
                    className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-all disabled:opacity-50"
                  >
                    <Coffee size={20} />
                    Take Break
                  </button>
                )}

                <button 
                  disabled={attendance.status === 'Checked Out'}
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
          { title: 'Team Size', value: stats.totalEmployees, icon: Users, color: 'text-primary' },
          { title: 'Present Today', value: stats.presentToday, icon: CheckCircle, color: 'text-success' },
          { title: 'On Leave', value: stats.onLeave, icon: Calendar, color: 'text-warning' },
          { title: 'Team Tickets', value: stats.pendingTickets, icon: Ticket, color: 'text-danger' },
        ].map((card, i) => (
          <div key={i} className="glass-panel p-6">
             <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{card.title}</p>
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
    </div>
  );
};

export default ManagerDashboard;
