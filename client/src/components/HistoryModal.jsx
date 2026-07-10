import { getFocusGroup, getPriority } from '../lib/priority.js';

function todayISO() { return new Date().toISOString().split('T')[0]; }

export default function HistoryModal({ detail, mobile, onClose }) {
  const learner = detail.learners.find((l) => l.mobile === mobile);
  if (!learner) return null;
  const allWeeks = detail.weekly;

  let totalContacted = 0, totalReached = 0, totalDNP = 0, totalNotes = 0;
  allWeeks.forEach((w) => {
    const rec = detail.outreach[w.w]?.[mobile];
    if (rec && rec.outcome) {
      totalContacted++;
      if (rec.outcome === 'Reached') totalReached++;
      if (rec.outcome === 'DNP') totalDNP++;
      if (rec.notes) totalNotes++;
    }
  });

  const weeksToShow = allWeeks.filter((w, i) => {
    const rec = detail.outreach[w.w]?.[mobile];
    return rec || i >= allWeeks.length - 8;
  }).slice().reverse();

  const today = todayISO();

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box">
        <div className="modal-header">
          <div>
            <h3>{learner.name}</h3>
            <div className="mh-sub">+{learner.mobile} · {learner.email} · {learner.track || 'JAVA'}</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="modal-stat-row">
            <div className="modal-stat"><div className="ms-lbl">Weeks contacted</div><div className="ms-val">{totalContacted}</div></div>
            <div className="modal-stat"><div className="ms-lbl">Reached</div><div className="ms-val" style={{ color: '#22c98a' }}>{totalReached}</div></div>
            <div className="modal-stat"><div className="ms-lbl">DNP</div><div className="ms-val" style={{ color: '#f5a623' }}>{totalDNP}</div></div>
            <div className="modal-stat"><div className="ms-lbl">Notes logged</div><div className="ms-val">{totalNotes}</div></div>
          </div>
          <div className="timeline">
            {!weeksToShow.length ? (
              <div className="modal-empty">No outreach history yet for this learner.</div>
            ) : weeksToShow.map((w) => {
              const rec = detail.outreach[w.w]?.[mobile] || {};
              const weekIdx = allWeeks.findIndex((x) => x.w === w.w);
              const hist = weekIdx >= 0 ? learner.history.slice(0, weekIdx + 1) : learner.history;
              const weekStatus = hist[hist.length - 1] || 'Missed';
              const fg = getFocusGroup(hist);
              const pr = getPriority(weekStatus, fg);
              const hasContact = rec.outcome || rec.notes || rec.assignedTo || rec.followupDate;
              const dotClass = !rec.outcome ? 'tl-dot-pending' : rec.outcome === 'Reached' ? 'tl-dot-reached' : rec.outcome === 'DNP' ? 'tl-dot-dnp' : rec.outcome === 'Callback' ? 'tl-dot-callback' : 'tl-dot-notreachable';
              const outcomeColor = rec.outcome === 'Reached' ? '#22c98a' : rec.outcome === 'DNP' ? '#f5a623' : rec.outcome === 'Callback' ? '#a78bfa' : rec.outcome === 'Not reachable' ? '#888780' : 'var(--muted2)';
              return (
                <div key={w.w} className="tl-item">
                  <div className={`tl-dot ${dotClass}`}></div>
                  <div className="tl-week-lbl">
                    {w.w}
                    <span className={`pill ${weekStatus === 'Missed' ? 'pill-mi' : weekStatus === 'Passive' ? 'pill-pa' : 'pill-on'}`}>{weekStatus === 'On Track' ? 'ON TRACK' : weekStatus.toUpperCase()}</span>
                    <span className={`pill ${fg === 'FG1' ? 'pill-fg1' : fg === 'FG2' ? 'pill-fg2' : 'pill-fg3'}`}>{fg}</span>
                    {pr && <span className={`pill pill-${pr.toLowerCase()}`}>{pr}</span>}
                  </div>
                  <div className="tl-card">
                    {hasContact ? (
                      <>
                        <div className="tl-row">
                          {rec.assignedTo && <span style={{ fontSize: 12, color: 'var(--muted2)' }}>Called by <strong style={{ color: 'var(--text)' }}>{rec.assignedTo}</strong></span>}
                          {rec.outcome ? <span style={{ fontSize: 12, fontWeight: 500, color: outcomeColor }}>{rec.outcome}</span> : <span style={{ fontSize: 12, color: 'var(--muted)' }}>Not yet called</span>}
                          {rec.followupDone ? (
                            <span className="followup-badge done-badge">✓ Follow-up done</span>
                          ) : rec.followupDate ? (
                            <span className={'followup-badge' + (rec.followupDate <= today ? ' due-badge' : '')}>📅 Follow-up: {rec.followupDate}{rec.followupDate <= today ? ' (due)' : ''}</span>
                          ) : null}
                        </div>
                        {rec.notes && <div className="tl-notes">"{rec.notes}"</div>}
                      </>
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>No outreach logged for this week</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
