import { useState } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import { Plus, X, ReceiptText } from 'lucide-react';

const Expenses = ({ limit = 5, showActions = true }) => {
  const { expenses, addExpense, markExpenseImportant } = usePortfolio();
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('cash');
  const [description, setDescription] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || amount <= 0 || !description) return;
    addExpense({
      amount: parseFloat(amount),
      mode,
      description,
      important: false
    });
    setAmount('');
    setDescription('');
    setShowModal(false);
  };

  const displayExpenses = limit ? expenses.slice(0, limit) : expenses;

  return (
    <div className="panel flex-col flex" style={{ height: '100%' }}>
      <div className="flex justify-between items-center mb-6">
        <h3>Recent Expenses</h3>
        {showActions && expenses.length > 0 && (
          <button className="btn btn-outline" style={{ height: '32px', padding: '0 12px', fontSize: '12px' }} onClick={() => setShowModal(true)}>
            <Plus size={14} /> Add Expense
          </button>
        )}
      </div>

      <div className="table-container" style={{ flex: 1, margin: '0 -10px' }}>
        {displayExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
             <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <ReceiptText size={24} className="text-secondary" />
             </div>
             <div>
               <p className="font-medium text-primary mb-1">No expenses yet</p>
               <p className="text-sm text-secondary mb-4">Add your first expense to get started.</p>
               <button className="btn btn-primary" onClick={() => setShowModal(true)}>Add Expense</button>
             </div>
          </div>
        ) : (
          <table style={{ padding: '0 10px', display: 'table' }}>
            <thead>
              <tr>
                <th style={{ paddingLeft: '10px' }}>Description</th>
                <th>Mode</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                {!limit && <th style={{ textAlign: 'right', paddingRight: '10px' }}></th>}
              </tr>
            </thead>
            <tbody>
              {displayExpenses.map(exp => (
                <tr key={exp.id}>
                  <td style={{ paddingLeft: '10px' }} className="font-medium">
                    {exp.description}
                  </td>
                  <td style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{exp.mode}</td>
                  <td style={{ textAlign: 'right' }} className="text-primary font-bold">
                    ₹{exp.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </td>
                  {!limit && (
                    <td style={{ textAlign: 'right', paddingRight: '10px' }}>
                       <button 
                         className="btn-icon-only"
                         onClick={() => markExpenseImportant(exp.id)}
                         title={exp.important ? "Unmark Important" : "Mark Important"}
                       >
                         {/* Simplified icon for important state can go here */}
                         <span style={{ fontSize: '12px', color: exp.important ? 'var(--accent-primary)' : 'inherit' }}>
                           {exp.important ? '★' : '☆'}
                         </span>
                       </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(5, 8, 22, 0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="panel" style={{ width: '100%', maxWidth: '400px' }}>
            <div className="flex justify-between items-center mb-6">
               <h3 className="m-0">Add Expense</h3>
               <button className="btn-icon-only" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAdd} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-secondary">Description</label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Groceries" required />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-secondary">Amount (₹)</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-secondary">Paid via</label>
                <select value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="cash">Cash</option>
                  <option value="online">Online</option>
                </select>
              </div>
              <div className="flex gap-3 mt-4">
                <button type="submit" className="btn btn-primary w-full" style={{ width: '100%' }}>Add Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
