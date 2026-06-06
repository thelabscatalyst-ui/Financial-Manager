import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';

const PortfolioContext = createContext();
export const usePortfolio = () => useContext(PortfolioContext);

const parseMoney = (value, fallback = 0) => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
};

const getHoldingPNL = (h) => {
  if (Number.isFinite(h.profitAndLoss)) return h.profitAndLoss;
  return (h.currentPrice - h.buyPrice) * h.units;
};

const fmt = (v) => typeof v === 'number'
  ? '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 2 })
  : String(v);

export const PortfolioProvider = ({ children }) => {
  const { user } = useAuth();

  const [wallet,   setWallet]   = useState({ cash: 0, online: 0, demat: 0 });
  const [expenses, setExpenses] = useState([]);
  const [holdings, setHoldings] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError,  setSyncError]  = useState(null);

  const saveReady  = useRef(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // ── Load from server whenever the logged-in user changes ────────────────────
  // CRITICAL: saveReady is ONLY enabled after a SUCCESSFUL load. If the load
  // fails for any reason, we keep retrying and DO NOT allow saves — otherwise
  // we'd overwrite the user's real data with empty state.

  useEffect(() => {
    if (!user) {
      // Disable saves immediately so any pending state change can't write to DB
      saveReady.current = false;
      setDataLoaded(false);
      // Reset for next user
      setWallet({ cash: 0, online: 0, demat: 0 });
      setExpenses([]);
      setHoldings([]);
      setAuditLog([]);
      return;
    }

    saveReady.current = false;
    setDataLoaded(false);

    let cancelled = false;
    let retryTimer = null;

    const load = async () => {
      try {
        const res = await fetch('/api/data');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;

        setWallet(data.wallet     ?? { cash: 0, online: 0, demat: 0 });
        setExpenses(data.expenses ?? []);
        setHoldings(data.holdings ?? []);
        setAuditLog(data.auditLog ?? []);

        // Enable saving only AFTER state has been applied
        requestAnimationFrame(() => {
          if (!cancelled) {
            saveReady.current = true;
            setDataLoaded(true);
          }
        });
      } catch (err) {
        console.warn('Data load failed, retrying in 2s:', err.message);
        if (!cancelled) retryTimer = setTimeout(load, 2000);
      }
    };

    load();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [user?.id]);

  // ── Auto-sync Angel One on every login ───────────────────────────────────────
  useEffect(() => {
    if (!dataLoaded) return;
    syncAngelOneHoldings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataLoaded]);

  // ── Save mechanism with flush + beforeunload guarantee ──────────────────────
  // Three layers ensure data is never lost:
  //   1. Debounced save (150ms) on every state change
  //   2. flushSave() force-flushes the pending timer
  //   3. beforeunload triggers sendBeacon as a final sync save

  const pendingTimer = useRef(null);
  const latestState  = useRef({ wallet, expenses, holdings, auditLog });

  // Keep latestState in sync with current state at all times
  useEffect(() => {
    latestState.current = { wallet, expenses, holdings, auditLog };
  }, [wallet, expenses, holdings, auditLog]);

  const doSave = useCallback(() => {
    if (!saveReady.current) return Promise.resolve();
    return fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(latestState.current),
      keepalive: true,   // lets save survive tab close
    }).catch(() => {});
  }, []);

  // flushSave: cancel debounce + send immediately. Awaitable.
  const flushSave = useCallback(async () => {
    if (pendingTimer.current) {
      clearTimeout(pendingTimer.current);
      pendingTimer.current = null;
    }
    await doSave();
  }, [doSave]);

  // Debounced save on any state change
  useEffect(() => {
    if (!saveReady.current) return;
    if (pendingTimer.current) clearTimeout(pendingTimer.current);
    pendingTimer.current = setTimeout(() => {
      pendingTimer.current = null;
      doSave();
    }, 150);
    return () => {
      if (pendingTimer.current) {
        clearTimeout(pendingTimer.current);
        pendingTimer.current = null;
      }
    };
  }, [wallet, expenses, holdings, auditLog, doSave]);

  // Flush on tab close / refresh — sendBeacon survives unload
  useEffect(() => {
    const flushOnUnload = () => {
      if (!saveReady.current) return;
      const payload = JSON.stringify(latestState.current);
      // Beacon is fire-and-forget; cookies are included automatically
      navigator.sendBeacon('/api/save', new Blob([payload], { type: 'application/json' }));
    };
    window.addEventListener('beforeunload', flushOnUnload);
    window.addEventListener('pagehide',     flushOnUnload);
    return () => {
      window.removeEventListener('beforeunload', flushOnUnload);
      window.removeEventListener('pagehide',     flushOnUnload);
    };
  }, []);

  // ── Audit ────────────────────────────────────────────────────────────────────

  const addAuditEntry = useCallback((type, description, data = {}) => {
    setAuditLog(prev => [{
      id: Date.now().toString(),
      type, description, data,
      timestamp: new Date().toISOString()
    }, ...prev]);
  }, []);

  // ── Wallet ───────────────────────────────────────────────────────────────────

  const addMoney = (mode, amount) => {
    if (mode === 'demat') return;
    const parsed = parseFloat(amount);
    setWallet(prev => ({ ...prev, [mode]: prev[mode] + parsed }));
    addAuditEntry('wallet_updated', `Added ${fmt(parsed)} to ${mode === 'cash' ? 'Cash' : 'Bank'}`, { mode, amount: fmt(parsed) });
  };

  const deductMoney = (mode, amount) => {
    if (mode === 'demat') return;
    setWallet(prev => ({ ...prev, [mode]: prev[mode] - parseFloat(amount) }));
  };

  // ── Expenses ─────────────────────────────────────────────────────────────────

  const addExpense = (expense) => {
    if (expense.mode === 'cash' || expense.mode === 'online') deductMoney(expense.mode, expense.amount);
    setExpenses(prev => [{
      ...expense,
      id: Date.now().toString(),
      date: new Date().toISOString()
    }, ...prev]);
    addAuditEntry('expense_added', `Expense: ${expense.description}`, { amount: fmt(expense.amount), via: expense.mode });
  };

  const markExpenseImportant = (id) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, important: !e.important } : e));
  };

  // ── Holdings ─────────────────────────────────────────────────────────────────

  const addHolding = (holding) => {
    setHoldings(prev => [{
      ...holding,
      units: parseFloat(holding.units),
      buyPrice: parseFloat(holding.buyPrice),
      currentPrice: parseFloat(holding.buyPrice),
      id: Date.now().toString(),
      status: 'active',
      date: new Date().toISOString()
    }, ...prev]);
    addAuditEntry('holding_added', `Added ${holding.assetName}`, {
      type: holding.tag,
      units: holding.units,
      'avg price': fmt(parseFloat(holding.buyPrice))
    });
  };

  const updateHoldingPrice = (id, newPrice) => {
    setHoldings(prev => prev.map(h => h.id === id ? { ...h, currentPrice: parseFloat(newPrice) } : h));
  };

  const closeHolding = (id) => {
    const h = holdings.find(h => h.id === id);
    if (!h || h.status === 'closed' || h.isSynced) return;
    setHoldings(prev => prev.map(h => h.id === id
      ? { ...h, status: 'closed', closeDate: new Date().toISOString() } : h
    ));
    addAuditEntry('holding_closed', `Closed position: ${h.assetName}`, { units: h.units });
  };

  const deleteHolding = (id) => {
    const h = holdings.find(h => h.id === id && h.status === 'closed');
    if (h) addAuditEntry('holding_deleted', `Removed ${h.assetName}`);
    setHoldings(prev => prev.filter(h => h.id !== id || h.status !== 'closed'));
  };

  // ── Angel One sync ───────────────────────────────────────────────────────────

  const syncAngelOneHoldings = useCallback(async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const response = await fetch('/api/portfolio');
      if (response.status === 401) return;

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.details
          ? `${result.error || 'Sync failed'}: ${result.details}`
          : result.error || 'Sync failed');
      }

      const angelHoldings = Array.isArray(result.data)
        ? result.data
        : result.data?.holdings?.holdings || result.data?.holdings || [];
      const rms = result.data?.rms || {};
      const syncedDematBalance = parseMoney(rms.availablecash ?? rms.net);

      setWallet(prev => ({ ...prev, demat: syncedDematBalance }));

      if (Array.isArray(angelHoldings)) {
        const newHoldings = angelHoldings.map(h => ({
          id: `angel_${h.isin || h.tradingsymbol || h.symboltoken || Date.now()}`,
          assetName: h.tradingsymbol || 'Unknown',
          tag: 'Equity',
          units: parseMoney(h.quantity || h.holdingsquantity),
          buyPrice: parseMoney(h.averageprice || h.averagePrice),
          currentPrice: parseMoney(h.ltp || h.close || h.averageprice || h.averagePrice),
          profitAndLoss: parseMoney(h.profitandloss),
          status: 'active',
          date: new Date().toISOString(),
          isSynced: true
        }));

        const syncedIds = new Set(newHoldings.map(h => h.id));
        setHoldings(prev => {
          const local    = prev.filter(h => !h.isSynced);
          const exited   = prev
            .filter(h => h.isSynced && h.status === 'active' && !syncedIds.has(h.id))
            .map(h => ({ ...h, status: 'closed', closeDate: new Date().toISOString(), brokerClosed: true }));
          const prevClosed = prev.filter(h => h.isSynced && h.status === 'closed' && !syncedIds.has(h.id));
          return [...newHoldings, ...exited, ...prevClosed, ...local];
        });

        addAuditEntry('angel_synced', `Synced ${newHoldings.length} holdings from Angel One`, {
          holdings: newHoldings.length,
          'demat balance': fmt(syncedDematBalance)
        });
      }
    } catch (err) {
      console.error('Sync Error:', err);
      setSyncError(err.message);
    } finally {
      setIsSyncing(false);
    }
  }, [addAuditEntry]);

  // Auto-sync every hour
  useEffect(() => {
    const t = setInterval(syncAngelOneHoldings, 60 * 60 * 1000);
    return () => clearInterval(t);
  }, [syncAngelOneHoldings]);

  // ── Derived values ───────────────────────────────────────────────────────────

  const totalPNL      = holdings.filter(h => h.status === 'active').reduce((a, h) => a + getHoldingPNL(h), 0);
  const liquidMoney   = wallet.cash + wallet.online;
  const investedMoney = holdings.filter(h => h.status === 'active').reduce((a, h) => a + h.currentPrice * h.units, 0);
  const totalMoney    = liquidMoney + wallet.demat + investedMoney;

  return (
    <PortfolioContext.Provider value={{
      wallet, expenses, holdings, auditLog,
      addMoney, addExpense, markExpenseImportant,
      addHolding, updateHoldingPrice, closeHolding, deleteHolding,
      totalPNL, liquidMoney, investedMoney, totalMoney,
      syncAngelOneHoldings, isSyncing, syncError,
      flushSave
    }}>
      {children}
    </PortfolioContext.Provider>
  );
};
