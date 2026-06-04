import { useState } from 'react';
import { Plus } from 'lucide-react';
import TotalMoney from '../components/TotalMoney';
import Wallet    from '../components/Wallet';
import Expenses  from '../components/Expenses';
import Holdings  from '../components/Holdings';
import Charts    from '../components/Charts';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const Dashboard = () => {
  const [showFunds, setShowFunds] = useState(false);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px', paddingBottom: '2rem' }}>

      {/* Header */}
      <div style={{ gridColumn: 'span 12', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {getGreeting()} Meher,
        </h1>
        <button className="btn btn-primary" onClick={() => setShowFunds(true)}>
          <Plus size={15} /> Add Funds
        </button>
      </div>

      {/* Row 1: Net Worth + 3 wallet cards */}
      <div style={{ gridColumn: 'span 3' }}>
        <TotalMoney />
      </div>
      <div style={{ gridColumn: 'span 9', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        <Wallet showModal={showFunds} onModalChange={setShowFunds} />
      </div>

      {/* Row 2: Charts */}
      <div style={{ gridColumn: 'span 12' }}>
        <Charts />
      </div>

      {/* Row 3: Expenses + Holdings */}
      <div style={{ gridColumn: 'span 5', display: 'flex', flexDirection: 'column' }}>
        <Expenses limit={5} />
      </div>
      <div style={{ gridColumn: 'span 7', display: 'flex', flexDirection: 'column' }}>
        <Holdings limit={5} />
      </div>

    </div>
  );
};

export default Dashboard;
