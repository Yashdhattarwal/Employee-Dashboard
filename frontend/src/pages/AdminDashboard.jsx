import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserCheck, Calendar, Ticket, Check, X, Clock } from 'lucide-react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, FileText, CheckCircle, ChevronRight } from 'lucide-react';
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

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [showPresentModal, setShowPresentModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showTicketsModal, setShowTicketsModal] = useState(false);
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
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [financialStats, setFinancialStats] = useState({
    totalSalary: 0,
    totalExpenses: 0,
    salaryCount: 0,
    expenseCount: 0
  });
  const [finLoading, setFinLoading] = useState(false);
  const [selectedEodRecord, setSelectedEodRecord] = useState(null);

  // Productivity Trend States
  const [employeesList, setEmployeesList] = useState([]);
  const [selectedEmpTrend, setSelectedEmpTrend] = useState('all');
  const [selectedTimeline, setSelectedTimeline] = useState('daily');
  const [trendData, setTrendData] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);

  const fetchStats = async () => {
    try {
      const { data } = await axios.get('/api/users/stats', { withCredentials: true });
      setStats(data);
    } catch (err) {
      console.error(err);
      alert('Stats fetch failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const fetchEmployeesList = async () => {
    try {
      const { data } = await axios.get('/api/users', { withCredentials: true });
      const nonAdmins = data.filter(u => u.role !== 'admin');
      setEmployeesList(nonAdmins);
    } catch (err) {
      console.error('Failed to load employees:', err);
    }
  };

  const fetchTrendData = async () => {
    try {
      setTrendLoading(true);
      const { data } = await axios.get(`/api/productivity/dashboard-trend?employeeId=${selectedEmpTrend}&timeline=${selectedTimeline}`, { withCredentials: true });
      setTrendData(data);
    } catch (err) {
      console.error('Failed to load trend data:', err);
    } finally {
      setTrendLoading(false);
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
    fetchEmployeesList();
  }, []);

  useEffect(() => {
    fetchFinancialStats();
  }, [selectedMonth]);

  useEffect(() => {
    fetchTrendData();
  }, [selectedEmpTrend, selectedTimeline]);

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
    { title: 'Total Staff', value: stats.totalEmployees, icon: Users, color: 'bg-primary/10 text-primary', clickable: true, type: 'staff' },
    { title: 'Present Today', value: stats.presentToday, icon: UserCheck, color: 'bg-success/10 text-success', clickable: true, type: 'present' },
    { title: 'On Leave', value: stats.onLeave, icon: Calendar, color: 'bg-warning/10 text-warning', clickable: true, type: 'leave' },
    { title: 'Pending Tickets', value: stats.pendingTickets, icon: Ticket, color: 'bg-danger/10 text-danger', clickable: true, type: 'tickets' },
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
            onClick={() => {
              if (card.clickable) {
                if (card.type === 'staff') setShowStaffModal(true);
                if (card.type === 'present') setShowPresentModal(true);
                if (card.type === 'leave') setShowLeaveModal(true);
                if (card.type === 'tickets') setShowTicketsModal(true);
              }
            }}
            className={`glass-panel p-6 animate-in fade-in slide-in-from-bottom-2 duration-500 ${
              card.clickable ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.99] transition-all duration-300' : ''
            } ${
              card.type === 'staff' ? 'hover:border-primary/40' :
              card.type === 'present' ? 'hover:border-success/40' :
              card.type === 'leave' ? 'hover:border-warning/40' :
              card.type === 'tickets' ? 'hover:border-danger/40' : ''
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

      {/* Productivity & Work Trends */}
      <div className="glass-panel p-6 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Productivity & Interaction Trends</h2>
            <p className="text-sm text-slate-500">Track active minutes, idle minutes and consistency metrics over time</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Employee Filter */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Employee:</label>
              <select 
                value={selectedEmpTrend} 
                onChange={(e) => setSelectedEmpTrend(e.target.value)}
                className="input-field py-1 px-3 text-xs font-bold w-48"
              >
                <option value="all">All Employees</option>
                {employeesList.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.employeeId})</option>
                ))}
              </select>
            </div>

            {/* Timeline Filter */}
            <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
              <button 
                onClick={() => setSelectedTimeline('daily')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  selectedTimeline === 'daily' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Daily
              </button>
              <button 
                onClick={() => setSelectedTimeline('weekly')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  selectedTimeline === 'weekly' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Weekly
              </button>
              <button 
                onClick={() => setSelectedTimeline('monthly')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  selectedTimeline === 'monthly' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Monthly
              </button>
            </div>
          </div>
        </div>

        <div className="h-[350px] relative">
          {trendLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10 rounded-xl">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {trendData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
              <Clock size={48} className="opacity-20" />
              <p className="text-sm font-semibold">No recorded interaction logs available matching filters</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorIdle" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#64748b" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#64748b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} label={{ value: 'Minutes', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  cursor={{stroke: '#10b981', strokeWidth: 1.5, strokeDasharray: '3 3'}}
                  formatter={(value, name) => [
                    `${value} mins`,
                    name === 'active' ? 'Active Time' : name === 'idle' ? 'Idle Time' : name
                  ]}
                />
                <Legend verticalAlign="top" height={36} />
                <Area type="monotone" dataKey="active" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorActive)" name="active" />
                <Area type="monotone" dataKey="idle" stroke="#64748b" strokeWidth={1.5} fillOpacity={1} fill="url(#colorIdle)" name="idle" />
              </AreaChart>
            </ResponsiveContainer>
          )}
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
                  Total Staff ({stats.staffList?.length || 0})
                </h2>
                <p className="text-indigo-100 text-xs mt-1">Full registry of active dashboard employees.</p>
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
                  <p className="font-semibold text-slate-600">No active staff members found.</p>
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
                <p className="text-amber-50 text-xs mt-1">Detailed log of employees currently on leave or absent today.</p>
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
                  <p className="font-semibold text-slate-600">No employees on leave or absent today.</p>
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
                  Pending Tickets ({stats.ticketsList?.length || 0})
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
                  <p className="font-semibold text-slate-600">No unresolved tickets found.</p>
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
                            navigate('/admin/tickets');
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

export default AdminDashboard;
