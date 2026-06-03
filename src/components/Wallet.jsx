import { useState } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import { IndianRupee, Landmark, Building, X } from 'lucide-react';

const WalletCard = ({ title, amount, icon: Icon, color, subtitle }) => (
  <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
    <div style={{
      width: '32px', height: '32px', borderRadius: '50%',
      backgroundColor: `${color}18`, color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      marginBottom: 'auto'
    }}>
      <Icon size={16} />
    </div>
    <div style={{ marginTop: '1.25rem' }}>
      <p className="text-secondary text-sm mb-1">{title}</p>
      <h3 style={{ fontSize: '1.5rem', margin: 0 }}>
        ₹{amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
      </h3>
      {subtitle && <p className="text-muted text-sm mt-2">{subtitle}</p>}
    </div>
  </div>
);

const Wallet = () => {
  const { wallet, addMoney } = usePortfolio();
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('cash');

  const handleAdd = (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return;
    addMoney(mode, parseFloat(amount));
    setAmount('');
    setShowModal(false);
  };

  const close = () => { setAmount(''); setShowModal(false); };

  return (
    <>
      <WalletCard title="Cash"               amount={wallet.cash}   icon={IndianRupee} color="#3B82F6" />
      <WalletCard title="Bank Balance"       amount={wallet.online} icon={Landmark}    color="#60A5FA" />
      <WalletCard
        title="Angel Demat Funds"
        amount={wallet.demat}
        icon={Building}
        color="#93C5FD"
        subtitle="Synced from Angel One"
      />

      {/* Add funds button — positioned relative to the grid row above */}
      <div style={{ position: 'absolute', top: '2rem', right: '2.5rem' }}>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <IndianRupee size={15} />
          Add Funds
        </button>
      </div>

      {showModal && (
        <div style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(5, 8, 22, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="panel" style={{ width: '100%', maxWidth: '400px' }}>
            <div className="flex justify-between items-center mb-6">
              <h3 style={{ margin: 0 }}>Add Funds</h3>
              <button className="btn-icon-only" onClick={close}><X size={20} /></button>
            </div>

            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="text-sm text-secondary">Destination</label>
                <select value={mode} onChange={e => setMode(e.target.value)}>
                  <option value="cash">Cash Wallet</option>
                  <option value="online">Bank Account</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="text-sm text-secondary">Amount (₹)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  step="any"
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={close}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Wallet;
