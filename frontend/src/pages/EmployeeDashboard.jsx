import { useState, useEffect } from 'react';
import { Clock, Coffee, LogOut, CheckCircle } from 'lucide-react';
import axios from 'axios';

import { AuthContext } from '../context/AuthContext';
import { useContext } from 'react';

const EmployeeDashboard = () => {
  const { user } = useContext(AuthContext);
  const [attendance, setAttendance] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const { data } = await axios.get('/api/attendance/status', { withCredentials: true });
      setAttendance(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchActivities = async () => {
    try {
      const { data } = await axios.get('/api/attendance/my', { withCredentials: true });
      setActivities(data.slice(0, 5));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchStatus(), fetchActivities()]);
      setLoading(false);
    };
    init();
  }, []);

  const handleAction = async (type) => {
    try {
      await axios.post('/api/attendance/action', { type }, { withCredentials: true });
      fetchStatus();
      fetchActivities();
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Employee Dashboard</h1>
        <div className="flex flex-col text-right">
          <p className="text-sm font-bold text-slate-800">{user?.name} ({user?.employeeId})</p>
          <p className="text-xs text-slate-500 font-medium">Reporting to: {user?.managerName || 'N/A'}</p>
        </div>
      </div>
      
      {/* Attendance Actions Box */}
      <div className="glass-panel p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Clock size={20} className="text-primary" />
          Attendance Control
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
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Today's Status</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="glass-panel p-6">
          <p className="text-slate-500 text-sm font-medium">Leave Balance</p>
          <h3 className="text-3xl font-bold text-slate-800 mt-2">12 Days</h3>
          <p className="text-slate-400 text-xs mt-1">Annual Leave Remaining</p>
        </div>
        
        <div className="glass-panel p-6">
          <p className="text-slate-500 text-sm font-medium">My Tickets</p>
          <h3 className="text-3xl font-bold text-slate-800 mt-2">1</h3>
          <p className="text-slate-400 text-xs mt-1">In Progress</p>
        </div>
      </div>

      <div className="glass-panel p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {activities.map((act, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Clock size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Marked Attendance</p>
                  <p className="text-xs text-slate-500">{act.date} at {act.checkIn}</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-success/10 text-success text-xs font-bold rounded-full">
                {act.status}
              </span>
            </div>
          ))}
          {activities.length === 0 && <p className="text-center text-slate-400 py-4">No recent activity</p>}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
