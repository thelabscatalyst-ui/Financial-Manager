import { useState } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import { IndianRupee, Landmark, Building, Plus } from 'lucide-react';

const WalletCard = ({ title, amount, icon: Icon, color, subtitle }) => (
  <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
    <div className="flex justify-between items-start mb-4">
      <div style={{ 
        width: '32px', height: '32px', borderRadius: '50%', 
        backgroundColor: `${color}15`, color: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center' 
      }}>
        <Icon size={16} />
      </div>
      {/* Optional Top Right Action */}
    </div>
    <div style={{ marginTop: 'auto' }}>
      <p className="text-secondary text-sm mb-1">{title}</p>
      <h3 style={{ fontSize: '1.5rem', margin: 0 }}>₹{amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</h3>
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
    if (!amount || isNaN(amount) || amount <= 0) return;
    addMoney(mode, parseFloat(amount));
    setAmount('');
    setShowModal(false);
  };

  return (
    <>
      <WalletCard title="Cash" amount={wallet.cash} icon={IndianRupee} color="#10B981" />
      <WalletCard title="Bank Balance" amount={wallet.online} icon={Landmark} color="#3B82F6" />
      <WalletCard title="Angel Demat Funds" amount={wallet.demat} icon={Building} color="#6366F1" subtitle="Updated by Angel One sync" />

      {/* Floating Add Button for Wallet - Since cards are identical, we can place this outside or in a corner of the grid */}
      <div style={{ position: 'absolute', top: '2rem', right: '2.5rem' }}>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add Cash/Bank
        </button>
      </div>

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(5, 8, 22, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="panel" style={{ width: '100%', maxWidth: '400px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 className="mb-6">Add Cash/Bank Funds</h3>
            <form onSubmit={handleAdd} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-secondary">Amount (₹)</label>
                <input 
                  type="number" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)} 
                  placeholder="0.00" 
                  required 
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-secondary">Destination</label>
                <select value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="cash">Cash Wallet</option>
                  <option value="online">Bank Account</option>
                </select>
              </div>
              <div className="flex gap-3 mt-4">
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Deposit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Wallet;
