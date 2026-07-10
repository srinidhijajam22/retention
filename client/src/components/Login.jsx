import { useState } from 'react';
import { api } from '../lib/api.js';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!username.trim() || !password) return;
    setBusy(true);
    setError('');
    try {
      const { token, user } = await api.login(username.trim().toLowerCase(), password);
      onLogin(token, user);
    } catch (err) {
      setError(err.message || 'Incorrect username or password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div id="loginScreen">
      <div className="login-card">
        <div className="login-logo">
          <span className="badge">BEL</span>
          <h2 style={{ fontSize: 16, fontWeight: 500 }}>Retention Dashboard</h2>
        </div>
        <h1>Welcome back</h1>
        <p>Sign in to access learner retention data.</p>
        <div className="form-group">
          <label>Username</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username" autoComplete="username" />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          />
        </div>
        <button className="login-btn" onClick={submit} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        {error && <div className="login-error">{error}</div>}
      </div>
    </div>
  );
}
