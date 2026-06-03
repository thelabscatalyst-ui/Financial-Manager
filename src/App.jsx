import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import AllExpenses from './pages/AllExpenses';
import AllHoldings from './pages/AllHoldings';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="expenses" element={<AllExpenses />} />
          <Route path="holdings" element={<AllHoldings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
