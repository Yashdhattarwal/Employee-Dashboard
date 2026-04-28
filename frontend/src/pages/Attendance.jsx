import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Clock, LogOut } from 'lucide-react';

const Attendance = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/attendance/my', { withCredentials: true });
      setRecords(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">My Attendance History</h1>

      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading your history...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="table-header">Date</th>
                <th className="table-header">Check In</th>
                <th className="table-header">Check Out</th>
                <th className="table-header">Break Info</th>
                <th className="table-header">Type</th>
                <th className="table-header">Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r._id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                  <td className="table-cell font-medium text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-slate-400" />
                      {r.date}
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Clock size={14} className="text-success" />
                      {r.checkIn || '-'}
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <LogOut size={14} className="text-danger" />
                      {r.checkOut || '-'}
                    </div>
                  </td>
                  <td className="table-cell text-xs text-slate-500">
                    {r.breakIn ? `Break: ${r.breakIn} - ${r.breakOut || '...'}` : 'No Break Recorded'}
                  </td>
                  <td className="table-cell">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      r.status === 'On Leave' ? 'bg-amber-500/10 text-amber-600' :
                      r.status === 'Absent' ? 'bg-danger/10 text-danger' :
                      'bg-success/10 text-success'
                    }`}>
                      {r.status === 'On Leave' ? 'On Leave' : r.status === 'Absent' ? 'Absent' : 'Present'}
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
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-slate-400">
                    You haven't clocked in yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Attendance;
