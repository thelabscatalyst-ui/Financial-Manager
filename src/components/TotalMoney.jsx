import { usePortfolio } from '../context/PortfolioContext';
import { TrendingUp } from 'lucide-react';

const TotalMoney = () => {
  const { totalMoney, liquidMoney, wallet, totalPNL } = usePortfolio();

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <p className="text-secondary text-sm mb-2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ 
          width: '28px', height: '28px', borderRadius: '50%', 
          backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center' 
        }}>
          <TrendingUp size={14} />
        </span>
        Net Worth
      </p>
      
      <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>
        ₹{totalMoney.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
      </h2>
      
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div className="flex justify-between items-center">
          <span className="text-secondary text-sm">Cash + Bank</span>
          <span className="text-sm font-bold text-primary">₹{liquidMoney.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-secondary text-sm">Angel Demat Funds</span>
          <span className="text-sm font-bold text-primary">₹{wallet.demat.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-secondary text-sm">Active Holdings P&L</span>
          <span className={`text-sm font-bold ${totalPNL >= 0 ? 'text-profit' : 'text-loss'}`}>
            {totalPNL >= 0 ? '+' : ''}₹{Math.abs(totalPNL).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TotalMoney;
