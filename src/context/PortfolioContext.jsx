import { createContext, useContext, useState, useEffect, useCallback } from 'react';

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
  const [wallet, setWallet] = useState(() => {
    const s = localStorage.getItem('portfolio_wallet');
    return s ? JSON.parse(s) : { cash: 0, online: 0, demat: 0 };
  });

  const [expenses, setExpenses] = useState(() => {
    const s = localStorage.getItem('portfolio_expenses');
    return s ? JSON.parse(s) : [];
  });

  const [holdings, setHoldings] = useState(() => {
    const s = localStorage.getItem('portfolio_holdings');
    return s ? JSON.parse(s) : [];
  });

  const [auditLog, setAuditLog] = useState(() => {
    const s = localStorage.getItem('portfolio_audit');
    return s ? JSON.parse(s) : [];
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);

  // ── Persistence ──────────────────────────────────────────────────────────────

  useEffect(() => {
    localStorage.setItem('portfolio_wallet', JSON.stringify(wallet));
  }, [wallet]);

  useEffect(() => {
    const fiveMonthsAgo = new Date();
    fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);
    const purged = expenses.filter(e => e.important || new Date(e.date) >= fiveMonthsAgo);
    if (purged.length !== expenses.length) {
      setExpenses(purged);
    } else {
      localStorage.setItem('portfolio_expenses', JSON.stringify(expenses));
    }
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('portfolio_holdings', JSON.stringify(holdings));
  }, [holdings]);

  useEffect(() => {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const purged = auditLog.filter(e => new Date(e.timestamp) >= threeMonthsAgo);
    if (purged.length !== auditLog.length) {
      setAuditLog(purged);
    } else {
      localStorage.setItem('portfolio_audit', JSON.stringify(auditLog));
    }
  }, [auditLog]);

  // ── Audit ────────────────────────────────────────────────────────────────────

  const addAuditEntry = useCallback((type, description, data = {}) => {
    setAuditLog(prev => [{
      id: Date.now().toString(),
      type,
      description,
      data,
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
      ? { ...h, status: 'closed', closeDate: new Date().toISOString() }
      : h
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
      if (response.status === 401) return; // silently skip if not authed

      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result.details ? `${result.error || 'Sync failed'}: ${result.details}` : result.error || 'Sync failed'
        );
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
          assetName: h.tradingsymbol || 'Unknown Asset',
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
          const local = prev.filter(h => !h.isSynced);
          const exited = prev
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
    const interval = setInterval(syncAngelOneHoldings, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [syncAngelOneHoldings]);

  // ── Derived values ───────────────────────────────────────────────────────────

  const totalPNL = holdings.filter(h => h.status === 'active').reduce((acc, h) => acc + getHoldingPNL(h), 0);
  const liquidMoney = wallet.cash + wallet.online;
  const investedMoney = holdings.filter(h => h.status === 'active').reduce((acc, h) => acc + h.currentPrice * h.units, 0);
  const totalMoney = liquidMoney + wallet.demat + totalPNL;

  return (
    <PortfolioContext.Provider value={{
      wallet, expenses, holdings, auditLog,
      addMoney, addExpense, markExpenseImportant,
      addHolding, updateHoldingPrice, closeHolding, deleteHolding,
      totalPNL, liquidMoney, investedMoney, totalMoney,
      syncAngelOneHoldings, isSyncing, syncError
    }}>
      {children}
    </PortfolioContext.Provider>
  );
};
