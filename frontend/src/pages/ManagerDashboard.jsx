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
    try {
      await axios.post('/api/attendance/action', { type }, { withCredentials: true });
      fetchStatus();
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
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
              <div className="flex-1 min-w-[200px] bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Status</p>
                <p className="text-xl font-bold text-slate-800 mt-1">{attendance.status}</p>
                <p className="text-sm text-slate-500 mt-1">Started at {attendance.checkIn}</p>
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
    </div>
  );
};

export default ManagerDashboard;
