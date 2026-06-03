import { usePortfolio } from '../context/PortfolioContext';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#3B82F6', '#60A5FA', '#93C5FD', '#1D4ED8', '#BFDBFE', '#2563EB'];

const Charts = () => {
  const { holdings, wallet, liquidMoney, investedMoney } = usePortfolio();

  const activeHoldings = holdings.filter(h => h.status === 'active');
  const dematDataMap = new Map();
  activeHoldings.forEach(h => {
    const value = h.currentPrice * h.units;
    dematDataMap.set(h.tag, (dematDataMap.get(h.tag) || 0) + value);
  });

  const dematChartData = [];
  if (wallet.demat > 0) dematChartData.push({ name: 'Cash', value: wallet.demat });
  dematDataMap.forEach((value, key) => dematChartData.push({ name: key, value }));

  const wealthData = [
    { name: 'Liquid (Cash + Bank)', value: liquidMoney },
    { name: 'Invested (Demat + Assets)', value: investedMoney + wallet.demat }
  ].filter(d => d.value > 0);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: '#0B1220', border: '1px solid rgba(255,255,255,0.06)',
        padding: '12px 16px', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
      }}>
        <p className="text-sm text-secondary mb-1">{payload[0].name}</p>
        <p className="font-bold text-primary">
          ₹{payload[0].value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
        </p>
      </div>
    );
  };

  const renderLegend = ({ payload }) => {
    const total = payload.reduce((acc, e) => acc + e.payload.value, 0);
    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {payload.map((entry, i) => {
          const pct = total > 0 ? ((entry.payload.value / total) * 100).toFixed(1) : 0;
          return (
            <li key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: entry.color }} />
                <span className="text-secondary">{entry.value}</span>
              </div>
              <span className="font-bold text-primary">{pct}%</span>
            </li>
          );
        })}
      </ul>
    );
  };

  const EmptyState = () => (
    <div className="w-full text-center text-secondary text-sm">No data available</div>
  );

  const ChartPanel = ({ title, data }) => (
    <div className="panel flex flex-col" style={{ minHeight: '340px' }}>
      <h3 className="mb-6">{title}</h3>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', margin: '0 -24px' }}>
        {data.length === 0 ? <EmptyState /> : (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart margin={{ top: 0, right: 40, bottom: 0, left: 40 }}>
              <Pie data={data} cx="30%" cy="50%" innerRadius={65} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none">
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={renderLegend} layout="vertical" verticalAlign="middle" align="right" />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
      <ChartPanel title="Wealth Allocation" data={dematChartData} />
      <ChartPanel title="Wealth Split" data={wealthData} />
    </div>
  );
};

export default Charts;
