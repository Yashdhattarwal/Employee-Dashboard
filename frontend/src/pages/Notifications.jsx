import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Bell, Send, User, Users, Shield, Check, X, Info, AlertTriangle, AlertCircle, Eye, History, UserCheck } from 'lucide-react';

const Notifications = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('inbox');
  const [notifications, setNotifications] = useState([]);
  const [sentNotifications, setSentNotifications] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(null); // stores notification id
  const [statsData, setStatsData] = useState([]);
  
  const [formData, setFormData] = useState({
    target: 'everyone',
    selectedUsers: [],
    title: '',
    message: '',
    type: 'info'
  });

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/notifications', { withCredentials: true });
      setNotifications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSentNotifications = async () => {
    if (user.role === 'admin' || user.role === 'manager' || user.role === 'teamlead') {
      try {
        const { data } = await axios.get('/api/notifications/sent', { withCredentials: true });
        setSentNotifications(data);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const fetchEmployees = async () => {
    if (user.role === 'admin' || user.role === 'manager' || user.role === 'teamlead') {
      try {
        const endpoint = user.role === 'admin' ? '/api/users' : '/api/users/team';
        const { data } = await axios.get(endpoint, { withCredentials: true });
        setEmployees(data);
      } catch (err) {
        console.error(err);
      }
    }
  };

  useEffect(() => {
    fetchNotifications();
    if (user.role !== 'employee') {
      fetchSentNotifications();
      fetchEmployees();
    }
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/notifications', formData, { withCredentials: true });
      setShowSendModal(false);
      setFormData({ target: 'everyone', selectedUsers: [], title: '', message: '', type: 'info' });
      fetchNotifications();
      fetchSentNotifications();
    } catch (err) {
      alert('Failed to send notification');
    }
  };

  const handleAcknowledge = async (id) => {
    try {
      await axios.post(`/api/notifications/${id}/acknowledge`, {}, { withCredentials: true });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStats = async (id) => {
    try {
      const { data } = await axios.get(`/api/notifications/${id}/stats`, { withCredentials: true });
      setStatsData(data);
      setShowStatsModal(id);
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type) => {
    switch(type) {
      case 'warning': return <AlertTriangle className="text-warning" size={20} />;
      case 'danger': return <AlertCircle className="text-danger" size={20} />;
      case 'success': return <Check className="text-success" size={20} />;
      default: return <Info className="text-primary" size={20} />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Notifications</h1>
        {(user.role === 'admin' || user.role === 'manager' || user.role === 'teamlead') && (
          <button 
            onClick={() => setShowSendModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Send size={18} />
            New Announcement
          </button>
        )}
      </div>

      {(user.role === 'admin' || user.role === 'manager' || user.role === 'teamlead') && (
        <div className="flex gap-4 border-b border-slate-200">
          <button 
            onClick={() => setActiveTab('inbox')}
            className={`pb-3 px-2 text-sm font-bold transition-all ${activeTab === 'inbox' ? 'text-primary border-b-2 border-primary' : 'text-slate-500 hover:text-slate-800'}`}
          >
            My Inbox
          </button>
          <button 
            onClick={() => setActiveTab('sent')}
            className={`pb-3 px-2 text-sm font-bold transition-all ${activeTab === 'sent' ? 'text-primary border-b-2 border-primary' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Sent History
          </button>
        </div>
      )}

      {activeTab === 'inbox' ? (
        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <div className="glass-panel p-12 text-center text-slate-500">Loading your notifications...</div>
          ) : notifications.map((n) => {
            const isAcknowledged = n.acknowledgements && n.acknowledgements.length > 0;
            return (
              <div 
                key={n.id} 
                className={`glass-panel p-5 border-l-4 transition-all ${
                  isAcknowledged ? 'border-l-slate-300 opacity-75' : 'border-l-primary shadow-md'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className="mt-1">{getIcon(n.type)}</div>
                    <div>
                      <h3 className={`font-bold ${isAcknowledged ? 'text-slate-600' : 'text-slate-800'}`}>{n.title}</h3>
                      <p className="text-sm text-slate-600 mt-1">{n.message}</p>
                      <div className="flex items-center gap-3 mt-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <User size={10} /> {n.sender?.name}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <History size={10} /> {new Date(n.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    {isAcknowledged ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-success uppercase bg-success/10 px-2 py-1 rounded-full">
                        <UserCheck size={12} /> Acknowledged
                      </span>
                    ) : (
                      <button 
                        onClick={() => handleAcknowledge(n.id)}
                        className="btn-primary py-1 px-3 text-xs flex items-center gap-1"
                      >
                        <Check size={14} /> Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {!loading && notifications.length === 0 && (
            <div className="glass-panel p-12 text-center text-slate-400">
              <Bell size={48} className="mx-auto mb-4 opacity-20" />
              <p>You have no notifications yet.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sentNotifications.map((n) => (
            <div key={n.id} className="glass-panel p-5 bg-slate-50 border border-slate-100">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      n.type === 'danger' ? 'bg-danger/10 text-danger' :
                      n.type === 'warning' ? 'bg-warning/10 text-warning' :
                      'bg-primary/10 text-primary'
                    }`}>
                      {n.targetRole}
                    </span>
                    <h3 className="font-bold text-slate-800">{n.title}</h3>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{n.message}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-3">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                <button 
                  onClick={() => fetchStats(n.id)}
                  className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                >
                  <Eye size={14} /> View Acknowledgements
                </button>
              </div>
            </div>
          ))}
          {sentNotifications.length === 0 && (
            <div className="glass-panel p-12 text-center text-slate-400 italic">No sent history</div>
          )}
        </div>
      )}

      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 relative">
            <button onClick={() => setShowSendModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Send className="text-primary" size={24} />
              Send Notification
            </h2>
            
            <form onSubmit={handleSend} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Target Audience</label>
                  <select className="input-field mt-1" 
                    value={formData.target} 
                    onChange={e => setFormData({...formData, target: e.target.value, selectedUsers: []})}
                  >
                    {user.role === 'admin' && <option value="everyone">Everyone</option>}
                    <option value="team">Whole Team</option>
                    <option value="selective">Selective Persons</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Type</label>
                  <select className="input-field mt-1" 
                    value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="info">Information</option>
                    <option value="success">Success / Good News</option>
                    <option value="warning">Important Warning</option>
                    <option value="danger">Critical Alert</option>
                  </select>
                </div>
              </div>

              {formData.target === 'selective' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Select Persons</label>
                  <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
                    {employees.map(emp => (
                      <label key={emp._id} className="flex items-center gap-2 p-1 hover:bg-slate-50 rounded cursor-pointer text-sm">
                        <input 
                          type="checkbox" 
                          checked={formData.selectedUsers.includes(emp._id)}
                          onChange={(e) => {
                            const newSelected = e.target.checked 
                              ? [...formData.selectedUsers, emp._id]
                              : formData.selectedUsers.filter(id => id !== emp._id);
                            setFormData({...formData, selectedUsers: newSelected});
                          }}
                        />
                        {emp.name} ({emp.role})
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700">Title</label>
                <input required type="text" className="input-field mt-1" placeholder="Short descriptive title"
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700">Message</label>
                <textarea required rows="3" className="input-field mt-1" placeholder="Write your announcement here..."
                  value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} 
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowSendModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Send Now</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showStatsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
            <button onClick={() => setShowStatsModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
              <UserCheck className="text-success" size={24} />
              Acknowledgements
            </h2>
            <p className="text-xs text-slate-500 mb-6">List of users who have confirmed reading this message.</p>
            
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {statsData.map((ack) => (
                <div key={ack.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{ack.User?.name}</p>
                    <p className="text-[10px] text-slate-400 uppercase">{ack.User?.role} • {ack.User?.employeeId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-success flex items-center gap-1 justify-end uppercase">
                      <Check size={10} /> Confirmed
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{new Date(ack.acknowledgedAt).toLocaleString([], {dateStyle: 'short', timeStyle: 'short'})}</p>
                  </div>
                </div>
              ))}
              {statsData.length === 0 && (
                <div className="py-12 text-center text-slate-400 italic text-sm">
                  No one has acknowledged this message yet.
                </div>
              )}
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-100">
              <button onClick={() => setShowStatsModal(null)} className="btn-primary w-full py-2">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
