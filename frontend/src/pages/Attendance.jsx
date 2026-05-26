import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Clock, LogOut, CheckCircle } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useContext } from 'react';

const isLateCheckIn = (checkInStr, shiftTimeStr) => {
  if (!checkInStr || !shiftTimeStr) return false;
  
  const parseTimeToMinutes = (t) => {
    if (!t || typeof t !== 'string') return null;
    const cleanT = t.replace(/(AM|PM)/gi, '').trim();
    const parts = cleanT.split(':');
    if (parts.length < 2) return null;
    let h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (t.toUpperCase().includes('PM') && h < 12) h += 12;
    if (t.toUpperCase().includes('AM') && h === 12) h = 0;
    return h * 60 + m;
  };

  const checkInMin = parseTimeToMinutes(checkInStr);
  const shiftMin = parseTimeToMinutes(shiftTimeStr);
  if (checkInMin === null || shiftMin === null) return false;

  return checkInMin > shiftMin;
};

const formatDateWithDay = (dateStr) => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const dateObj = new Date(year, month, day);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = days[dateObj.getDay()];
  return `${dateStr} (${dayName})`;
};

const Attendance = () => {
  const { user } = useContext(AuthContext);
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

  const calculateBreakStats = (breaks, empType) => {
    if (!breaks || breaks.length === 0) return { total: 0, count: 0, exceeded: false };
    const total = breaks.reduce((acc, b) => acc + (b.durationMinutes || 0), 0);
    const limit = empType === 'Part-time' ? 15 : 30;
    return {
      total,
      count: breaks.length,
      exceeded: total > limit || breaks.length > 3
    };
  };

  const getBreakPenalty = (breaks) => {
    if (!breaks || breaks.length <= 3) return 0;
    return breaks.length - 3;
  };

  const calculateHours = (start, end, breaks = []) => {
    if (!start || !end || start === '--:--' || end === '--:--') return 0;
    
    const parseTime = (t) => {
      if (!t || typeof t !== 'string') return null;
      const cleanT = t.replace(/(AM|PM)/gi, '').trim();
      const parts = cleanT.split(':');
      if (parts.length < 2) return null;
      let h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (t.toUpperCase().includes('PM') && h < 12) h += 12;
      if (t.toUpperCase().includes('AM') && h === 12) h = 0;
      return h * 60 + m;
    };

    const s = parseTime(start);
    const e = parseTime(end);
    if (s === null || e === null) return 0;
    
    let diff = e - s;
    if (diff < 0) diff += 1440;
    
    const totalBreakMinutes = breaks.reduce((acc, b) => acc + (b.durationMinutes || 0), 0);
    return (diff - totalBreakMinutes) / 60;
  };

  const formatDuration = (hours) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0 && m === 0) return '0m';
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const getMonthlyBreakStats = (recs) => {
    if (!recs || recs.length === 0) return { recordsWithPenalties: [], totalPenaltyDays: 0 };
    let totalBreaksInMonth = 0;
    // We need to sort by date to count correctly
    const sorted = [...recs].sort((a, b) => new Date(a.date) - new Date(b.date));
    const recordsWithPenalties = sorted.map(r => {
      const dailyBreaks = r.breaks || [];
      const updatedBreaks = dailyBreaks.map(b => {
        totalBreaksInMonth++;
        return { ...b, monthlyIndex: totalBreaksInMonth };
      });
      const dailyPenalty = updatedBreaks.filter(b => b.monthlyIndex > 3).length;
      return { ...r, breaks: updatedBreaks, dailyPenalty };
    });

    const totalPenaltyDays = recordsWithPenalties.reduce((acc, r) => acc + r.dailyPenalty, 0);
    return { recordsWithPenalties, totalPenaltyDays };
  };

  const { recordsWithPenalties, totalPenaltyDays } = getMonthlyBreakStats(records);

  const stats = {
    presentDays: records.filter(r => ['Present', 'Checked In', 'Checked Out'].includes(r.status)).length,
    totalPenaltyDays: totalPenaltyDays,
    totalHours: records.reduce((acc, r) => {
      const h = calculateHours(r.checkIn, r.checkOut, r.breaks);
      return acc + (isNaN(h) ? 0 : h);
    }, 0)
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">My Attendance History</h1>
        <div className="flex gap-4">
          <div className="bg-primary/5 px-4 py-2 rounded-xl border border-primary/10">
            <p className="text-[10px] font-bold text-primary uppercase">Present Days</p>
            <p className="text-lg font-bold text-primary">{stats.presentDays}</p>
          </div>
          <div className="bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
            <p className="text-[10px] font-bold text-indigo-600 uppercase">Working Hours</p>
            <p className="text-lg font-bold text-indigo-600">{formatDuration(stats.totalHours)}</p>
          </div>
          <div className="bg-rose-50 px-4 py-2 rounded-xl border border-rose-100">
            <p className="text-[10px] font-bold text-rose-600 uppercase">Penalty Days</p>
            <p className="text-lg font-bold text-rose-600">{stats.totalPenaltyDays}</p>
          </div>
        </div>
      </div>

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
                <th className="table-header">Work Hours</th>
                <th className="table-header">Breaks</th>
                <th className="table-header">Type</th>
                <th className="table-header">Status</th>
              </tr>
            </thead>
            <tbody>
              {recordsWithPenalties.map((r) => (
                <tr key={r._id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                  <td className="table-cell font-medium text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-slate-400" />
                      {formatDateWithDay(r.date)}
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <Clock size={14} className="text-success" />
                        {r.checkIn || '-'}
                      </div>
                      {r.checkIn && isLateCheckIn(r.checkIn, user?.shiftTime || '09:00 AM') && (
                        <span className="inline-block text-[9px] font-bold text-danger bg-danger/10 px-1.5 py-0.5 rounded border border-danger/20 w-fit uppercase tracking-wider animate-pulse">
                          ⚠️ Late Login
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <LogOut size={14} className="text-danger" />
                      {r.checkOut || '-'}
                    </div>
                  </td>
                  <td className="table-cell font-bold text-slate-700">
                    {formatDuration(calculateHours(r.checkIn, r.checkOut, r.breaks))}
                  </td>
                  <td className="table-cell">
                    {(() => {
                      const bStats = calculateBreakStats(r.breaks, user?.employmentType);
                      const hasMonthlyViolation = r.breaks.some(b => b.monthlyIndex > 3);
                      return (
                        <div className={`flex flex-col ${(bStats.exceeded || hasMonthlyViolation) ? 'text-danger font-bold' : 'text-slate-600'}`}>
                          <span className="text-xs">{bStats.total}m ({bStats.count} total)</span>
                          {r.dailyPenalty > 0 && (
                            <span className="text-[10px] text-danger font-bold">Monthly Penalty: +{r.dailyPenalty}d</span>
                          )}
                        </div>
                      );
                    })()}
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
