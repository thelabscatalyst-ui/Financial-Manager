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
    <>
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

    </div>
    {showModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(5,8,22,0.8)', backdropFilter: 'blur(16px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '2rem', zIndex: 1000, overflowY: 'auto'
        }}>
          <div className="panel" style={{ width: '100%', maxWidth: '420px', padding: '1.75rem' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>Add Expense</h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Log a new expense entry</p>
              </div>
              <button className="btn-icon-only" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Description */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Description</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="e.g. Groceries, Rent, Fuel" required autoFocus
                  style={{ height: '48px' }} />
              </div>

              {/* Amount */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Amount</label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
                    fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)',
                    pointerEvents: 'none',
                  }}>₹</span>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                    placeholder="0.00" min="0.01" step="any" required
                    style={{ paddingLeft: '2.25rem', fontSize: '1.125rem', fontWeight: 600, height: '52px' }} />
                </div>
              </div>

              {/* Paid via — tab selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Paid Via</label>
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr',
                  background: 'rgba(0,0,0,0.25)', borderRadius: '12px',
                  padding: '4px', gap: '4px',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  {[
                    { value: 'cash',   label: 'Cash'   },
                    { value: 'online', label: 'Online' },
                  ].map(opt => (
                    <button key={opt.value} type="button" onClick={() => setMode(opt.value)}
                      style={{
                        padding: '0.625rem', borderRadius: '9px',
                        fontSize: '0.8125rem', fontWeight: 600,
                        border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s ease',
                        background: mode === opt.value ? 'rgba(59,130,246,0.18)' : 'transparent',
                        color: mode === opt.value ? 'white' : 'var(--text-secondary)',
                        boxShadow: mode === opt.value ? '0 0 0 1px rgba(59,130,246,0.3)' : 'none',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button type="button" className="btn btn-outline"
                  style={{ height: '48px', borderRadius: '12px', fontSize: '0.9375rem', fontWeight: 600 }}
                  onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary"
                  style={{ height: '48px', borderRadius: '12px', fontSize: '0.9375rem', fontWeight: 600 }}>
                  Add Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Expenses;
