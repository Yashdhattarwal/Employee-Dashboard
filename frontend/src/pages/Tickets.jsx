import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Ticket as TicketIcon, Plus, X, MessageSquare, AlertTriangle, Shield, User as UserIcon, Clock, CheckCircle, RefreshCw, Mail } from 'lucide-react';

const Tickets = () => {
  const { user } = useContext(AuthContext);
  const [tickets, setTickets] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [comment, setComment] = useState('');
  
  const [formData, setFormData] = useState({
    subject: '', description: '', priority: 'Low', assignedTo: '', cc: []
  });

  const fetchTickets = async () => {
    try {
      setLoading(true);
      let endpoint = '/api/tickets/my';
      if (user.role === 'admin') endpoint = '/api/tickets/all';
      else if (user.role === 'manager' || user.role === 'teamlead') endpoint = '/api/tickets/team';

      const { data } = await axios.get(endpoint, { withCredentials: true });
      setTickets(data);
      if (selectedTicket) {
        const updated = data.find(t => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignees = async () => {
    try {
      const { data } = await axios.get('/api/tickets/assignees', { withCredentials: true });
      setAssignees(data);
      // Auto-set first option or user's manager if exists
      const mgr = data.find(u => u.role === 'manager' || u.role === 'teamlead');
      setFormData(prev => ({
        ...prev,
        assignedTo: mgr ? mgr.id : (data[0]?.id || '')
      }));
    } catch (err) {
      console.error('Failed to fetch assignees', err);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchAssignees();
  }, [user.role]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        cc: formData.cc.join(',')
      };
      await axios.post('/api/tickets', payload, { withCredentials: true });
      setShowModal(false);
      setFormData({ subject: '', description: '', priority: 'Low', assignedTo: assignees[0]?.id || '', cc: [] });
      fetchTickets();
    } catch (err) {
      alert('Failed to create ticket');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      await axios.post(`/api/tickets/${selectedTicket.id}/comments`, { text: comment }, { withCredentials: true });
      setComment('');
      fetchTickets();
    } catch (err) {
      alert('Failed to add comment');
    }
  };

  const handleEscalate = async (id) => {
    try {
      await axios.put(`/api/tickets/${id}/escalate`, {}, { withCredentials: true });
      fetchTickets();
    } catch (err) {
      alert('Failed to escalate ticket');
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await axios.put(`/api/tickets/${id}/status`, { status }, { withCredentials: true });
      fetchTickets();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const toggleCC = (id) => {
    setFormData(prev => {
      const ccList = prev.cc.includes(id) 
        ? prev.cc.filter(item => item !== id)
        : [...prev.cc, id];
      return { ...prev, cc: ccList };
    });
  };

  const getCCNames = (ccStr) => {
    if (!ccStr) return 'None';
    const ids = ccStr.split(',').map(Number);
    const names = ids.map(id => {
      const found = assignees.find(a => Number(a.id) === id);
      return found ? `${found.name} (${found.role})` : `User #${id}`;
    });
    return names.join(', ');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Support Tickets</h1>
        <button 
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Create Ticket
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 space-y-4 max-h-[calc(100vh-10rem)] overflow-y-auto pr-1 custom-scrollbar">
          {loading ? (
            <div className="glass-panel p-12 text-center text-slate-500">Loading tickets...</div>
          ) : (
            tickets.map((t) => (
              <div 
                key={t._id} 
                onClick={() => setSelectedTicket(t)}
                className={`glass-panel p-5 cursor-pointer transition-all border-2 ${
                  selectedTicket?._id === t._id ? 'border-primary' : 'border-transparent hover:border-slate-200'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      t.priority === 'High' ? 'bg-danger/10 text-danger' : 
                      t.priority === 'Medium' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                    }`}>
                      <AlertTriangle size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{t.subject}</h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-0.5">
                        <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                          <UserIcon size={12} /> {t.user?.name || 'Self'}
                        </span>
                        <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                          <Clock size={12} /> {new Date(t.createdAt).toLocaleString()}
                        </span>
                        {t.assignee && (
                          <span className="text-xs font-medium text-primary flex items-center gap-1">
                            <Shield size={12} /> To: {t.assignee.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    t.status === 'Resolved' ? 'bg-success/10 text-success' :
                    t.status === 'Escalated' ? 'bg-primary/10 text-primary' :
                    'bg-warning/10 text-warning'
                  }`}>
                    {t.status}
                  </span>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2">{t.description}</p>
                {t.cc && (
                  <div className="mt-2 text-[11px] text-slate-400 truncate">
                    <strong>CC:</strong> {getCCNames(t.cc)}
                  </div>
                )}
              </div>
            ))
          )}
          {!loading && tickets.length === 0 && (
            <div className="glass-panel p-12 text-center text-slate-400">No tickets found.</div>
          )}
        </div>

        <div className="xl:col-span-2 space-y-6">
          {selectedTicket ? (
            <div className="glass-panel p-6 sticky top-6 animate-in slide-in-from-right-4 duration-300 flex flex-col h-[calc(100vh-10rem)]">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                   <div className="flex gap-2">
                     <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded uppercase">Ticket #{selectedTicket.id}</span>
                     <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                        selectedTicket.priority === 'High' ? 'bg-danger/10 text-danger' : 
                        selectedTicket.priority === 'Medium' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                      }`}>{selectedTicket.priority} Priority</span>
                   </div>
                   <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    selectedTicket.status === 'Resolved' ? 'bg-success/10 text-success' :
                    selectedTicket.status === 'Escalated' ? 'bg-primary/10 text-primary' :
                    'bg-warning/10 text-warning'
                  }`}>
                    {selectedTicket.status}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-1">{selectedTicket.subject}</h2>
                <div className="text-xs text-slate-400 mb-3 space-y-1">
                  <p className="flex items-center gap-1">
                    Opened by <span className="font-bold text-slate-600">{selectedTicket.user?.name || 'User'}</span> on {new Date(selectedTicket.createdAt).toLocaleString()}
                  </p>
                  {selectedTicket.assignee && (
                    <p>
                      <strong>Assigned To:</strong> <span className="text-primary font-semibold">{selectedTicket.assignee.name} ({selectedTicket.assignee.email})</span>
                    </p>
                  )}
                  {selectedTicket.cc && (
                    <p className="truncate">
                      <strong>CC Recipients:</strong> <span className="text-slate-600">{getCCNames(selectedTicket.cc)}</span>
                    </p>
                  )}
                </div>
                <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-700 border border-slate-100 italic">
                  "{selectedTicket.description}"
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2 custom-scrollbar">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Activity Log & Comments</h4>
                {selectedTicket.comments?.map((c, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[11px] font-bold text-slate-700">{c.user?.name || 'System'}</span>
                      <span className="text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <div className={`p-3 rounded-2xl text-sm ${c.user?.name === user.name ? 'bg-primary text-white ml-4 shadow-sm' : 'bg-slate-100 text-slate-700 mr-4'}`}>
                      {c.text}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-auto space-y-4 pt-4 border-t border-slate-100">
                {selectedTicket.status !== 'Resolved' ? (
                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <input 
                      required
                      className="input-field text-sm py-2"
                      placeholder="Type a message..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                    <button type="submit" className="bg-primary text-white p-2 rounded-xl hover:bg-primary/90 transition-all">
                      <MessageSquare size={18} />
                    </button>
                  </form>
                ) : (
                  // Allow ticket creator or admins/managers to reopen resolved tickets
                  (selectedTicket.userId === user.id || user.role === 'admin') && (
                    <button 
                      onClick={() => handleStatusUpdate(selectedTicket.id, 'Open')}
                      className="w-full bg-warning text-white py-2.5 rounded-xl text-xs font-bold hover:bg-warning/90 transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={14} />
                      Reopen Ticket
                    </button>
                  )
                )}

                {(user.role === 'admin' || user.role === 'manager' || user.role === 'teamlead') && selectedTicket.status !== 'Resolved' && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleStatusUpdate(selectedTicket.id, 'Resolved')}
                      className="flex-1 bg-success text-white py-2.5 rounded-xl text-xs font-bold hover:bg-success/90 transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={14} />
                      Resolve Ticket
                    </button>
                    {(user.role === 'manager' || user.role === 'teamlead') && selectedTicket.status !== 'Escalated' && (
                      <button 
                        onClick={() => handleEscalate(selectedTicket.id)}
                        className="flex-1 bg-primary text-white py-2.5 rounded-xl text-xs font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                      >
                        <Shield size={14} />
                        Escalate
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="glass-panel p-12 text-center text-slate-400 border-dashed border-2 flex flex-col items-center justify-center h-[calc(100vh-10rem)] gap-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                <MessageSquare size={32} className="text-slate-300" />
              </div>
              <div>
                <p className="font-bold text-slate-800">No Ticket Selected</p>
                <p className="text-xs max-w-[200px] mx-auto mt-1">Select a ticket from the list to view the full audit trail and chat history.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 relative overflow-y-auto max-h-[90vh] custom-scrollbar">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-slate-800 mb-6">Create New Ticket</h2>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Subject</label>
                <input required type="text" className="input-field mt-1" placeholder="Brief summary of the issue"
                  value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Priority</label>
                  <select className="input-field mt-1" 
                    value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Assign To</label>
                  <select required className="input-field mt-1" 
                    value={formData.assignedTo} onChange={e => setFormData({...formData, assignedTo: e.target.value})}
                  >
                    {assignees.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                    ))}
                    {assignees.length === 0 && <option value="">No assignees available</option>}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 flex items-center gap-1.5">
                  <Mail size={16} className="text-slate-400" /> CC Recipients (Keep informed)
                </label>
                <div className="mt-2 border border-slate-200 rounded-xl p-3 max-h-40 overflow-y-auto space-y-2 custom-scrollbar">
                  {assignees.map(a => (
                    <label key={a.id} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer hover:bg-slate-50 p-1 rounded">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                        checked={formData.cc.includes(a.id)}
                        onChange={() => toggleCC(a.id)}
                      />
                      <span>{a.name} ({a.role})</span>
                    </label>
                  ))}
                  {assignees.length === 0 && <p className="text-xs text-slate-400 italic">No CC candidates available.</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Description</label>
                <textarea required rows="4" className="input-field mt-1" placeholder="Explain the problem in detail..."
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Create Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tickets;
