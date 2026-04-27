import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Ticket as TicketIcon, Plus, X, MessageSquare, AlertTriangle, Shield, User as UserIcon, Clock, CheckCircle } from 'lucide-react';

const Tickets = () => {
  const { user } = useContext(AuthContext);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [comment, setComment] = useState('');
  
  const [formData, setFormData] = useState({
    subject: '', description: '', priority: 'Low'
  });

  const fetchTickets = async () => {
    try {
      setLoading(true);
      let endpoint = '/api/tickets/my';
      if (user.role === 'admin') endpoint = '/api/tickets/all';
      else if (user.role === 'manager') endpoint = '/api/tickets/team';

      const { data } = await axios.get(endpoint, { withCredentials: true });
      setTickets(data);
      if (selectedTicket) {
        const updated = data.find(t => t._id === selectedTicket._id);
        if (updated) setSelectedTicket(updated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [user.role]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/tickets', formData, { withCredentials: true });
      setShowModal(false);
      setFormData({ subject: '', description: '', priority: 'Low' });
      fetchTickets();
    } catch (err) {
      alert('Failed to create ticket');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      await axios.post(`/api/tickets/${selectedTicket._id}/comments`, { text: comment }, { withCredentials: true });
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
        <div className="xl:col-span-2 space-y-4">
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
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                          <UserIcon size={12} /> {t.user?.name || 'Self'}
                        </span>
                        <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                          <Clock size={12} /> {new Date(t.createdAt).toLocaleDateString()}
                        </span>
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
              </div>
            ))
          )}
          {!loading && tickets.length === 0 && (
            <div className="glass-panel p-12 text-center text-slate-400">No tickets found.</div>
          )}
        </div>

        <div className="space-y-6">
          {selectedTicket ? (
            <div className="glass-panel p-6 sticky top-6 animate-in slide-in-from-right-4 duration-300 flex flex-col h-[calc(100vh-12rem)]">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                   <div className="flex gap-2">
                     <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded uppercase">Ticket #{selectedTicket._id}</span>
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
                <p className="text-xs text-slate-400 mb-4 flex items-center gap-1">
                  Opened by <span className="font-bold text-slate-600">{selectedTicket.user?.name || 'User'}</span> on {new Date(selectedTicket.createdAt).toLocaleDateString()}
                </p>
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
                      <span className="text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className={`p-3 rounded-2xl text-sm ${c.user?.name === user.name ? 'bg-primary text-white ml-4 shadow-sm' : 'bg-slate-100 text-slate-700 mr-4'}`}>
                      {c.text}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-auto space-y-4 pt-4 border-t border-slate-100">
                {selectedTicket.status !== 'Resolved' && (
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
                )}

                {(user.role === 'admin' || user.role === 'manager') && selectedTicket.status !== 'Resolved' && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleStatusUpdate(selectedTicket._id, 'Resolved')}
                      className="flex-1 bg-success text-white py-2.5 rounded-xl text-xs font-bold hover:bg-success/90 transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={14} />
                      Resolve Ticket
                    </button>
                    {user.role === 'manager' && selectedTicket.status !== 'Escalated' && (
                      <button 
                        onClick={() => handleEscalate(selectedTicket._id)}
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
            <div className="glass-panel p-12 text-center text-slate-400 border-dashed border-2 flex flex-col items-center justify-center h-[calc(100vh-12rem)] gap-4">
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
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
