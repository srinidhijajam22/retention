import { useCallback, useEffect, useState } from 'react';
import { api, getToken, getStoredUser, setSession, clearSession } from './lib/api.js';
import Login from './components/Login.jsx';
import Header from './components/Header.jsx';
import CohortNav from './components/CohortNav.jsx';
import OverviewView from './components/OverviewView.jsx';
import CohortView from './components/CohortView.jsx';
import SettingsModal from './components/SettingsModal.jsx';

export default function App() {
  const [user, setUser] = useState(getStoredUser());
  const [cohorts, setCohorts] = useState([]);
  const [activeCohort, setActiveCohort] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [assignments, setAssignments] = useState({ Manasvi: {}, Srinidhi: {} });
  const [ready, setReady] = useState(false);

  const isAdmin = user?.role === 'admin';

  const loadCohorts = useCallback(async () => {
    const { cohorts } = await api.listCohorts();
    setCohorts(cohorts);
    return cohorts;
  }, []);

  const loadAssignments = useCallback(async () => {
    const { assignments } = await api.getAssignments();
    setAssignments(assignments);
    return assignments;
  }, []);

  useEffect(() => {
    if (!user || !getToken()) return;
    Promise.all([loadCohorts(), loadAssignments()]).then(() => setReady(true));
  }, [user, loadCohorts, loadAssignments]);

  function handleLogin(token, u) {
    setSession(token, u);
    setUser(u);
  }
  function handleLogout() {
    clearSession();
    setUser(null);
    setActiveCohort(null);
    setReady(false);
    setCohorts([]);
  }

  if (!user || !getToken()) {
    return <Login onLogin={handleLogin} />;
  }
  if (!ready) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--muted2)' }}>Loading dashboard…</div>;
  }

  const activeMeta = cohorts.find((c) => c.name === activeCohort) || null;

  return (
    <div id="app" style={{ display: 'block' }}>
      <Header user={user} isAdmin={isAdmin} onLogout={handleLogout} onOpenSettings={() => setSettingsOpen(true)} />
      <CohortNav cohorts={cohorts} activeCohort={activeCohort} onSelect={setActiveCohort} isAdmin={isAdmin} />
      <div className="main">
        {activeCohort === null ? (
          <OverviewView cohorts={cohorts} onSelectCohort={setActiveCohort} />
        ) : (
          <CohortView
            key={activeCohort}
            cohortName={activeCohort}
            cohortMeta={activeMeta}
            isAdmin={isAdmin}
            accessibleTracks={activeMeta?.accessibleTracks || null}
            onDataChanged={loadCohorts}
          />
        )}
      </div>
      {settingsOpen && (
        <SettingsModal
          cohorts={cohorts}
          assignments={assignments}
          onClose={() => setSettingsOpen(false)}
          onChanged={async () => { await loadAssignments(); await loadCohorts(); }}
        />
      )}
    </div>
  );
}
