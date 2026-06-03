import { createContext, useContext, useState, useEffect } from 'react';

const PortfolioContext = createContext();

export const usePortfolio = () => useContext(PortfolioContext);

const parseMoney = (value, fallback = 0) => {
  const number = parseFloat(value);
  return Number.isFinite(number) ? number : fallback;
};

const getHoldingPNL = (holding) => {
  if (Number.isFinite(holding.profitAndLoss)) {
    return holding.profitAndLoss;
  }

  return (holding.currentPrice - holding.buyPrice) * holding.units;
};

export const PortfolioProvider = ({ children }) => {
  const [wallet, setWallet] = useState(() => {
    const saved = localStorage.getItem('portfolio_wallet');
    return saved ? JSON.parse(saved) : { cash: 0, online: 0, demat: 0 };
  });

  const [expenses, setExpenses] = useState(() => {
    const saved = localStorage.getItem('portfolio_expenses');
    return saved ? JSON.parse(saved) : [];
  });

  const [holdings, setHoldings] = useState(() => {
    const saved = localStorage.getItem('portfolio_holdings');
    return saved ? JSON.parse(saved) : [];
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);

  useEffect(() => {
    localStorage.setItem('portfolio_wallet', JSON.stringify(wallet));
  }, [wallet]);

  useEffect(() => {
    const fiveMonthsAgo = new Date();
    fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);
    
    const purgedExpenses = expenses.filter(exp => {
      if (exp.important) return true;
      const expDate = new Date(exp.date);
      return expDate >= fiveMonthsAgo;
    });

    if (purgedExpenses.length !== expenses.length) {
       setExpenses(purgedExpenses);
    } else {
       localStorage.setItem('portfolio_expenses', JSON.stringify(expenses));
    }
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('portfolio_holdings', JSON.stringify(holdings));
  }, [holdings]);

  const addMoney = (mode, amount) => {
    if (mode === 'demat') return;
    setWallet(prev => ({ ...prev, [mode]: prev[mode] + parseFloat(amount) }));
  };
  
  const deductMoney = (mode, amount) => {
    if (mode === 'demat') return;
    setWallet(prev => ({ ...prev, [mode]: prev[mode] - parseFloat(amount) }));
  };

  const addExpense = (expense) => {
    if (expense.mode === 'cash' || expense.mode === 'online') {
       deductMoney(expense.mode, expense.amount);
    }
    setExpenses(prev => [{ ...expense, id: Date.now().toString(), date: new Date().toISOString() }, ...prev]);
  };

  const markExpenseImportant = (id) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, important: !e.important } : e));
  };

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
  };

  const updateHoldingPrice = (id, newPrice) => {
    setHoldings(prev => prev.map(h => h.id === id ? { ...h, currentPrice: parseFloat(newPrice) } : h));
  };

  const closeHolding = (id) => {
    const holding = holdings.find(h => h.id === id);

    if (!holding || holding.status === 'closed' || holding.isSynced) return;

    setHoldings(prev => prev.map(h => h.id === id
      ? {
          ...h,
          status: 'closed',
          closeDate: new Date().toISOString()
        }
      : h
    ));
  };

  const deleteHolding = (id) => {
    setHoldings(prev => prev.filter(h => h.id !== id || h.status !== 'closed'));
  };

  const totalPNL = holdings
     .filter(h => h.status === 'active')
     .reduce((acc, h) => acc + getHoldingPNL(h), 0);

  const liquidMoney = wallet.cash + wallet.online;
  const investedMoney = holdings
     .filter(h => h.status === 'active')
     .reduce((acc, h) => acc + (h.currentPrice * h.units), 0);
  
  const totalMoney = liquidMoney + wallet.demat + totalPNL;

  const syncAngelOneHoldings = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const response = await fetch('/api/portfolio');
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(
          result.details
            ? `${result.error || 'Failed to sync with Angel One'}: ${result.details}`
            : result.error || 'Failed to sync with Angel One'
        );
      }

      const angelHoldings = Array.isArray(result.data)
        ? result.data
        : result.data?.holdings?.holdings || result.data?.holdings || [];
      const rms = result.data?.rms || {};
      const syncedDematBalance = parseMoney(rms.availablecash ?? rms.net);

      setWallet(prev => ({
        ...prev,
        demat: syncedDematBalance
      }));
      
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
           const localHoldings = prev.filter(h => !h.isSynced);
           const exitedSyncedHoldings = prev
             .filter(h => h.isSynced && h.status === 'active' && !syncedIds.has(h.id))
             .map(h => ({
               ...h,
               status: 'closed',
               closeDate: new Date().toISOString(),
               brokerClosed: true
             }));
           const previousClosedSyncedHoldings = prev
             .filter(h => h.isSynced && h.status === 'closed' && !syncedIds.has(h.id));

           return [
             ...newHoldings,
             ...exitedSyncedHoldings,
             ...previousClosedSyncedHoldings,
             ...localHoldings
           ];
        });
      }
    } catch (err) {
      console.error("Sync Error:", err);
      setSyncError(err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const value = {
    wallet,
    expenses,
    holdings,
    addMoney,
    addExpense,
    markExpenseImportant,
    addHolding,
    updateHoldingPrice,
    closeHolding,
    deleteHolding,
    totalPNL,
    liquidMoney,
    investedMoney,
    totalMoney,
    syncAngelOneHoldings,
    isSyncing,
    syncError
  };

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
};
