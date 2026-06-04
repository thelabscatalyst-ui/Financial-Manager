import { useState } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import { Briefcase, Receipt, Power, Trash2, IndianRupee, RefreshCw, Clock } from 'lucide-react';

const typeConfig = {
  holding_added:   { label: 'Asset Added',        icon: Briefcase,   color: '#3B82F6' },
  holding_closed:  { label: 'Position Closed',    icon: Power,       color: '#60A5FA' },
  holding_deleted: { label: 'Asset Removed',      icon: Trash2,      color: '#93C5FD' },
  expense_added:   { label: 'Expense Logged',     icon: Receipt,     color: '#BFDBFE' },
  wallet_updated:  { label: 'Wallet Updated',     icon: IndianRupee, color: '#1D4ED8' },
  angel_synced:    { label: 'Angel One Synced',   icon: RefreshCw,   color: '#60A5FA' },
};

const relativeTime = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

const ALL = 'All';

const Audit = () => {
  const { auditLog } = usePortfolio();
  const [filter, setFilter] = useState(ALL);

  const types = [ALL, ...Object.keys(typeConfig)];
  const filtered = (filter === ALL ? auditLog : auditLog.filter(e => e.type === filter)).slice(0, 50);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ marginBottom: '4px' }}>Audit Log</h2>
          <p className="text-sm text-muted">Last 50 entries — auto-purged after 3 months</p>
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{
            width: '180px',
            height: '38px',
            padding: '0 0.875rem',
            fontSize: '0.8125rem',
            fontWeight: 500,
            borderRadius: '10px',
          }}
        >
          {types.map(t => (
            <option key={t} value={t}>
              {t === ALL ? 'All Activity' : typeConfig[t]?.label ?? t}
            </option>
          ))}
        </select>
      </div>

      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Clock size={36} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
            <p className="text-secondary text-sm">No activity yet</p>
          </div>
        ) : (
          <div>
            {filtered.map((entry, idx) => {
              const cfg = typeConfig[entry.type] ?? { label: entry.type, icon: Clock, color: 'var(--text-secondary)' };
              const Icon = cfg.icon;
              const isLast = idx === filtered.length - 1;

              return (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    padding: '1rem 1.5rem',
                    borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Icon */}
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                    background: `${cfg.color}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginTop: '2px'
                  }}>
                    <Icon size={16} color={cfg.color} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem' }}>
                      <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                        {entry.description}
                      </p>
                      <span className="text-muted" style={{ fontSize: '0.75rem', flexShrink: 0 }}>
                        {relativeTime(entry.timestamp)}
                      </span>
                    </div>
                    <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                      {cfg.label} · {new Date(entry.timestamp).toLocaleString()}
                    </p>
                    {entry.data && Object.keys(entry.data).length > 0 && (
                      <div style={{ marginTop: '6px', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {Object.entries(entry.data).map(([k, v]) => (
                          <span key={k} style={{
                            fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px',
                            background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)'
                          }}>
                            {k}: {v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Audit;
