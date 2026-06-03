import { useState } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import { MoreVertical, Plus, Power, Trash2, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const Tags = ['ETF', 'Stocks', 'Gold', 'Equity', 'Crypto', 'Commodity', 'Mutual Fund', 'Other'];

const Holdings = ({ limit = 5, showActions = true }) => {
  const {
    holdings,
    addHolding,
    updateHoldingPrice,
    closeHolding,
    deleteHolding,
    syncAngelOneHoldings,
    isSyncing,
    syncError
  } = usePortfolio();
  const [showModal, setShowModal] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  
  // Form state
  const [assetName, setAssetName] = useState('');
  const [tag, setTag] = useState(Tags[0]);
  const [units, setUnits] = useState('');
  const [buyPrice, setBuyPrice] = useState('');

  const [editPriceId, setEditPriceId] = useState(null);
  const [tempPrice, setTempPrice] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    if (!assetName || !units || !buyPrice) return;
    
    addHolding({
      assetName,
      tag,
      units: parseFloat(units),
      buyPrice: parseFloat(buyPrice)
    });
    
    setAssetName('');
    setUnits('');
    setBuyPrice('');
    setTag(Tags[0]);
    setShowModal(false);
  };

  const savePrice = (id) => {
    if (tempPrice && !isNaN(tempPrice)) {
      updateHoldingPrice(id, parseFloat(tempPrice));
    }
    setEditPriceId(null);
  };

  const handleCloseHolding = (id) => {
    closeHolding(id);
    setOpenMenuId(null);
  };

  const handleDeleteHolding = (id) => {
    deleteHolding(id);
    setOpenMenuId(null);
  };

  const displayHoldings = limit ? holdings.slice(0, limit) : holdings;

  return (
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
              {isSyncing ? 'Syncing...' : 'Sync Angel One'}
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
        <div className="mb-4 text-sm text-loss p-3 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
          Sync Error: {syncError} (Check your .env credentials)
        </div>
      )}

      <div className="table-container" style={{ flex: 1, margin: '0 -10px' }}>
        {displayHoldings.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
             <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                <th style={{ textAlign: 'right', paddingRight: '10px' }}></th>
              </tr>
            </thead>
            <tbody>
              {displayHoldings.map(h => {
                const isClosed = h.status === 'closed';
                const pnl = Number.isFinite(h.profitAndLoss)
                  ? h.profitAndLoss
                  : (h.currentPrice - h.buyPrice) * h.units;
                const pnlPercent = h.buyPrice > 0 ? ((h.currentPrice - h.buyPrice) / h.buyPrice) * 100 : 0;
                const canEditPrice = !isClosed && !h.isSynced;
                const canEndHolding = !isClosed && !h.isSynced;
                const canDeleteHolding = isClosed;
                const hasActions = showActions && (canEndHolding || canDeleteHolding);
                
                return (
                  <tr key={h.id} style={{ opacity: isClosed ? 0.4 : 1 }}>
                    <td style={{ paddingLeft: '10px' }} className="font-bold">{h.assetName}</td>
                    <td>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '6px', 
                        fontSize: '0.75rem', 
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        color: 'var(--text-secondary)'
                      }}>
                        {h.tag}
                      </span>
                    </td>
                    <td>{h.units}</td>
                    <td>₹{h.buyPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                    
                    <td>
                      {editPriceId === h.id ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            style={{ width: '80px', padding: '6px' }} 
                            value={tempPrice}
                            onChange={e => setTempPrice(e.target.value)}
                            onBlur={() => savePrice(h.id)}
                            onKeyDown={e => e.key === 'Enter' && savePrice(h.id)}
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div 
                          style={{
                            cursor: canEditPrice ? 'pointer' : 'default',
                            borderBottom: canEditPrice ? '1px dashed var(--text-secondary)' : 'none',
                            display: 'inline-block'
                          }}
                          onClick={() => {
                            if (canEditPrice) {
                              setEditPriceId(h.id);
                              setTempPrice(h.currentPrice);
                            }
                          }}
                        >
                          ₹{h.currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </div>
                      )}
                    </td>
                    
                    <td className={pnl >= 0 ? 'text-profit font-bold' : 'text-loss font-bold'}>
                        {pnl > 0 ? '+' : ''}₹{Math.abs(pnl).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        <span style={{ fontSize: '0.75rem', fontWeight: '500', color: pnl >= 0 ? 'var(--profit-green)' : 'var(--loss-red)', marginLeft: '4px', opacity: 0.8 }}>
                          ({pnlPercent > 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
                        </span>
                    </td>
                    
                    <td style={{ textAlign: 'right', paddingRight: '10px', position: 'relative' }}>
                      {hasActions && (
                        <button 
                          className="btn-icon-only"
                          title="Holding actions"
                          onClick={() => setOpenMenuId(openMenuId === h.id ? null : h.id)}
                        >
                          <MoreVertical size={16} />
                        </button>
                      )}
                      {openMenuId === h.id && (
                        <div className="action-menu">
                          {canEndHolding && (
                            <button type="button" onClick={() => handleCloseHolding(h.id)}>
                              <Power size={14} />
                              <span>End Holding</span>
                            </button>
                          )}
                          {canDeleteHolding && (
                            <button type="button" className="danger" onClick={() => handleDeleteHolding(h.id)}>
                              <Trash2 size={14} />
                              <span>Delete Holding</span>
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
           <button className="btn btn-outline text-sm" onClick={() => setShowModal(true)}>Add Asset</button>
         </div>
      )}

      {/* Add Holding Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(5, 8, 22, 0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="panel" style={{ width: '100%', maxWidth: '400px' }}>
            <div className="flex justify-between items-center mb-6">
               <h3 className="m-0">Add Asset</h3>
               <button className="btn-icon-only" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAdd} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-secondary">Asset Name</label>
                <input type="text" value={assetName} onChange={(e) => setAssetName(e.target.value)} placeholder="e.g. GoldBees" required />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-secondary">Type</label>
                <select value={tag} onChange={(e) => setTag(e.target.value)}>
                  {Tags.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex gap-4">
                <div className="flex flex-col gap-2" style={{ flex: 1 }}>
                  <label className="text-sm font-medium text-secondary">Units</label>
                  <input type="number" step="any" value={units} onChange={(e) => setUnits(e.target.value)} placeholder="0" required />
                </div>
                <div className="flex flex-col gap-2" style={{ flex: 1 }}>
                  <label className="text-sm font-medium text-secondary">Avg Price (₹)</label>
                  <input type="number" step="any" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} placeholder="0.00" required />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button type="submit" className="btn btn-primary w-full" style={{ width: '100%' }}>Add to Portfolio</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Holdings;
