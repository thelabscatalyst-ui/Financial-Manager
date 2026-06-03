import Holdings from '../components/Holdings';

const AllHoldings = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      <h2>All Holdings & Trading History</h2>
      <p className="text-sm text-muted mb-4">View your entire portfolio, including active investments and closed positions.</p>
      
      <div style={{ flex: 1 }}>
        <Holdings limit={0} showActions={true} />
      </div>
    </div>
  );
};

export default AllHoldings;
