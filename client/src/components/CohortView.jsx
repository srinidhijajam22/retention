import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { getFocusGroup, getPriority } from '../lib/priority.js';
import RetentionView from './RetentionView.jsx';
import OutreachView from './OutreachView.jsx';
import HistoryModal from './HistoryModal.jsx';

export default function CohortView({ cohortName, cohortMeta, isAdmin, accessibleTracks, onDataChanged }) {
  const [view, setView] = useState('retention');
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historyMobile, setHistoryMobile] = useState(null);

  const reload = useCallback(async () => {
    const d = await api.getCohort(cohortName);
    setDetail(d);
    return d;
  }, [cohortName]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setView('retention');
    api.getCohort(cohortName).then((d) => {
      if (cancelled) return;
      setDetail(d);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [cohortName]);

  async function refreshAfterMutation() {
    const d = await reload();
    onDataChanged();
    return d;
  }

  const pendingOutreachCount = (() => {
    if (!detail || !detail.weekly.length) return 0;
    const lastW = detail.weekly[detail.weekly.length - 1].w;
    const outW = detail.outreach[lastW] || {};
    return detail.learners.filter((l) => {
      const s = l.history[l.history.length - 1];
      const fg = getFocusGroup(l.history);
      const pr = getPriority(s, fg);
      return pr && (!outW[l.mobile] || !outW[l.mobile].outcome);
    }).length;
  })();

  if (loading || !detail) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted2)' }}>Loading {cohortName}…</div>;
  }

  return (
    <div>
      <div className="view-tabs">
        <button className={'view-tab' + (view === 'retention' ? ' active' : '')} onClick={() => setView('retention')}>Retention</button>
        <button className={'view-tab' + (view === 'outreach' ? ' active' : '')} onClick={() => setView('outreach')}>
          Outreach {pendingOutreachCount > 0 && (
            <span style={{ fontSize: 10, background: 'rgba(167,139,250,0.2)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)', padding: '1px 6px', borderRadius: 20, marginLeft: 4, fontFamily: "'DM Mono',monospace" }}>{pendingOutreachCount}</span>
          )}
        </button>
      </div>
      {view === 'retention' ? (
        <RetentionView
          cohortName={cohortName}
          detail={detail}
          cohortMeta={cohortMeta}
          isAdmin={isAdmin}
          accessibleTracks={accessibleTracks}
          onMutated={refreshAfterMutation}
        />
      ) : (
        <OutreachView
          cohortName={cohortName}
          detail={detail}
          isAdmin={isAdmin}
          accessibleTracks={accessibleTracks}
          onReload={reload}
          onOpenHistory={setHistoryMobile}
        />
      )}
      {historyMobile && <HistoryModal detail={detail} mobile={historyMobile} onClose={() => setHistoryMobile(null)} />}
    </div>
  );
}

