import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { 
  Activity, Users, Clock, Monitor, Smartphone, Tablet, Search, 
  ArrowLeft, Download, TrendingUp, BarChart2, Calendar, 
  ShieldAlert, RefreshCw, Layers, Globe, Laptop, Play, Eye
} from 'lucide-react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import { convertToUserTimezone } from '../utils/timezone';

const STATUS_COLORS = {
  Active: '#10b981',   // Success green
  Idle: '#f59e0b',     // Orange
  Away: '#a78bfa',     // Purple
  Offline: '#64748b',  // Slate
  Break: '#3b82f6',    // Blue
  'Clocked Out': '#ef4444' // Red
};

const WorkTracking = () => {
  const { user } = useContext(AuthContext);
  const [employees, setEmployees] = useState([]);
  const [deviceStats, setDeviceStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [empAnalytics, setEmpAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, charts, logins

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [deviceFilter, setDeviceFilter] = useState('all');

  const fetchLiveFeed = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const { data } = await axios.get('/api/productivity/live', { withCredentials: true });
      setEmployees(data);
      
      const { data: dStats } = await axios.get('/api/productivity/devices', { withCredentials: true });
      setDeviceStats(dStats);
    } catch (err) {
      console.error('Failed to load tracking data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveFeed();
    const interval = setInterval(() => {
      fetchLiveFeed(true);
    }, 15000); // 15 seconds auto-refresh for real-time tracking
    return () => clearInterval(interval);
  }, []);

  const handleSelectEmployee = async (emp) => {
    setSelectedEmp(emp);
    setLoadingAnalytics(true);
    setActiveTab('overview');
    try {
      const { data } = await axios.get(`/api/productivity/analytics/${emp.id}`, { withCredentials: true });
      setEmpAnalytics(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const liveSelectedEmp = selectedEmp ? employees.find(e => e.id === selectedEmp.id) || selectedEmp : null;

  useEffect(() => {
    if (!selectedEmp) return;

    const fetchSelectedAnalytics = async () => {
      try {
        const { data } = await axios.get(`/api/productivity/analytics/${selectedEmp.id}`, { withCredentials: true });
        setEmpAnalytics(data);
      } catch (err) {
        console.error('Failed to refresh selected employee analytics:', err);
      }
    };

    const interval = setInterval(() => {
      fetchSelectedAnalytics();
    }, 15000); // 15 seconds auto-refresh for dynamic slide-over metrics

    return () => clearInterval(interval);
  }, [selectedEmp]);

  // Filter computations
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
    const matchesDept = deptFilter === 'all' || emp.designation === deptFilter;
    const matchesDevice = deviceFilter === 'all' || emp.deviceType === deviceFilter;
    return matchesSearch && matchesStatus && matchesDept && matchesDevice;
  });

  const getStatusCount = (status) => employees.filter(e => e.status === status).length;
  const getOnlineSessions = () => employees.filter(e => ['Active', 'Idle'].includes(e.status)).length;
  
  const getAvgProductivity = () => {
    const tracked = employees.filter(e => e.totalSessionMinutes > 0);
    if (tracked.length === 0) return 100;
    const sum = tracked.reduce((acc, curr) => acc + curr.productivityPercentage, 0);
    return Math.round(sum / tracked.length);
  };

  const getMostProductiveEmp = () => {
    const tracked = employees.filter(e => e.totalSessionMinutes > 5);
    if (tracked.length === 0) return 'N/A';
    const sorted = [...tracked].sort((a, b) => b.productivityPercentage - a.productivityPercentage);
    return sorted[0]?.name || 'N/A';
  };

  // Export report as CSV file
  const handleExportCSV = async () => {
    try {
      const { data } = await axios.get('/api/productivity/export', { withCredentials: true });
      if (data.length === 0) return alert('No historical logs to export.');
      
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row => 
        Object.values(row).map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
      );
      
      const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Productivity_Report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };

  // Icon selector helpers
  const getDeviceIcon = (deviceType) => {
    if (deviceType === 'Mobile') return <Smartphone size={16} className="text-slate-400" />;
    if (deviceType === 'Tablet') return <Tablet size={16} className="text-slate-400" />;
    return <Laptop size={16} className="text-slate-400" />;
  };

  const getBrowserIcon = (browser) => {
    return <Globe size={14} className="text-slate-400" />;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <RefreshCw className="animate-spin text-primary" size={32} />
        <p className="text-slate-500 font-medium">Initializing Real-time Productivity Feed...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Activity className="text-primary animate-pulse" />
            Employee Work Tracking
          </h1>
          <p className="text-sm text-slate-500">Live background productivity monitoring, device analytics and interactions</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => fetchLiveFeed()}
            className={`btn-secondary flex items-center gap-2 ${refreshing ? 'opacity-50' : ''}`}
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button onClick={handleExportCSV} className="btn-primary flex items-center gap-2">
            <Download size={16} />
            Export Data
          </button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div 
          onClick={() => setStatusFilter(statusFilter === 'Active' ? 'all' : 'Active')}
          className={`glass-panel p-4 text-center border-l-4 border-l-success cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 select-none ${
            statusFilter === 'Active' ? 'ring-2 ring-emerald-500 ring-offset-1 bg-emerald-50/10 border-emerald-500' : ''
          }`}
        >
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active (Working)</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{getStatusCount('Active')}</p>
        </div>

        <div 
          onClick={() => setStatusFilter(statusFilter === 'Idle' ? 'all' : 'Idle')}
          className={`glass-panel p-4 text-center border-l-4 border-l-amber-500 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 select-none ${
            statusFilter === 'Idle' ? 'ring-2 ring-amber-500 ring-offset-1 bg-amber-50/10 border-amber-500' : ''
          }`}
        >
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Idle / Away (Not Working)</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{getStatusCount('Idle')}</p>
        </div>

        <div 
          onClick={() => setStatusFilter('all')}
          className={`glass-panel p-4 text-center border-l-4 border-l-slate-400 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 select-none ${
            statusFilter === 'all' ? 'ring-2 ring-slate-500 ring-offset-1 bg-slate-50/10 border-slate-500' : ''
          }`}
        >
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Sessions</p>
          <p className="text-2xl font-bold text-primary mt-1">{getOnlineSessions()}</p>
        </div>

        <div 
          onClick={() => {
            setStatusFilter('all');
            setSearchTerm('');
            setDeviceFilter('all');
          }}
          className="glass-panel p-4 text-center border-l-4 border-l-violet-600 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 select-none hover:bg-violet-50/5"
        >
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avg Productivity</p>
          <p className="text-2xl font-bold text-violet-600 mt-1">{getAvgProductivity()}%</p>
        </div>
      </div>

      {/* Filters Area */}
      <div className="glass-panel p-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search by Employee Name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-9 w-full"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className="input-field py-1.5 text-xs font-bold"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Idle">Idle</option>
          </select>

          <select 
            value={deviceFilter} 
            onChange={e => setDeviceFilter(e.target.value)}
            className="input-field py-1.5 text-xs font-bold"
          >
            <option value="all">All Devices</option>
            <option value="Desktop">Desktop</option>
            <option value="Mobile">Mobile</option>
            <option value="Tablet">Tablet</option>
          </select>
        </div>
      </div>

      {/* Employee List Table */}
      <div className="glass-panel overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="table-header">Employee</th>
              <th className="table-header">Live Status</th>
              <th className="table-header">Device / Browser</th>
              <th className="table-header">Active Route</th>
              <th className="table-header">Time stats</th>
              <th className="table-header">Productivity</th>
              <th className="table-header text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((emp) => (
              <tr key={emp.id} className="hover:bg-slate-50 border-b border-slate-100 transition-colors">
                <td className="table-cell">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                      {emp.profilePhoto ? (
                        <img src={emp.profilePhoto} alt={emp.name} className="w-full h-full object-cover" />
                      ) : (
                        <Users size={18} className="text-slate-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{emp.name}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{emp.employeeId} • {emp.designation}</p>
                    </div>
                  </div>
                </td>
                <td className="table-cell">
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: `${STATUS_COLORS[emp.status]}15`, color: STATUS_COLORS[emp.status] }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: STATUS_COLORS[emp.status] }}></span>
                    {emp.status}
                  </span>
                </td>
                <td className="table-cell">
                  <div className="flex items-center gap-2 text-slate-600 text-xs">
                    {getDeviceIcon(emp.deviceType)}
                    <span>{emp.osName} •</span>
                    {getBrowserIcon(emp.browserName)}
                    <span>{emp.browserName}</span>
                  </div>
                </td>
                <td className="table-cell font-mono text-xs text-primary truncate max-w-[150px]">
                  {emp.status === 'Offline' || emp.status === 'Clocked Out' ? '-' : emp.currentPage}
                </td>
                <td className="table-cell">
                  <div className="text-xs text-slate-600 space-y-0.5">
                    <p>Active: <strong className="text-slate-800">{emp.activeMinutes}m</strong></p>
                    <p>Idle: <strong className="text-slate-400">{emp.idleMinutes}m</strong></p>
                  </div>
                </td>
                <td className="table-cell">
                  <div className="w-32">
                    <div className="flex justify-between text-[10px] font-bold mb-1">
                      <span style={{ color: emp.productivityPercentage >= 75 ? '#10b981' : emp.productivityPercentage >= 50 ? '#f59e0b' : '#ef4444' }}>
                        {emp.productivityPercentage}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-300"
                        style={{ 
                          width: `${emp.productivityPercentage}%`,
                          backgroundColor: emp.productivityPercentage >= 75 ? '#10b981' : emp.productivityPercentage >= 50 ? '#f59e0b' : '#ef4444'
                        }}
                      />
                    </div>
                  </div>
                </td>
                <td className="table-cell text-right">
                  <button 
                    onClick={() => handleSelectEmployee(emp)}
                    className="p-1 px-3 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ml-auto"
                  >
                    <Eye size={12} />
                    View Details
                  </button>
                </td>
              </tr>
            ))}
            {filteredEmployees.length === 0 && (
              <tr>
                <td colSpan="7" className="p-12 text-center text-slate-400 italic">No employees matching search criteria.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detailed Analytics Slide-over Modal */}
      {selectedEmp && liveSelectedEmp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-4xl bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Modal Header */}
            <div className="bg-primary p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedEmp(null)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h2 className="text-xl font-bold">{liveSelectedEmp.name}</h2>
                  <p className="text-primary-foreground/80 text-xs mt-0.5">{liveSelectedEmp.employeeId} • {liveSelectedEmp.designation} • Active Timezone: {liveSelectedEmp.timezone}</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-white/20 text-white border border-white/30 rounded-full text-xs font-bold uppercase tracking-wider animate-pulse" style={{ backgroundColor: `${STATUS_COLORS[liveSelectedEmp.status]}30`, borderColor: STATUS_COLORS[liveSelectedEmp.status] }}>
                {liveSelectedEmp.status}
              </span>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6">
              <button 
                onClick={() => setActiveTab('overview')}
                className={`py-3 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                <Monitor size={16} />
                Overview
              </button>
              <button 
                onClick={() => setActiveTab('charts')}
                className={`py-3 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${activeTab === 'charts' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                <TrendingUp size={16} />
                Productivity Trends
              </button>
              <button 
                onClick={() => setActiveTab('logins')}
                className={`py-3 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${activeTab === 'logins' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                <Clock size={16} />
                Session & Device History
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {loadingAnalytics ? (
                <div className="flex flex-col items-center justify-center min-h-[300px] gap-2">
                  <RefreshCw className="animate-spin text-primary" size={24} />
                  <p className="text-slate-500 text-sm">Aggregating historical interactions...</p>
                </div>
              ) : empAnalytics ? (
                <>
                  {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left: Stats & Interaction Metrics */}
                      <div className="space-y-4">
                        <div className="glass-panel p-5 space-y-4">
                          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">Productivity summary</h3>
                          <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="bg-success/5 p-3 rounded-xl border border-success/15">
                              <p className="text-[10px] text-slate-400 font-bold uppercase">Total Active</p>
                              <p className="text-xl font-bold text-success mt-1">{empAnalytics.historicalSummary.totalActiveMinutes}m</p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                              <p className="text-[10px] text-slate-400 font-bold uppercase">Total Idle</p>
                              <p className="text-xl font-bold text-slate-600 mt-1">{empAnalytics.historicalSummary.totalIdleMinutes}m</p>
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-xs font-semibold pt-2">
                            <span className="text-slate-500">Average Consistency:</span>
                            <span className="text-primary font-bold">{empAnalytics.historicalSummary.workConsistencyScore}%</span>
                          </div>
                        </div>

                        <div className="glass-panel p-5 space-y-4">
                          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">Interaction Frequencies (Today)</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-slate-50 rounded-xl text-center">
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Clicks Registered</p>
                              <p className="text-lg font-bold text-slate-800 mt-1">{empAnalytics.historicalSummary.clickCount}</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl text-center">
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Keys Pressed</p>
                              <p className="text-lg font-bold text-slate-800 mt-1">{empAnalytics.historicalSummary.keyCount}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Active vs Idle Pie Chart */}
                      <div className="glass-panel p-5 flex flex-col items-center justify-center">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2 w-full mb-4">Time Breakdown</h3>
                        {empAnalytics.historicalSummary.totalActiveMinutes + empAnalytics.historicalSummary.totalIdleMinutes === 0 ? (
                          <p className="text-slate-400 italic text-sm py-12">No tracked interactions logged yet.</p>
                        ) : (
                          <div className="w-full h-56">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={[
                                    { name: 'Active Time', value: empAnalytics.historicalSummary.totalActiveMinutes },
                                    { name: 'Idle Time', value: empAnalytics.historicalSummary.totalIdleMinutes }
                                  ]}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={80}
                                  paddingAngle={5}
                                  dataKey="value"
                                >
                                  <Cell fill="#10b981" />
                                  <Cell fill="#64748b" />
                                </Pie>
                                <Tooltip formatter={(value) => `${value}m`} />
                                <Legend verticalAlign="bottom" height={36} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'charts' && (
                    <div className="space-y-6">
                      {/* Productivity score timeline */}
                      <div className="glass-panel p-5">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4">Productivity Scores Trend (%)</h3>
                        <div className="w-full h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={empAnalytics.historicalData}>
                              <defs>
                                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis domain={[0, 100]} />
                              <Tooltip />
                              <Area type="monotone" dataKey="productivityScore" stroke="#10b981" fillOpacity={1} fill="url(#colorScore)" name="Productivity %" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Daily Active/Idle Line Chart */}
                      <div className="glass-panel p-5">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4">Daily Working Minutes Breakdown</h3>
                        <div className="w-full h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={empAnalytics.historicalData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Line type="monotone" dataKey="activeMinutes" stroke="#10b981" strokeWidth={2} name="Active minutes" />
                              <Line type="monotone" dataKey="idleMinutes" stroke="#64748b" strokeWidth={2} name="Idle minutes" />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'logins' && (
                    <div className="glass-panel p-5 space-y-4">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">Session Login History</h3>
                      <div className="space-y-3">
                        {empAnalytics.sessionLogs.map(log => (
                          <div key={log.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200/50">
                            <div className="text-xs space-y-1">
                              <p className="font-bold text-slate-800">Device Category: <strong className="text-primary">{log.deviceType} ({log.osName})</strong></p>
                              <p className="text-slate-500">Browser fingerprint: {log.browserName}</p>
                            </div>
                            <div className="text-right text-[10px] text-slate-500 space-y-0.5">
                              <p>Logged In: <strong>{convertToUserTimezone(log.loginTime, null, user?.timezone)}</strong></p>
                              <p>Logged Out: <strong>{log.logoutTime ? convertToUserTimezone(log.logoutTime, null, user?.timezone) : 'Active Session'}</strong></p>
                            </div>
                          </div>
                        ))}
                        {empAnalytics.sessionLogs.length === 0 && (
                          <p className="text-slate-400 italic text-center py-6 text-sm">No historical logins recorded.</p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center text-slate-400 italic py-12">No analytics available.</div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button 
                onClick={() => setSelectedEmp(null)}
                className="btn-secondary px-8"
              >
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkTracking;
