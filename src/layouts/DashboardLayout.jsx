import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Receipt, Briefcase, ScrollText, Settings, LogOut, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePortfolio } from '../context/PortfolioContext';

const NAV = [
  { name: 'Dashboard', path: '/',         icon: LayoutDashboard },
  { name: 'Holdings',  path: '/holdings', icon: Briefcase },
  { name: 'Expenses',  path: '/expenses', icon: Receipt },
  { name: 'Audits',    path: '/audits',   icon: ScrollText },
];

const NavItem = ({ to, icon: Icon, label, active }) => (
  <Link
    to={to}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.625rem',
      padding: '0.6rem 0.875rem',
      borderRadius: '10px',
      fontSize: '0.875rem',
      fontWeight: active ? 600 : 500,
      color: active ? 'white' : 'var(--text-secondary)',
      background: active ? 'rgba(59,130,246,0.15)' : 'transparent',
      boxShadow: active
        ? '0 0 0 1px rgba(59,130,246,0.2), 0 4px 20px rgba(59,130,246,0.08)'
        : 'none',
      textDecoration: 'none',
      transition: 'all 0.15s ease',
    }}
    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
  >
    <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
    {label}
  </Link>
);

const DashboardLayout = () => {
  const location = useLocation();
  const navigate  = useNavigate();
  const { logout }    = useAuth();
  const { flushSave } = usePortfolio();

  const handleLogout = async () => {
    // CRITICAL: flush any pending save BEFORE clearing the auth cookie.
    // Otherwise pending changes get sent without auth and silently dropped.
    await flushSave();
    await logout();
    navigate('/login', { replace: true });
  };

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <>
      <div className="blob-container">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
        <div className="blob blob-4" />
        <div className="blob blob-5" />
        <div className="blob blob-6" />
      </div>

      <div style={{ display: 'flex', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        {/* ── Sidebar ─────────────────────────────────────────── */}
        <aside style={{
          width: '240px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem 1rem',
          borderRight: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(5, 8, 22, 0.6)',
          backdropFilter: 'blur(32px) saturate(160%)',
          WebkitBackdropFilter: 'blur(32px) saturate(160%)',
        }}>

          {/* Logo */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.625rem',
            padding: '0.25rem 0.875rem', marginBottom: '2rem',
          }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '9px',
              background: 'var(--accent-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', flexShrink: 0,
              boxShadow: '0 4px 14px rgba(59,130,246,0.35)',
            }}>
              <BarChart3 size={17} />
            </div>
            <span style={{ fontWeight: 700, fontSize: '0.9375rem', letterSpacing: '-0.01em' }}>Finance</span>
          </div>

          {/* Navigation */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
            {NAV.map(item => (
              <NavItem
                key={item.path}
                to={item.path}
                icon={item.icon}
                label={item.name}
                active={isActive(item.path)}
              />
            ))}
          </nav>

          {/* Divider */}
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0.75rem 0.875rem' }} />

          {/* Bottom */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <NavItem
              to="/settings"
              icon={Settings}
              label="Settings"
              active={isActive('/settings')}
            />
            <button
              onClick={handleLogout}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                padding: '0.6rem 0.875rem', borderRadius: '10px',
                fontSize: '0.875rem', fontWeight: 500,
                color: 'var(--text-secondary)', background: 'transparent',
                border: 'none', cursor: 'pointer', width: '100%',
                textAlign: 'left', transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = 'var(--loss-red)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <LogOut size={16} strokeWidth={1.8} />
              Logout
            </button>
          </div>
        </aside>

        {/* ── Main content ────────────────────────────────────── */}
        <main style={{ flex: 1, height: '100vh', overflowY: 'auto' }}>
          <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '2rem 2.5rem' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </>
  );
};

export default DashboardLayout;
