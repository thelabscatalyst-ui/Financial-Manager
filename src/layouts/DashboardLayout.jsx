import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Receipt, Briefcase, ScrollText, Settings, LogOut, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { name: 'Dashboard', path: '/',         icon: LayoutDashboard },
  { name: 'Holdings',  path: '/holdings', icon: Briefcase },
  { name: 'Expenses',  path: '/expenses', icon: Receipt },
  { name: 'Audits',    path: '/audits',   icon: ScrollText },
];

const DockItem = ({ to, icon: Icon, label, active, onClick }) => {
  const content = (
    <>
      <Icon size={20} />
      <span className="dock-tooltip">{label}</span>
    </>
  );

  if (onClick) {
    return (
      <button className={`dock-item${active ? ' active' : ''}`} onClick={onClick} title={label}>
        {content}
      </button>
    );
  }

  return (
    <Link className={`dock-item${active ? ' active' : ''}`} to={to} title={label}>
      {content}
    </Link>
  );
};

const DashboardLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <div className="blob-container">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      {/* Dock */}
      <aside className="dock">
        <div className="dock-logo">
          <BarChart3 size={18} />
        </div>

        <nav className="dock-nav">
          {navItems.map(item => (
            <DockItem
              key={item.path}
              to={item.path}
              icon={item.icon}
              label={item.name}
              active={location.pathname === item.path}
            />
          ))}
        </nav>

        <div className="dock-bottom">
          <DockItem
            to="/settings"
            icon={Settings}
            label="Settings"
            active={location.pathname === '/settings'}
          />
          <DockItem
            icon={LogOut}
            label="Logout"
            onClick={handleLogout}
          />
        </div>
      </aside>

      {/* Main content */}
      <main style={{ marginLeft: '68px', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '2rem 2.5rem' }}>
          <Outlet />
        </div>
      </main>
    </>
  );
};

export default DashboardLayout;
