import { useState } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import { MoreVertical, Plus, Power, Trash2, X, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

const Tags = ['ETF', 'Stocks', 'Gold', 'Equity', 'Crypto', 'Commodity', 'Mutual Fund', 'Other'];

const Holdings = ({ limit = 5, showActions = true }) => {
  const {
    holdings, addHolding, updateHoldingPrice, closeHolding, deleteHolding,
    syncAngelOneHoldings, isSyncing, syncError
  } = usePortfolio();

  const [showModal, setShowModal] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);

  const [assetName, setAssetName] = useState('');
  const [tag, setTag] = useState(Tags[0]);
  const [units, setUnits] = useState('');
  const [buyPrice, setBuyPrice] = useState('');

  const [editPriceId, setEditPriceId] = useState(null);
  const [tempPrice, setTempPrice] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    if (!assetName || !units || !buyPrice) return;
    addHolding({ assetName, tag, units: parseFloat(units), buyPrice: parseFloat(buyPrice) });
    setAssetName(''); setUnits(''); setBuyPrice(''); setTag(Tags[0]);
    setShowModal(false);
  };

  const closeModal = () => {
    setAssetName(''); setUnits(''); setBuyPrice(''); setTag(Tags[0]);
    setShowModal(false);
  };

  const savePrice = (id) => {
    if (tempPrice && !isNaN(tempPrice)) updateHoldingPrice(id, parseFloat(tempPrice));
    setEditPriceId(null);
  };

  const displayHoldings = limit ? holdings.slice(0, limit) : holdings;

  return (
    <>
    <div className="panel flex-col flex" style={{ height: '100%' }}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h3>My Holdings</h3>
          {showActions && (
            <button
              className="btn btn-outline"
              style={{ height: '32px', padding: '0 12px', fontSize: '12px' }}
              onClick={syncAngelOneHoldings}
              disabled={isSyncing}
            >
              <RefreshCw size={12} />
              {isSyncing ? 'Syncing…' : 'Sync Angel One'}
            </button>
          )}
        </div>
        {showActions && holdings.length > 0 && (
          <Link to="/holdings" className="text-sm font-medium" style={{ color: 'var(--accent-primary)' }}>
            View All
          </Link>
        )}
      </div>

      {syncError && (
        <div className="mb-4 text-sm text-loss" style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.08)' }}>
          Sync failed: {syncError}
        </div>
      )}

      <div className="table-container" style={{ flex: 1, margin: '0 -10px' }}>
        {displayHoldings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Plus size={24} className="text-secondary" />
            </div>
            <div>
              <p className="font-medium text-primary mb-1">No holdings yet</p>
              <p className="text-sm text-secondary mb-4">Track your investments by adding them here.</p>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>Add Asset</button>
            </div>
          </div>
        ) : (
          <table style={{ padding: '0 10px', display: 'table' }}>
            <thead>
              <tr>
                <th style={{ paddingLeft: '10px' }}>Asset</th>
                <th>Type</th>
                <th>Units</th>
                <th>Avg Price</th>
                <th>LTP</th>
                <th>P&L</th>
                <th style={{ textAlign: 'right', paddingRight: '10px' }} />
              </tr>
            </thead>
            <tbody>
              {displayHoldings.map(h => {
                const isClosed = h.status === 'closed';
                const pnl = Number.isFinite(h.profitAndLoss)
                  ? h.profitAndLoss
                  : (h.currentPrice - h.buyPrice) * h.units;
                const pnlPct = h.buyPrice > 0 ? ((h.currentPrice - h.buyPrice) / h.buyPrice) * 100 : 0;
                const canEdit = !isClosed && !h.isSynced;
                const canClose = !isClosed && !h.isSynced;
                const canDelete = isClosed;
                const hasActions = showActions && (canClose || canDelete);

                return (
                  <tr key={h.id} style={{ opacity: isClosed ? 0.4 : 1 }}>
                    <td style={{ paddingLeft: '10px' }} className="font-bold">{h.assetName}</td>
                    <td>
                      <span style={{
                        padding: '4px 8px', borderRadius: '6px',
                        fontSize: '0.75rem',
                        background: 'rgba(255,255,255,0.05)',
                        color: 'var(--text-secondary)'
                      }}>{h.tag}</span>
                    </td>
                    <td>{h.units}</td>
                    <td>₹{h.buyPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                    <td>
                      {editPriceId === h.id ? (
                        <input
                          type="number"
                          style={{ width: '80px', padding: '6px' }}
                          value={tempPrice}
                          onChange={e => setTempPrice(e.target.value)}
                          onBlur={() => savePrice(h.id)}
                          onKeyDown={e => e.key === 'Enter' && savePrice(h.id)}
                          autoFocus
                        />
                      ) : (
                        <span
                          style={{
                            cursor: canEdit ? 'pointer' : 'default',
                            borderBottom: canEdit ? '1px dashed var(--text-secondary)' : 'none'
                          }}
                          onClick={() => { if (canEdit) { setEditPriceId(h.id); setTempPrice(h.currentPrice); } }}
                        >
                          ₹{h.currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </td>
                    <td className={pnl >= 0 ? 'text-profit font-bold' : 'text-loss font-bold'}>
                      {pnl >= 0 ? '+' : ''}₹{Math.abs(pnl).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      <span style={{ fontSize: '0.75rem', marginLeft: '4px', opacity: 0.8 }}>
                        ({pnlPct > 0 ? '+' : ''}{pnlPct.toFixed(2)}%)
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '10px', position: 'relative' }}>
                      {hasActions && (
                        <button
                          className="btn-icon-only"
                          onClick={() => setOpenMenuId(openMenuId === h.id ? null : h.id)}
                        >
                          <MoreVertical size={16} />
                        </button>
                      )}
                      {openMenuId === h.id && (
                        <div className="action-menu">
                          {canClose && (
                            <button onClick={() => { closeHolding(h.id); setOpenMenuId(null); }}>
                              <Power size={14} /><span>End Holding</span>
                            </button>
                          )}
                          {canDelete && (
                            <button className="danger" onClick={() => { deleteHolding(h.id); setOpenMenuId(null); }}>
                              <Trash2 size={14} /><span>Delete Holding</span>
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showActions && holdings.length > 0 && (
        <div className="mt-6 flex justify-end">
          <button className="btn btn-outline text-sm" onClick={() => setShowModal(true)}>
            <Plus size={15} /> Add Asset
          </button>
        </div>
      )}

    </div>
    {/* Add Asset Modal */}
    {showModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(5,8,22,0.8)',
          backdropFilter: 'blur(16px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '2rem', zIndex: 1000, overflowY: 'auto'
        }}>
          <div className="panel" style={{ width: '100%', maxWidth: '440px', padding: '1.75rem' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>Add Asset</h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Add a holding to your portfolio</p>
              </div>
              <button className="btn-icon-only" onClick={closeModal}><X size={18} /></button>
            </div>

            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

              {/* Asset Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Asset Name</label>
                <input
                  type="text" value={assetName} onChange={e => setAssetName(e.target.value)}
                  placeholder="e.g. GoldBees, RELIANCE" required autoFocus
                  style={{ height: '48px' }}
                />
              </div>

              {/* Type */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Type</label>
                <select value={tag} onChange={e => setTag(e.target.value)} style={{ height: '48px' }}>
                  {Tags.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Units + Avg Price */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Units</label>
                  <input
                    type="number" step="any" value={units}
                    onChange={e => setUnits(e.target.value)}
                    placeholder="0" required style={{ height: '48px', fontSize: '1rem', fontWeight: 600 }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Avg Price</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)',
                      fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', pointerEvents: 'none',
                    }}>₹</span>
                    <input
                      type="number" step="any" value={buyPrice}
                      onChange={e => setBuyPrice(e.target.value)}
                      placeholder="0.00" required
                      style={{ paddingLeft: '2rem', height: '48px', fontSize: '1rem', fontWeight: 600 }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={closeModal}
                  style={{ height: '48px', borderRadius: '12px', fontSize: '0.9375rem', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ height: '48px', borderRadius: '12px', fontSize: '0.9375rem', fontWeight: 600 }}
                >
                  Add to Portfolio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Holdings;
