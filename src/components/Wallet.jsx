import { useState } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import { IndianRupee, Landmark, Building2, X } from 'lucide-react';
import Sparkline from './Sparkline';

const fmt   = (n) => '₹' + Math.abs(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const pct   = (part, total) => total > 0 ? ((part / total) * 100).toFixed(1) + '%' : '0.0%';

// Deterministic wavy sparkline — looks like real price data, stable across renders
const makeWave = (balance, phase = 0, points = 32) => {
  if (!balance) return Array(points).fill(0);
  const v = balance * 0.055;
  return Array.from({ length: points }, (_, i) => {
    const t    = i / (points - 1);
    const base = balance * (0.86 + t * 0.14);
    const w1   = Math.sin(i * 0.75 + phase) * v;
    const w2   = Math.sin(i * 1.9  + phase * 0.6 + 1.1) * v * 0.4;
    const w3   = Math.sin(i * 3.4  + phase * 1.2 + 2.4) * v * 0.2;
    return Math.max(0, base + w1 + w2 + w3);
  });
};

// Portfolio share bar
const ShareBar = ({ value, total, color }) => {
  const fill = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div style={{ width: '100%', height: '3px', background: 'rgba(255,255,255,0.07)', borderRadius: '2px', overflow: 'hidden' }}>
      <div style={{ width: `${fill}%`, height: '100%', background: color, borderRadius: '2px', transition: 'width 0.6s ease' }} />
    </div>
  );
};

// Status badge
const Badge = ({ label, color, bg }) => (
  <span style={{
    fontSize: '0.6875rem', fontWeight: 600, padding: '3px 9px', borderRadius: '20px',
    background: bg, color, letterSpacing: '0.02em', border: `1px solid ${color}30`,
  }}>
    {label}
  </span>
);

