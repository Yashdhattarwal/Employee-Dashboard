import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { DollarSign, FileSpreadsheet, Lock, Unlock, Eye } from 'lucide-react';

const Payroll = () => {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'admin';

  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // 'YYYY-MM'
  const [payrolls, setPayrolls] = useState([]);
  const [exchangeRate, setExchangeRate] = useState(83.0);
  const [loading, setLoading] = useState(false);

  // Edit Modal State
  const [editModal, setEditModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [editForm, setEditForm] = useState({ bonus: 0, overtime: 0, deductions: 0, status: 'Draft' });

  const fetchPayrolls = async () => {
    setLoading(true);
    try {
      const endpoint = isAdmin ? `/api/payroll?month=${month}` : '/api/payroll/my';
      const { data } = await axios.get(endpoint, { withCredentials: true });
      setPayrolls(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrolls();
  }, [month]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      await axios.post('/api/payroll', { month, exchangeRate }, { withCredentials: true });
      fetchPayrolls();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate payroll');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/payroll/${selectedPayroll.id}`, editForm, { withCredentials: true });
      setEditModal(false);
      fetchPayrolls();
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed');
    }
  };

  const exportCSV = () => {
    if (!payrolls.length) return;
    const headers = ['Employee Name', 'Account Number', 'IFSC Code', 'Net Salary', 'Currency'];
    const rows = payrolls.map(p => [
      p.user?.name || 'N/A',
      p.user?.accountNumber || 'N/A',
      p.user?.ifscCode || 'N/A',
      p.netSalary.toFixed(2),
      p.currency
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Payroll_${month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">
          {isAdmin ? 'Payroll Management' : 'My Salary & Payslips'}
        </h1>

        {isAdmin && (
          <div className="flex items-center gap-3">
            <input 
              type="month" 
              className="input-field"
              value={month} 
              onChange={(e) => setMonth(e.target.value)} 
            />
            <button 
              onClick={exportCSV} 
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition"
            >
              <FileSpreadsheet size={18} />
              Export CSV
            </button>
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="glass-panel p-6 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Exchange Rate (INR / USD)
            </label>
            <input 
              type="number" 
              className="input-field mt-1 w-32" 
              value={exchangeRate} 
              onChange={e => setExchangeRate(parseFloat(e.target.value))} 
            />
          </div>
          <button 
            onClick={handleGenerate}
            disabled={loading}
            className="px-6 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-50 transition"
          >
            {loading ? 'Generating...' : 'Generate/Update Payroll'}
          </button>
        </div>
      )}

      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4">Month</th>
                {isAdmin && <th className="px-6 py-4">Employee</th>}
                <th className="px-6 py-4">Present Days</th>
                <th className="px-6 py-4">Base Salary</th>
                <th className="px-6 py-4">Bonus</th>
                <th className="px-6 py-4">Overtime</th>
                <th className="px-6 py-4">Deductions</th>
                <th className="px-6 py-4">Net Salary</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {payrolls.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">{p.month}</td>
                  {isAdmin && <td className="px-6 py-4">{p.user?.name}</td>}
                  <td className="px-6 py-4">{p.presentDays}</td>
                  <td className="px-6 py-4">
                    {p.currency === 'USD' ? '$' : '₹'}
                    {p.baseSalary?.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-emerald-600">
                    +{p.currency === 'USD' ? '$' : '₹'}{p.bonus?.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-emerald-600">
                    +{p.currency === 'USD' ? '$' : '₹'}{p.overtime?.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-rose-600">
                    -{p.currency === 'USD' ? '$' : '₹'}{p.deductions?.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900">
                    {p.currency === 'USD' ? '$' : '₹'}
                    {p.netSalary?.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      p.status === 'Locked' ? 'bg-slate-100 text-slate-600' :
                      p.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {isAdmin ? (
                      <button 
                        disabled={p.status === 'Locked'}
                        onClick={() => {
                          setSelectedPayroll(p);
                          setEditForm({ bonus: p.bonus, overtime: p.overtime, deductions: p.deductions, status: p.status });
                          setEditModal(true);
                        }}
                        className="text-primary hover:underline font-semibold disabled:opacity-50"
                      >
                        Adjust
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">View Only</span>
                    )}
                  </td>
                </tr>
              ))}
              {payrolls.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 10 : 9} className="px-6 py-10 text-center text-slate-400">
                    No payroll data found for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editModal && selectedPayroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Adjust Payroll</h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Bonus</label>
                <input 
                  type="number" 
                  className="input-field mt-1" 
                  value={editForm.bonus} 
                  onChange={e => setEditForm({...editForm, bonus: parseFloat(e.target.value) || 0})} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Overtime</label>
                <input 
                  type="number" 
                  className="input-field mt-1" 
                  value={editForm.overtime} 
                  onChange={e => setEditForm({...editForm, overtime: parseFloat(e.target.value) || 0})} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Deductions</label>
                <input 
                  type="number" 
                  className="input-field mt-1" 
                  value={editForm.deductions} 
                  onChange={e => setEditForm({...editForm, deductions: parseFloat(e.target.value) || 0})} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Status</label>
                <select 
                  className="input-field mt-1" 
                  value={editForm.status} 
                  onChange={e => setEditForm({...editForm, status: e.target.value})}
                >
                  <option value="Draft">Draft</option>
                  <option value="Approved">Approved</option>
                  <option value="Locked">Locked</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setEditModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payroll;
