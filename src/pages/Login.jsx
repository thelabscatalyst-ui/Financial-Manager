import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BarChart3 } from 'lucide-react';

const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="blob-container">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        position: 'relative',
        zIndex: 1
      }}>
        <div className="panel" style={{ width: '100%', maxWidth: '380px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: 'var(--accent-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
            }}>
              <BarChart3 size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Finance</h2>
              <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '1px' }}>Personal wealth dashboard</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="text-sm font-medium text-secondary">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="text-sm font-medium text-secondary">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--loss-red)', margin: 0 }}>{error}</p>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.25rem' }}
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-muted text-sm" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            Default: <code style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>admin / admin123</code>
          </p>
        </div>
      </div>
    </>
  );
};

export default Login;
