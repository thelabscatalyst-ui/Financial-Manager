import { usePortfolio } from '../context/PortfolioContext';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Unified palette — same colours across both charts
const CHART_COLORS = ['#60A5FA', '#818CF8', '#A78BFA', '#38BDF8', '#93C5FD', '#C4B5FD'];
const ALLOC_COLORS = CHART_COLORS;
const SPLIT_COLORS = CHART_COLORS;

const CATEGORY_MAP = {
  'Equity':       'Equity',
  'Stocks':       'Equity',
  'Mutual Fund':  'Mutual Funds',
  'ETF':          'ETF',
  'Gold':         'Others',
  'Crypto':       'Others',
  'Commodity':    'Others',
  'Other':        'Others',
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(11,18,32,0.96)', border: '1px solid rgba(255,255,255,0.08)',
      padding: '10px 14px', borderRadius: '10px', boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
    }}>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>{payload[0].name}</p>
      <p style={{ fontSize: '0.875rem', fontWeight: 700 }}>
        ₹{payload[0].value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
      </p>
    </div>
  );
};

const renderLegend = ({ payload }) => {
  const total = payload.reduce((a, e) => a + e.payload.value, 0);
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {payload.map((entry, i) => {
        const pct = total > 0 ? ((entry.payload.value / total) * 100).toFixed(1) : 0;
        return (
          <li key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8125rem', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
              <span style={{ color: 'var(--text-secondary)' }}>{entry.value}</span>
            </div>
            <span style={{ fontWeight: 700 }}>{pct}%</span>
          </li>
        );
      })}
    </ul>
  );
};

const EmptyState = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>No data available</p>
  </div>
);

const DonutCard = ({ title, data, colors }) => (
  <div className="panel flex flex-col" style={{ minHeight: '300px' }}>
    <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem', fontWeight: 600 }}>{title}</h3>
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', margin: '0 -24px' }}>
      {data.length === 0 ? <EmptyState /> : (
        <ResponsiveContainer width="100%" height={190}>
          <PieChart margin={{ top: 0, right: 40, bottom: 0, left: 40 }}>
            <Pie data={data} cx="35%" cy="50%"
              innerRadius={58} outerRadius={78}
              paddingAngle={3} dataKey="value" stroke="none"
              isAnimationActive={false}
            >
              {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={renderLegend} layout="vertical" verticalAlign="middle" align="right" />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  </div>
);

const Charts = () => {
  const { holdings, wallet, liquidMoney, investedMoney } = usePortfolio();
  const active = holdings.filter(h => h.status === 'active');

  // Wealth Allocation: Liquid vs Invested
  const allocData = [
    { name: 'Liquid Assets',    value: liquidMoney },
    { name: 'Invested Assets',  value: wallet.demat + investedMoney },
  ].filter(d => d.value > 0);

  // Wealth Split: by category (equity / mutual funds / others / demat cash)
  const splitMap = new Map();
  active.forEach(h => {
    const cat = CATEGORY_MAP[h.tag] ?? 'Others';
    splitMap.set(cat, (splitMap.get(cat) ?? 0) + h.currentPrice * h.units);
  });
  if (wallet.demat > 0) splitMap.set('Demat Cash', wallet.demat);

  const splitData = [];
  splitMap.forEach((value, name) => splitData.push({ name, value }));
  splitData.sort((a, b) => b.value - a.value);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
      <DonutCard title="Wealth Allocation" data={allocData}  colors={ALLOC_COLORS} />
      <DonutCard title="Wealth Split"      data={splitData}  colors={SPLIT_COLORS} />
    </div>
  );
};

export default Charts;
