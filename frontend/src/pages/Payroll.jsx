import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { DollarSign, FileSpreadsheet, Lock, Unlock, Eye, Upload, Check, X, ReceiptText } from 'lucide-react';

const Payroll = () => {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'admin';

  const [activeTab, setActiveTab] = useState('payroll'); // 'payroll' or 'expenses'
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // 'YYYY-MM'
  const [payrolls, setPayrolls] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [exchangeRate, setExchangeRate] = useState(83.0);
  const [loading, setLoading] = useState(false);
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState('');

  // Edit Payroll Modal State
  const [editModal, setEditModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [editForm, setEditForm] = useState({ bonus: 0, overtime: 0, deductions: 0, status: 'Draft' });

  // Expense Modal State
  const [expenseModal, setExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', invoice: null });
  const [rejectionModal, setRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedExpenseId, setSelectedExpenseId] = useState(null);

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

  const fetchExpenses = async () => {
    try {
      const endpoint = isAdmin ? `/api/expenses?month=${month}` : '/api/expenses/my';
      const { data } = await axios.get(endpoint, { withCredentials: true });
      setExpenses(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPayrolls();
    fetchExpenses();
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

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('description', expenseForm.description);
    formData.append('amount', expenseForm.amount);
    formData.append('month', month);
    if (expenseForm.invoice) formData.append('invoice', expenseForm.invoice);

    try {
      await axios.post('/api/expenses', formData, { 
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setExpenseModal(false);
      setExpenseForm({ description: '', amount: '', invoice: null });
      fetchExpenses();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to upload expense');
    }
  };

  const handleApproveExpense = async (id) => {
    try {
      await axios.put(`/api/expenses/${id}/approve`, {}, { withCredentials: true });
      fetchExpenses();
      fetchPayrolls(); 
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve');
    }
  };

  const handleRejectExpense = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/expenses/${selectedExpenseId}/reject`, { rejectionReason }, { withCredentials: true });
      setRejectionModal(false);
      setRejectionReason('');
      fetchExpenses();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject');
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

  const exportExpensesCSV = () => {
    const filtered = isAdmin && selectedEmployeeFilter 
      ? expenses.filter(exp => String(exp.userId) === String(selectedEmployeeFilter))
      : expenses;

    if (!filtered.length) return;
    const headers = ['Date', 'Employee', 'Description', 'Amount', 'Status', 'Rejection Reason'];
    const rows = filtered.map(exp => [
      new Date(exp.createdAt).toLocaleDateString(),
      exp.User?.name || 'N/A',
      exp.description,
      exp.amount.toFixed(2),
      exp.status,
      exp.rejectionReason || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Expenses_${month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredExpenses = isAdmin && selectedEmployeeFilter 
    ? expenses.filter(exp => String(exp.userId) === String(selectedEmployeeFilter))
    : expenses;

  // Get unique employees from the expenses list itself to ensure all submitters are present
  const uniqueEmployees = expenses.reduce((acc, curr) => {
    if (curr.User && !acc.find(emp => emp.id === curr.userId)) {
      acc.push({ id: curr.userId, name: curr.User.name });
    }
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-slate-800">
            {isAdmin ? 'Payroll & Expenses' : 'My Salary & Expenses'}
          </h1>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('payroll')}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition ${activeTab === 'payroll' ? 'bg-white shadow text-primary' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Payroll
            </button>
            <button 
              onClick={() => setActiveTab('expenses')}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition ${activeTab === 'expenses' ? 'bg-white shadow text-primary' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Expenses
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input 
            type="month" 
            className="input-field"
            value={month} 
            onChange={(e) => setMonth(e.target.value)} 
          />
          {isAdmin && activeTab === 'payroll' && (
            <button 
              onClick={exportCSV} 
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition"
            >
              <FileSpreadsheet size={18} />
              Export CSV
            </button>
          )}
          {isAdmin && activeTab === 'expenses' && (
            <button 
              onClick={exportExpensesCSV} 
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition"
            >
              <FileSpreadsheet size={18} />
              Export Expenses CSV
            </button>
          )}
          {!isAdmin && activeTab === 'expenses' && (
            <button 
              onClick={() => setExpenseModal(true)} 
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition"
            >
              <Upload size={18} />
              Claim Expense
            </button>
          )}
        </div>
      </div>

      {activeTab === 'payroll' ? (
        <>
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
        </>
      ) : (
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex items-center gap-3 glass-panel p-4">
              <label className="text-sm font-semibold text-slate-600">Filter by Employee:</label>
              <select 
                className="input-field max-w-xs"
                value={selectedEmployeeFilter}
                onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
              >
                <option value="">All Employees</option>
                {uniqueEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="glass-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    {isAdmin && <th className="px-6 py-4">Employee</th>}
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Invoice</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Actions/Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">{new Date(exp.createdAt).toLocaleDateString()}</td>
                      {isAdmin && <td className="px-6 py-4">{exp.User?.name}</td>}
                      <td className="px-6 py-4">{exp.description}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">₹{exp.amount.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        {exp.invoiceUrl ? (
                          <a 
                            href={exp.invoiceUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <Eye size={14} /> View
                          </a>
                        ) : 'No Invoice'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          exp.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                          exp.status === 'Rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {exp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isAdmin && exp.status === 'Pending' ? (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleApproveExpense(exp.id)}
                              className="p-1.5 bg-emerald-100 text-emerald-600 rounded hover:bg-emerald-200 transition"
                              title="Approve"
                            >
                              <Check size={16} />
                            </button>
                            <button 
                              onClick={() => {
                                setSelectedExpenseId(exp.id);
                                setRejectionModal(true);
                              }}
                              className="p-1.5 bg-rose-100 text-rose-600 rounded hover:bg-rose-200 transition"
                              title="Reject"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic">
                            {exp.status === 'Rejected' ? `Reason: ${exp.rejectionReason}` : '-'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredExpenses.length === 0 && (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 6} className="px-6 py-10 text-center text-slate-400">
                        No expense claims found for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Payroll Edit Modal */}
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

      {/* Expense Upload Modal */}
      {expenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Claim Expense</h2>
            <form onSubmit={handleExpenseSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Description</label>
                <input 
                  required
                  type="text" 
                  className="input-field mt-1" 
                  placeholder="e.g. Client Dinner, Office Supplies"
                  value={expenseForm.description} 
                  onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Amount (INR)</label>
                <input 
                  required
                  type="number" 
                  className="input-field mt-1" 
                  value={expenseForm.amount} 
                  onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Invoice (PDF/Image)</label>
                <input 
                  type="file" 
                  className="input-field mt-1" 
                  onChange={e => setExpenseForm({...expenseForm, invoice: e.target.files[0]})} 
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setExpenseModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Submit Claim</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-slate-800 mb-6 text-rose-600">Reject Expense Claim</h2>
            <form onSubmit={handleRejectExpense} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Reason for Rejection</label>
                <textarea 
                  required
                  className="input-field mt-1 h-32" 
                  placeholder="Explain why this claim is being rejected..."
                  value={rejectionReason} 
                  onChange={e => setRejectionReason(e.target.value)} 
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setRejectionModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary bg-rose-600 hover:bg-rose-700 border-none flex-1">Reject Claim</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payroll;
