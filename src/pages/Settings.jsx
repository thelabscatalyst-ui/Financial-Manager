import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePortfolio } from '../context/PortfolioContext';
import { ShieldCheck, RefreshCw, User } from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();
  const { syncAngelOneHoldings, isSyncing, syncError } = usePortfolio();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const [syncSuccess, setSyncSuccess] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (newPassword !== confirmPassword) return setPwError('New passwords do not match');
    if (newPassword.length < 6) return setPwError('Password must be at least 6 characters');

    setPwLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPwSuccess('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwLoading(false);
    }
  };

  const handleTestSync = async () => {
    setSyncSuccess(false);
    await syncAngelOneHoldings();
    if (!syncError) setSyncSuccess(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '520px' }}>
      <h2>Settings</h2>

      {/* Account */}
      <div className="panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'rgba(59, 130, 246, 0.12)', color: 'var(--accent-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <User size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0 }}>Account</h3>
            <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '2px' }}>
              Signed in as <strong style={{ color: 'var(--text-secondary)' }}>{user?.username}</strong>
            </p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Change Password</h4>

          {pwError && <p style={{ fontSize: '0.8125rem', color: 'var(--loss-red)' }}>{pwError}</p>}
          {pwSuccess && <p style={{ fontSize: '0.8125rem', color: 'var(--accent-primary)' }}>{pwSuccess}</p>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label className="text-sm text-secondary">Current Password</label>
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label className="text-sm text-secondary">New Password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label className="text-sm text-secondary">Confirm New Password</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={pwLoading} style={{ alignSelf: 'flex-start' }}>
            {pwLoading ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Angel One */}
      <div className="panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'rgba(59, 130, 246, 0.12)', color: 'var(--accent-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <ShieldCheck size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0 }}>Angel One Connection</h3>
            <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '2px' }}>
              Auto-syncs every hour while the app is open
            </p>
          </div>
        </div>

        {syncError && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--loss-red)', marginBottom: '1rem' }}>
            Last sync failed: {syncError}
          </p>
        )}
        {syncSuccess && !syncError && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--accent-primary)', marginBottom: '1rem' }}>
            Connection successful — holdings synced
          </p>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={handleTestSync} disabled={isSyncing}>
            <RefreshCw size={15} />
            {isSyncing ? 'Syncing…' : 'Test & Sync Now'}
          </button>
        </div>

        <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '1rem' }}>
          Configure credentials in your <code style={{ color: 'var(--text-secondary)' }}>.env</code> file.
          Required: ANGEL_ONE_API_KEY, ANGEL_ONE_CLIENT_CODE, ANGEL_ONE_PIN, ANGEL_ONE_TOTP_SECRET
        </p>
      </div>
    </div>
  );
};

export default Settings;