// Three-column metrics row
const MetricRow = ({ cols }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols.length}, 1fr)`, gap: '0.25rem', marginBottom: '0.75rem' }}>
    {cols.map((col, i) => (
      <div key={i}>
        <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '3px', whiteSpace: 'nowrap' }}>{col.label}</p>
        <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: col.color ?? 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          {col.value}
        </p>
      </div>
    ))}
  </div>
);

// Helper to parse ₹ string back to number
const parseAmount = (str) => parseFloat(String(str ?? '0').replace(/[₹,]/g, '')) || 0;

const getMonthlyChange = (auditLog, mode) => {
  const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
  return auditLog
    .filter(e => e.type === 'wallet_updated' && e.data?.mode === mode && new Date(e.timestamp) >= start)
    .reduce((sum, e) => sum + parseAmount(e.data?.amount), 0);
};

const getLastAdded = (auditLog, mode) => {
  const e = auditLog.find(e => e.type === 'wallet_updated' && e.data?.mode === mode);
  return e ? parseAmount(e.data?.amount) : null;
};

const getLastSync = (auditLog) => {
  const e = auditLog.find(e => e.type === 'angel_synced');
  if (!e) return '—';
  const diff = Date.now() - new Date(e.timestamp).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
};

// ── Single wallet card ─────────────────────────────────────────────────────────

const WCard = ({
  icon: Icon, iconColor, iconBg,
  title, subtitle,
  balance, totalMoney,
  badge,
  metricCols,
  sparkColor, sparkPhase = 0,
}) => {
  const sparkData = makeWave(balance, sparkPhase);
  const share     = totalMoney > 0 ? (balance / totalMoney) * 100 : 0;

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: iconBg, color: iconColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon size={17} />
          </div>
          <span style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{title}</span>
        </div>
        <Badge label={badge.label} color={badge.color} bg={badge.bg} />
      </div>

      {/* Balance */}
      <div style={{ marginBottom: '0.25rem' }}>
        <div style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
          {fmt(balance)}
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{subtitle}</p>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '1rem 0 0.875rem' }} />

      {/* Metrics */}
      <MetricRow cols={metricCols} />

      {/* Portfolio share bar */}
      <ShareBar value={balance} total={totalMoney} color={sparkColor} />

      {/* Spacer */}
      <div style={{ flex: 1, minHeight: '0.5rem' }} />

      {/* Sparkline */}
      <div style={{ margin: '0.75rem -4px 0', overflow: 'hidden' }}>
        <Sparkline data={sparkData} color={sparkColor} width={220} height={52} />
      </div>
    </div>
  );
};

// ── Wallet wrapper ──────────────────────────────────────────────────────────────

const Wallet = ({ showModal, onModalChange }) => {
  const { wallet, addMoney, totalMoney, auditLog, holdings } = usePortfolio();

  const [amount, setAmount] = useState('');
  const [mode,   setMode]   = useState('cash');

  const isOpen = showModal ?? false;
  const setOpen = onModalChange ?? (() => {});

  const close = () => { setAmount(''); setOpen(false); };
  const handleAdd = (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    addMoney(mode, parseFloat(amount));
    close();
  };

  const cashMonthly  = getMonthlyChange(auditLog, 'cash');
  const bankMonthly  = getMonthlyChange(auditLog, 'online');
  const cashLast     = getLastAdded(auditLog, 'cash');
  const bankLast     = getLastAdded(auditLog, 'online');
  const lastSync     = getLastSync(auditLog);
  const activeCount  = holdings.filter(h => h.status === 'active').length;

  return (
    <>
      {/* ── Cash ─── */}
      <WCard
        icon={IndianRupee} iconColor="#10B981" iconBg="rgba(16,185,129,0.15)"
        title="Cash" subtitle="Available Balance"
        balance={wallet.cash} totalMoney={totalMoney}
        badge={{ label: 'Active', color: '#10B981', bg: 'rgba(16,185,129,0.12)' }}
        sparkColor="#10B981" sparkPhase={0}
        metricCols={[
          { label: 'Share', value: pct(wallet.cash, totalMoney) },
          { label: 'This Month',      value: cashMonthly > 0 ? '+' + fmt(cashMonthly) : fmt(cashMonthly), color: cashMonthly >= 0 ? '#10B981' : '#ef4444' },
          { label: 'Last Added',      value: cashLast != null ? fmt(cashLast) : '—' },
        ]}
      />

      {/* ── Bank ─── */}
      <WCard
        icon={Landmark} iconColor="#3B82F6" iconBg="rgba(59,130,246,0.15)"
        title="Bank Balance" subtitle="Savings Account Balance"
        balance={wallet.online} totalMoney={totalMoney}
        badge={{ label: 'Synced', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' }}
        sparkColor="#3B82F6" sparkPhase={2.5}
        metricCols={[
          { label: 'Share', value: pct(wallet.online, totalMoney) },
          { label: 'This Month',      value: bankMonthly > 0 ? '+' + fmt(bankMonthly) : fmt(bankMonthly), color: bankMonthly >= 0 ? '#10B981' : '#ef4444' },
          { label: 'Last Sync',       value: lastSync },
        ]}
      />

      {/* ── Demat ─── */}
      <WCard
        icon={Building2} iconColor="#6366F1" iconBg="rgba(99,102,241,0.15)"
        title="Demat" subtitle="Funds Available to Invest"
        balance={wallet.demat} totalMoney={totalMoney}
        badge={{ label: 'Ready', color: '#6366F1', bg: 'rgba(99,102,241,0.12)' }}
        sparkColor="#6366F1" sparkPhase={5.1}
        metricCols={[
          { label: 'Share', value: pct(wallet.demat, totalMoney) },
          { label: 'Holdings',        value: `${activeCount}` },
          { label: 'Investable',      value: fmt(wallet.demat) },
        ]}
      />

      {/* ── Add Funds Modal ─── */}
      {isOpen && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(5,8,22,0.8)', backdropFilter: 'blur(16px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1.5rem', zIndex: 1000,
        }}>
          <div className="panel" style={{ width: '100%', maxWidth: '420px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>Add Funds</h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Deposit to your wallet
                </p>
              </div>
              <button className="btn-icon-only" onClick={close}><X size={18} /></button>
            </div>

            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1.375rem' }}>

              {/* Destination — tab pill selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Destination
                </label>
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr',
                  background: 'rgba(0,0,0,0.25)', borderRadius: '12px',
                  padding: '4px', gap: '4px',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  {[
                    { value: 'cash',   label: 'Cash Wallet'  },
                    { value: 'online', label: 'Bank Account' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setMode(opt.value)}
                      style={{
                        padding: '0.625rem 0.5rem',
                        borderRadius: '9px',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s ease',
                        background: mode === opt.value
                          ? 'rgba(59,130,246,0.18)'
                          : 'transparent',
                        color: mode === opt.value ? 'white' : 'var(--text-secondary)',
                        boxShadow: mode === opt.value
                          ? '0 0 0 1px rgba(59,130,246,0.3)'
                          : 'none',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Amount
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
                    fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)',
                    pointerEvents: 'none', userSelect: 'none',
                  }}>₹</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    min="0.01"
                    step="any"
                    required
                    autoFocus
                    style={{
                      paddingLeft: '2.25rem',
                      fontSize: '1.125rem',
                      fontWeight: 600,
                      height: '52px',
                    }}
                  />
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.25rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ height: '48px', borderRadius: '12px', fontSize: '0.9375rem', fontWeight: 600 }}
                  onClick={close}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ height: '48px', borderRadius: '12px', fontSize: '0.9375rem', fontWeight: 600 }}
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
