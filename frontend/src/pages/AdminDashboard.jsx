import { useState, useEffect } from 'react';
import { Users, UserCheck, Calendar, Ticket, Check, X, Clock } from 'lucide-react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useContext } from 'react';

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const [showPresentModal, setShowPresentModal] = useState(false);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    onLeave: 0,
    pendingTickets: 0,
    attendanceTrend: [],
    recentLeaves: [],
    presentList: []
  });
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [financialStats, setFinancialStats] = useState({
    totalSalary: 0,
    totalExpenses: 0,
    salaryCount: 0,
    expenseCount: 0
  });
  const [finLoading, setFinLoading] = useState(false);

  const fetchStats = async () => {
    try {
      const { data } = await axios.get('/api/users/stats', { withCredentials: true });
      setStats(data);
    } catch (err) {
      console.error(err);
      alert('Stats fetch failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const fetchFinancialStats = async () => {
    try {
      setFinLoading(true);
      const { data } = await axios.get(`/api/users/financial-stats?month=${selectedMonth}`, { withCredentials: true });
      setFinancialStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setFinLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchFinancialStats();
  }, [selectedMonth]);

  const generateReport = () => {
    const csvContent = [
      ['Report Name', 'Employee Attendance Summary'],
      ['Date Generated', new Date().toLocaleString()],
      ['Total Employees', stats.totalEmployees],
      ['Present Today', stats.presentToday],
      ['On Leave', stats.onLeave],
      ['Pending Tickets', stats.pendingTickets],
      [''],
      ['Attendance Trend (Last 7 Days)'],
      ['Date', 'Count'],
      ...stats.attendanceTrend.map(t => [t.date, t.count])
    ].map(e => e.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const cards = [
    { title: 'Total Staff', value: stats.totalEmployees, icon: Users, color: 'bg-primary/10 text-primary' },
    { title: 'Present Today', value: stats.presentToday, icon: UserCheck, color: 'bg-success/10 text-success', clickable: true },
    { title: 'On Leave', value: stats.onLeave, icon: Calendar, color: 'bg-warning/10 text-warning' },
    { title: 'Pending Tickets', value: stats.pendingTickets, icon: Ticket, color: 'bg-danger/10 text-danger' },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">{user?.name} ({user?.employeeId})</p>
        </div>
        <button onClick={generateReport} className="btn-primary flex items-center gap-2 self-start md:self-center">
          <Download size={18} />
          Generate Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <div 
            key={i} 
            onClick={() => card.clickable && setShowPresentModal(true)}
            className={`glass-panel p-6 animate-in fade-in slide-in-from-bottom-2 duration-500 ${
              card.clickable ? 'cursor-pointer hover:border-success/40 hover:scale-[1.02] active:scale-[0.99] transition-all duration-300' : ''
            }`} 
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${card.color}`}>
                <card.icon size={24} />
              </div>
              <div>
                <p className="text-slate-500 text-sm font-medium flex items-center gap-1">
                  {card.title}
                  {card.clickable && <span className="text-[9px] bg-success/20 text-success px-1.5 py-0.5 rounded font-bold uppercase animate-pulse">View</span>}
                </p>
                <h3 className="text-2xl font-bold text-slate-800">{card.value}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Financial Overview - Month Wise */}
      <div className="glass-panel p-6 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Financial Overview</h2>
            <p className="text-sm text-slate-500">Month-wise Salary & Expenses Breakdown</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-600">Filter Month:</label>
            <input 
              type="month" 
              className="input-field max-w-[180px]"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Summary Cards */}
          <div className="space-y-4">
            <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10">
              <p className="text-slate-500 text-sm font-medium mb-1">Total Locked Salary ({financialStats.salaryCount || 0} Payrolls)</p>
              <h3 className="text-2xl font-bold text-primary">₹{financialStats.totalSalary.toLocaleString()}</h3>
            </div>
            <div className="p-6 bg-danger/5 rounded-2xl border border-danger/10">
              <p className="text-slate-500 text-sm font-medium mb-1">Total Approved Expenses ({financialStats.expenseCount || 0} Items)</p>
              <h3 className="text-2xl font-bold text-danger">₹{financialStats.totalExpenses.toLocaleString()}</h3>
            </div>
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
              <p className="text-slate-500 text-sm font-medium mb-1">Combined Outflow</p>
              <h3 className="text-2xl font-bold text-slate-800">₹{(financialStats.totalSalary + financialStats.totalExpenses).toLocaleString()}</h3>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="lg:col-span-2 h-[350px] relative flex items-center justify-center">
            {finLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : null}
            
            {(financialStats.totalSalary === 0 && financialStats.totalExpenses === 0) ? (
              <div className="text-slate-400 text-center">
                <Calendar size={48} className="mx-auto mb-2 opacity-20" />
                <p>No financial data for this month</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Salaries', value: financialStats.totalSalary },
                      { name: 'Expenses', value: financialStats.totalExpenses }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="#4f46e5" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip 
                    formatter={(value) => `₹${value.toLocaleString()}`}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-panel p-6 lg:col-span-2 h-[450px] flex flex-col">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Attendance Trends (Last 7 Days)</h2>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.attendanceTrend}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  cursor={{stroke: '#4f46e5', strokeWidth: 2, strokeDasharray: '5 5'}}
                />
                <Area type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6 h-[450px] flex flex-col">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Recent Leave Requests</h2>
          <div className="space-y-4 overflow-y-auto flex-1 pr-1 custom-scrollbar">
            {stats.recentLeaves.map((l, i) => (
              <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100 group hover:border-primary/20 transition-all">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 uppercase">
                      {l.user?.name?.substring(0, 2)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{l.user?.name}</p>
                      <p className="text-[10px] text-slate-400">{l.type}</p>
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
                <div className="flex items-center gap-4 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(l.fromDate).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {new Date(l.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
              </div>
            ))}
            {stats.recentLeaves.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 opacity-50">
                <Calendar size={48} strokeWidth={1} />
                <p className="text-sm">No leave requests yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showPresentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]">
            <div className="bg-success p-6 text-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <UserCheck size={24} />
                  Present Today ({stats.presentList?.length || 0})
                </h2>
                <p className="text-emerald-100 text-xs mt-1">Detailed log of checked-in employees for today.</p>
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
                  <p className="font-semibold text-slate-600">No employees present today yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="pb-3 text-xs font-bold text-slate-400 uppercase">Employee</th>
                        <th className="pb-3 text-xs font-bold text-slate-400 uppercase">Clock In</th>
                        <th className="pb-3 text-xs font-bold text-slate-400 uppercase">Clock Out</th>
                        <th className="pb-3 text-xs font-bold text-slate-400 uppercase">Working Hours</th>
                        <th className="pb-3 text-xs font-bold text-slate-400 uppercase">Status</th>
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
                          <td className="py-4 text-sm font-bold text-primary font-mono">{entry.workingHours ? `${entry.workingHours} hrs` : '-'}</td>
                          <td className="py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                              entry.status === 'Present' ? 'bg-success/15 text-success' :
                              entry.status === 'Checked In' ? 'bg-primary/15 text-primary' :
                              entry.status === 'Checked Out' ? 'bg-slate-100 text-slate-600' : 'bg-warning/15 text-warning'
                            }`}>
                              {entry.status}
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
                onClick={() => setShowPresentModal(false)}
                className="btn-secondary px-6"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
