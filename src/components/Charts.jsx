import { usePortfolio } from '../context/PortfolioContext';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Strict color palette as requested
const COLORS = ['#3B82F6', '#10B981', '#6366F1', 'rgba(255,255,255,0.15)'];

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
  dematDataMap.forEach((value, key) => {
    dematChartData.push({ name: key, value });
  });

  const wealthData = [
    { name: 'Liquid (Cash + Bank)', value: liquidMoney },
    { name: 'Invested (Demat + Assets)', value: investedMoney + wallet.demat }
  ].filter(d => d.value > 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
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
    }
    return null;
  };

  const renderLegend = (props) => {
    const { payload } = props;
    const total = payload.reduce((acc, entry) => acc + entry.payload.value, 0);

    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {payload.map((entry, index) => {
          const percentage = total > 0 ? ((entry.payload.value / total) * 100).toFixed(1) : 0;
          return (
            <li key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: entry.color }}></span>
                <span className="text-secondary">{entry.value}</span>
              </div>
              <span className="font-bold text-primary">{percentage}%</span>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
      
      {/* Wealth Allocation Chart */}
      <div className="panel flex flex-col" style={{ minHeight: '340px' }}>
        <h3 className="mb-6">Wealth Allocation</h3>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', margin: '0 -24px' }}>
          {dematChartData.length === 0 ? (
             <div className="w-full text-center text-secondary text-sm">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart margin={{ top: 0, right: 40, bottom: 0, left: 40 }}>
                <Pie
                  data={dematChartData}
                  cx="30%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {dematChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend content={renderLegend} layout="vertical" verticalAlign="middle" align="right" />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Wealth Split Chart */}
      <div className="panel flex flex-col" style={{ minHeight: '340px' }}>
        <h3 className="mb-6">Wealth Split</h3>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', margin: '0 -24px' }}>
          {wealthData.length === 0 ? (
            <div className="w-full text-center text-secondary text-sm">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart margin={{ top: 0, right: 40, bottom: 0, left: 40 }}>
                <Pie
                  data={wealthData}
                  cx="30%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {wealthData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend content={renderLegend} layout="vertical" verticalAlign="middle" align="right" />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

    </div>
  );
};

export default Charts;
