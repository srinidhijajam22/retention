export default function Header({ user, isAdmin, onLogout, onOpenSettings }) {
  return (
    <header className="header">
      <div className="header-left">
        <span className="header-badge">BEL</span>
        <h1>Learner Retention Dashboard</h1>
      </div>
      <div className="header-right">
        <span style={{ fontSize: 12, color: 'var(--muted2)', fontFamily: "'DM Mono',monospace" }}>{user.username}</span>
        {isAdmin ? (
          <span style={{ fontSize: 11, background: 'rgba(252,73,23,0.12)', color: '#FC4917', border: '1px solid rgba(252,73,23,0.3)', padding: '3px 9px', borderRadius: 20, fontFamily: "'DM Mono',monospace", fontWeight: 600 }}>ADMIN</span>
        ) : (
          <span style={{ fontSize: 11, background: 'rgba(84,249,218,0.1)', color: '#54F9DA', border: '1px solid rgba(84,249,218,0.3)', padding: '3px 9px', borderRadius: 20, fontFamily: "'DM Mono',monospace", fontWeight: 600 }}>TEAM</span>
        )}
        {isAdmin && (
          <button style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, border: '1px solid rgba(104,53,251,0.4)', background: 'rgba(104,53,251,0.1)', color: 'var(--accent)', cursor: 'pointer' }} onClick={onOpenSettings}>
            ⚙ Settings
          </button>
        )}
        <button className="logout-btn" onClick={onLogout}>Sign out</button>
      </div>
    </header>
  );
}
