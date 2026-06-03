import { useState, useMemo } from 'react';
import Expenses from '../components/Expenses';
import { usePortfolio } from '../context/PortfolioContext';

const AllExpenses = () => {
  const { expenses } = usePortfolio();
  
  // Extract unique months for filtering
  const months = useMemo(() => {
    const m = new Set();
    expenses.forEach(exp => {
      const d = new Date(exp.date);
      m.add(d.toLocaleString('default', { month: 'long', year: 'numeric' }));
    });
    return Array.from(m);
  }, [expenses]);

  const [filterMonth, setFilterMonth] = useState('All');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      <div className="flex justify-between items-center">
        <h2>All Expenses</h2>
        <div className="flex gap-2 items-center">
          <label className="text-sm text-muted">Filter by Month:</label>
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ minWidth: '150px' }}>
            <option value="All">All Time</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>
      
      <p className="text-sm text-muted">Note: Non-important expenses older than 5 months are automatically purged.</p>

      {/* The component already handles its own display, but for filtering we might need to pass filtered data.
          For simplicity, we can let the Expenses component show all, but we need filtering.
          Wait, Expenses component pulls directly from context.
          Let's create a custom filtered view here instead of reusing the widget, or modify the widget to accept data.
          Let's just re-implement the table slightly or pass a prop. It's easier to just pass a prop.
      */}
      <div style={{ flex: 1 }}>
        <FilteredExpenses filterMonth={filterMonth} />
      </div>
    </div>
  );
};

// Re-using the logic from Expenses component but with filtering
import { AlertCircle } from 'lucide-react';
const FilteredExpenses = ({ filterMonth }) => {
  const { expenses, markExpenseImportant } = usePortfolio();
  
  const filtered = expenses.filter(exp => {
    if (filterMonth === 'All') return true;
    const d = new Date(exp.date);
    return d.toLocaleString('default', { month: 'long', year: 'numeric' }) === filterMonth;
  });

  return (
    <div className="panel" style={{ height: '100%' }}>
      <div className="table-container">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-muted" style={{ height: '200px' }}>
            <AlertCircle size={40} className="mb-2 opacity-50" />
            <p>No expenses found for this period</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Mode</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(exp => (
                <tr key={exp.id}>
                  <td>{new Date(exp.date).toLocaleDateString()}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      {exp.description}
                      {exp.important && <AlertCircle size={14} className="text-accent-gold" color="var(--accent-gold)" />}
                    </div>
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{exp.mode}</td>
                  <td style={{ textAlign: 'right' }} className="text-loss font-bold">
                    -₹{exp.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      className={`btn ${exp.important ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      onClick={() => markExpenseImportant(exp.id)}
                    >
                      {exp.important ? 'Important' : 'Mark Important'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AllExpenses;
