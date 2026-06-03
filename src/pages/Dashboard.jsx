import TotalMoney from '../components/TotalMoney';
import Wallet from '../components/Wallet';
import Expenses from '../components/Expenses';
import Holdings from '../components/Holdings';
import Charts from '../components/Charts';

const Dashboard = () => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px', paddingBottom: '2rem' }}>
      
      {/* Top Header / Actions - optional, keeping it clean for now */}
      <div style={{ gridColumn: 'span 12', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Dashboard</h1>
      </div>

      {/* Row 1: Net Worth (4 cols) and 3 Wallet Cards (8 cols total, maybe better 4/4/4 or let Wallet component handle it inside 8 cols) */}
      <div style={{ gridColumn: 'span 4' }}>
        <TotalMoney />
      </div>
      
      <div style={{ gridColumn: 'span 8', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        <Wallet />
      </div>

      {/* Row 2: Charts */}
      <div style={{ gridColumn: 'span 12' }}>
         <Charts />
      </div>

      {/* Row 3: Expenses and Holdings */}
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
