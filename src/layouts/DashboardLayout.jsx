import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Receipt, Briefcase, Settings, LogOut, TrendingUp } from 'lucide-react';

const DashboardLayout = () => {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Expenses', path: '/expenses', icon: <Receipt size={20} /> },
    { name: 'Holdings', path: '/holdings', icon: <Briefcase size={20} /> },
  ];

  const bottomNavItems = [
    { name: 'Settings', path: '#', icon: <Settings size={20} /> },
    { name: 'Logout', path: '#', icon: <LogOut size={20} /> },
  ];

  return (
    <>
      {/* Animated Blobs */}
      <div className="blob-container">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <div style={{ display: 'flex', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        {/* Sidebar */}
        <aside style={{ 
          width: '240px', 
          display: 'flex',
          flexDirection: 'column',
          padding: '2rem 1.5rem',
          borderRight: '1px solid var(--panel-border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '3rem', paddingLeft: '0.5rem' }}>
            <div style={{ backgroundColor: 'var(--accent-primary)', padding: '0.5rem', borderRadius: '12px', color: 'white' }}>
              <TrendingUp size={20} />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.125rem', letterSpacing: '0' }}>AuraTrade</h2>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link 
                  key={item.path} 
                  to={item.path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '16px',
                    color: isActive ? 'white' : 'var(--text-secondary)',
                    backgroundColor: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    fontWeight: isActive ? 600 : 500,
                    transition: 'var(--transition)'
                  }}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
             {bottomNavItems.map((item) => (
                <Link 
                  key={item.name} 
                  to={item.path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '16px',
                    color: 'var(--text-secondary)',
                    fontWeight: 500,
                    transition: 'var(--transition)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
             ))}
          </nav>
        </aside>

        {/* Main Content */}
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
