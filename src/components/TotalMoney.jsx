import { usePortfolio } from '../context/PortfolioContext';
import { TrendingUp, TrendingDown } from 'lucide-react';

const fmt = (n) => '₹' + Math.abs(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const pct = (part, total) => total > 0 ? ((part / total) * 100).toFixed(1) : '0.0';

const PortionBar = ({ value, total, color }) => {
  const fill = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div style={{ width: '100%', height: '3px', background: 'rgba(255,255,255,0.07)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
      <div style={{ width: `${fill}%`, height: '100%', background: color, borderRadius: '2px', transition: 'width 0.6s ease' }} />
    </div>
  );
};

const TotalMoney = () => {
  const { totalMoney, liquidMoney, wallet, investedMoney, totalPNL } = usePortfolio();
  const invested  = wallet.demat + investedMoney;
  const pnlPct    = (totalMoney - totalPNL) > 0 ? (totalPNL / (totalMoney - totalPNL)) * 100 : 0;
  const isUp      = totalPNL >= 0;

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
        <div style={{
          width: '38px', height: '38px', borderRadius: '50%',
          background: 'rgba(59,130,246,0.18)', color: '#3B82F6',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <TrendingUp size={18} />
        </div>
        <span style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Net Worth</span>
      </div>

      {/* Big number */}
      <div style={{ fontSize: '2.25rem', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '0.875rem' }}>
        {fmt(totalMoney)}
      </div>

      {/* P&L row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Total P&amp;L</span>
        <span style={{
          fontSize: '0.875rem', fontWeight: 600,
          color: isUp ? '#10B981' : '#ef4444',
          display: 'flex', alignItems: 'center', gap: '4px',
        }}>
          {isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {isUp ? '+' : '-'}{fmt(totalPNL)}
          <span style={{ fontWeight: 400, opacity: 0.8, fontSize: '0.8rem' }}>
            ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)
          </span>
        </span>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '1.25rem' }} />

      {/* Two-column breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: 'auto' }}>
        {/* Liquid */}
        <div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Liquid Assets</p>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>{fmt(liquidMoney)}</p>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '3px' }}>{pct(liquidMoney, totalMoney)}% of Net Worth</p>
          <PortionBar value={liquidMoney} total={totalMoney} color="#3B82F6" />
        </div>

        {/* Invested */}
        <div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Invested Assets</p>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>{fmt(invested)}</p>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '3px' }}>{pct(invested, totalMoney)}% of Net Worth</p>
          <PortionBar value={invested} total={totalMoney} color="#10B981" />
        </div>
      </div>
    </div>
  );
};

export default TotalMoney;
