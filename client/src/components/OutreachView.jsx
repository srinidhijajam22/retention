import { useMemo, useState } from 'react';
import { getFocusGroup, getPriority } from '../lib/priority.js';
import { ALL_TRACKS } from '../lib/config.js';
import { api, getToken } from '../lib/api.js';

const PR_ORDER = { P0: 0, P1: 1, P2: 2 };
const PR_META = {
  P0: { title: 'Immediate intervention', subtitle: 'Missed (FG1/FG2) · Passive (FG1)', hdrClass: 'p0-hdr' },
  P1: { title: 'Monitor closely', subtitle: 'Passive (FG2/FG3)', hdrClass: 'p1-hdr' },
  P2: { title: 'Low priority', subtitle: 'Missed (FG3)', hdrClass: 'p2-hdr' },
};

function todayISO() { return new Date().toISOString().split('T')[0]; }

function isFollowupDue(rec) {
  if (!rec.followupDate || rec.followupDone) return false;
  return rec.followupDate <= todayISO();
}

export default function OutreachView({ cohortName, detail, isAdmin, accessibleTracks, onReload, onOpenHistory }) {
  const weeks = detail.weekly;
  const [weekIdx, setWeekIdx] = useState(weeks.length - 1);
  const [filter, setFilter] = useState('all');
  const [pendingAssignPerson, setPendingAssignPerson] = useState(null);
  const [assignScope, setAssignScope] = useState('all');

  const effectiveWeekIdx = Math.min(weekIdx, weeks.length - 1);
  const wLabel = weeks[effectiveWeekIdx]?.w || '';
  const outW = detail.outreach[wLabel] || {};

  const learnersInScope = useMemo(() => {
    return detail.learners.filter((l) => {
      if (isAdmin || !accessibleTracks) return true;
      return accessibleTracks.includes((l.track || 'JAVA').toUpperCase());
    });
  }, [detail.learners, isAdmin, accessibleTracks]);

  const withPriority = useMemo(() => {
    return learnersInScope.map((l) => {
      const hist = effectiveWeekIdx >= 0 ? l.history.slice(0, effectiveWeekIdx + 1) : l.history;
      const weekStatus = hist[hist.length - 1] || 'Missed';
      const fg = getFocusGroup(hist);
      const pr = getPriority(weekStatus, fg);
      const rec = outW[l.mobile] || {};
      const due = isFollowupDue(rec);
      return { ...l, weekStatus, fg, priority: pr, record: rec, due };
    }).filter((l) => l.priority !== null);
  }, [learnersInScope, effectiveWeekIdx, outW]);

  const filtered = useMemo(() => {
    let list = withPriority;
    if (filter === 'p0') list = list.filter((l) => l.priority === 'P0');
    else if (filter === 'p1') list = list.filter((l) => l.priority === 'P1');
    else if (filter === 'p2') list = list.filter((l) => l.priority === 'P2');
    else if (filter === 'due') list = list.filter((l) => l.due);
    else if (filter === 'pending') list = list.filter((l) => !l.record.outcome);
    else if (filter === 'manasvi') list = list.filter((l) => l.record.assignedTo === 'Manasvi');
    else if (filter === 'srinidhi') list = list.filter((l) => l.record.assignedTo === 'Srinidhi');
    return [...list].sort((a, b) => {
      if (a.due && !b.due) return -1;
      if (!a.due && b.due) return 1;
      return (PR_ORDER[a.priority] || 0) - (PR_ORDER[b.priority] || 0);
    });
  }, [withPriority, filter]);

  const groups = {
    P0: filtered.filter((l) => l.priority === 'P0'),
    P1: filtered.filter((l) => l.priority === 'P1'),
    P2: filtered.filter((l) => l.priority === 'P2'),
  };

  const summary = useMemo(() => {
    const total = withPriority.length;
    const reached = withPriority.filter((l) => l.record.outcome === 'Reached').length;
    const dnp = withPriority.filter((l) => l.record.outcome === 'DNP').length;
    const pending = withPriority.filter((l) => !l.record.outcome).length;
    const dueToday = withPriority.filter((l) => l.due).length;
    return { total, reached, dnp, pending, dueToday };
  }, [withPriority]);

  async function saveField(mobile, field, value) {
    await api.saveOutreach(cohortName, mobile, wLabel, field, value);
    await onReload();
  }

  async function doAssign() {
    if (!pendingAssignPerson) { alert('Select a person first (Manasvi or Srinidhi)'); return; }
    await api.bulkAssign(cohortName, wLabel, assignScope, pendingAssignPerson);
    await onReload();
  }

  async function exportCsv() {
    const res = await fetch(api.exportOutreachUrl(cohortName, wLabel), { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!res.ok) { alert('Export failed.'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cohortName.replace(/ /g, '_')}_Outreach_${wLabel}_${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!weeks.length) {
    return <div className="no-data"><h3>No data for {cohortName}</h3><p>Upload LXD export first.</p></div>;
  }

  return (
    <div>
      {isAdmin && (
        <div className="assign-panel">
          <span className="admin-label">Admin — Assign outreach</span>
          <div className="assign-group">
            <span>Assign to:</span>
            <button className={'assign-btn' + (pendingAssignPerson === 'Manasvi' ? ' selected' : '')} onClick={() => setPendingAssignPerson('Manasvi')}>Manasvi</button>
            <button className={'assign-btn' + (pendingAssignPerson === 'Srinidhi' ? ' selected' : '')} onClick={() => setPendingAssignPerson('Srinidhi')}>Srinidhi</button>
          </div>
          <div className="assign-group">
            <span>Scope:</span>
            <select value={assignScope} onChange={(e) => setAssignScope(e.target.value)}>
              <option value="all">Whole cohort</option>
              {ALL_TRACKS.filter((t) => detail.config.tracks.includes(t)).map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()} track only</option>)}
              <option value="p0">P0 only</option>
              <option value="p1">P1 only</option>
              <option value="p2">P2 only</option>
            </select>
            <button className="assign-btn selected" onClick={doAssign} style={{ background: 'var(--accent-dim)', borderColor: 'rgba(79,142,247,0.4)', color: 'var(--accent)' }}>Apply assignment</button>
          </div>
        </div>
      )}

      <div className="outreach-header">
        <h2>Outreach tracker <span style={{ fontSize: 13, color: 'var(--muted2)', fontWeight: 400, marginLeft: 6 }}>— {wLabel}{!isAdmin && accessibleTracks ? ` · ${accessibleTracks.join('+')} track` : ''}</span></h2>
        <div className="outreach-controls">
          <select value={effectiveWeekIdx} onChange={(e) => setWeekIdx(parseInt(e.target.value, 10))}>
            {weeks.map((w, i) => <option key={w.w} value={i}>{w.w}</option>)}
          </select>
          <button onClick={exportCsv} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(104,53,251,0.4)', background: 'rgba(104,53,251,0.1)', color: 'var(--accent)', cursor: 'pointer', whiteSpace: 'nowrap' }} title="Export this week's outreach log as CSV">⬇ Export CSV</button>
          <div className="tab-group">
            <button className={'tab p0' + (filter === 'all' ? ' active' : '')} onClick={() => setFilter('all')}>All</button>
            <button className={'tab p0' + (filter === 'p0' ? ' active' : '')} onClick={() => setFilter('p0')}>P0</button>
            <button className={'tab p1' + (filter === 'p1' ? ' active' : '')} onClick={() => setFilter('p1')}>P1</button>
            <button className={'tab p2' + (filter === 'p2' ? ' active' : '')} onClick={() => setFilter('p2')}>P2</button>
            <button className={'tab' + (filter === 'due' ? ' active' : '')} onClick={() => setFilter('due')}>Due today</button>
            <button className={'tab' + (filter === 'pending' ? ' active' : '')} onClick={() => setFilter('pending')}>Pending call</button>
            <button className={'tab' + (filter === 'manasvi' ? ' active' : '')} onClick={() => setFilter('manasvi')}>Manasvi</button>
            <button className={'tab' + (filter === 'srinidhi' ? ' active' : '')} onClick={() => setFilter('srinidhi')}>Srinidhi</button>
          </div>
        </div>
      </div>

      <div className="outreach-summary">
        <div className="os-card"><div className="os-lbl">Total to contact</div><div className="os-val">{summary.total}</div><div className="os-sub">{wLabel}</div></div>
        <div className="os-card"><div className="os-lbl">Reached</div><div className="os-val" style={{ color: 'var(--green)' }}>{summary.reached}</div><div className="os-sub">{Math.round((summary.reached / summary.total) * 100) || 0}% coverage</div></div>
        <div className="os-card"><div className="os-lbl">DNP</div><div className="os-val" style={{ color: 'var(--amber)' }}>{summary.dnp}</div><div className="os-sub">Did not pick</div></div>
        <div className="os-card"><div className="os-lbl">Pending</div><div className="os-val" style={{ color: 'var(--red)' }}>{summary.pending}</div><div className="os-sub">Not yet called</div></div>
        <div className="os-card"><div className="os-lbl">Follow-ups due</div><div className="os-val" style={{ color: '#a78bfa' }}>{summary.dueToday}</div><div className="os-sub">Today or overdue</div></div>
      </div>

      {filtered.length === 0 ? (
        <div className="no-data"><h3>No learners match this filter</h3><p>Try a different filter above.</p></div>
      ) : (
        ['P0', 'P1', 'P2'].map((pr) => groups[pr].length > 0 && (
          <PrioritySection key={pr} pr={pr} learners={groups[pr]} cohortName={cohortName} wLabel={wLabel} weekIdx={effectiveWeekIdx} detail={detail} isAdmin={isAdmin} onSaveField={saveField} onOpenHistory={onOpenHistory} />
        ))
      )}
    </div>
  );
}

function getPrevWeekNote(detail, weekIdx, mobile) {
  if (weekIdx <= 0) return null;
  const prevLabel = detail.weekly[weekIdx - 1]?.w;
  const prevRec = detail.outreach[prevLabel]?.[mobile];
  if (!prevRec || (!prevRec.notes && !prevRec.outcome)) return null;
  const outcomeColor = prevRec.outcome === 'Reached' ? '#54F9DA' : prevRec.outcome === 'DNP' ? '#F5F76B' : '#FC4917';
  return { prevLabel, prevRec, outcomeColor };
}

function PrioritySection({ pr, learners, cohortName, wLabel, weekIdx, detail, isAdmin, onSaveField, onOpenHistory }) {
  const meta = PR_META[pr];
  const today = todayISO();

  function sendWhatsApp(mobile, name) {
    const msg = `Hi ${name} 👋, this is the BEL team. We've noticed you missed this week's ${cohortName} session. Could you let us know the reason? We'd like to understand what's going on and see if we can help.`;
    window.open(`https://wa.me/${mobile}?text=${encodeURIComponent(msg)}`, '_blank');
  }
  function sendEmail(email, name) {
    const subject = `Important — Session Attendance & Eligibility | ${cohortName} ${wLabel}`;
    const body = `Hi ${name},\n\nWe've been noticing that despite multiple check-ins, you've continued to miss sessions. We wanted to bring something important to your attention.\n\nTo be eligible for the Final Capstone Project and Career Services, you need to have completed more than 90% of sessions and submitted all your projects and assignments.\n\nYour current attendance is a concern and we wouldn't want it to affect your eligibility. Please let us know if there's something you're facing — we're here to help you get back on track.\n\nReach out and let's figure this out together.\n\nWarm regards,\nBEL Team`;
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <div className="priority-section">
      <div className={`priority-hdr ${meta.hdrClass}`}>
        <span className={`pill pill-${pr.toLowerCase()}`}>{pr}</span>
        <div><h4>{meta.title}</h4><div className="ph-meta">{meta.subtitle} · {learners.length} learners</div></div>
      </div>
      {learners.map((l) => {
        const rec = l.record || {};
        return (
          <div key={l.mobile} className={'outreach-card' + (l.due ? ' due-today' : '')}>
            <div className="oc-info">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                <div className="oc-name">
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{l.name}</span>
                  <span className={`pill pill-${(l.track || 'JAVA').toLowerCase()}`}>{(l.track || 'JAVA').toUpperCase()}</span>
                  <span className={`pill pill-${l.fg.toLowerCase()}`}>{l.fg}</span>
                  <span className={`pill pill-${l.priority.toLowerCase()}`}>{l.priority}</span>
                  {l.due && <span className="followup-badge due-badge">📅 Follow-up due</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <span className={`status-badge ${l.weekStatus === 'Missed' ? 'status-missed' : l.weekStatus === 'Passive' ? 'status-passive' : 'status-ontrack'}`}>
                    {l.weekStatus === 'Missed' ? '● MISSED' : l.weekStatus === 'Passive' ? '◐ PASSIVE' : '✓ ON TRACK'}
                  </span>
                  <div className="week-history" title="Last 6 weeks attendance">
                    {l.history.slice(-6).map((s, i) => <span key={i} className={'wk ' + (s === 'On Track' ? 'wk-on' : s === 'Passive' ? 'wk-pa' : 'wk-mi')} title={s}></span>)}
                  </div>
                </div>
              </div>
              <div className="oc-contact">
                📞 +{l.mobile} &nbsp;·&nbsp; ✉ {l.email}
                &nbsp;
                <button className="view-hist-btn" onClick={() => onOpenHistory(l.mobile)}>View history ↗</button>
                <button className="view-hist-btn" style={{ background: 'rgba(37,211,102,0.1)', borderColor: 'rgba(37,211,102,0.35)', color: '#25d366' }} onClick={() => sendWhatsApp(l.mobile, l.name)} title="Send WhatsApp nudge">💬 WhatsApp</button>
                <button className="view-hist-btn" style={{ background: 'rgba(104,53,251,0.1)', borderColor: 'rgba(104,53,251,0.35)', color: 'var(--accent)' }} onClick={() => sendEmail(l.email, l.name)} title="Send email nudge">✉ Email</button>
              </div>
              <div className="oc-badges">
                {rec.assignedTo ? <span style={{ fontSize: 11, color: 'var(--muted2)' }}>Assigned: <strong style={{ color: 'var(--text)' }}>{rec.assignedTo}</strong></span> : <span style={{ fontSize: 11, color: 'var(--muted)' }}>Unassigned</span>}
                {rec.outcome && <span className="pill" style={{ background: 'rgba(34,201,138,0.12)', color: '#22c98a', border: '1px solid rgba(34,201,138,0.25)', marginLeft: 6 }}>{rec.outcome}</span>}
                {rec.followupDate && !rec.followupDone && <span className="followup-badge" style={{ marginLeft: 6 }}>Follow-up: {rec.followupDate}</span>}
                {rec.followupDone && <span className="followup-badge done-badge" style={{ marginLeft: 6 }}>✓ Follow-up done</span>}
              </div>
              {rec.notes && <div style={{ marginTop: 6, fontSize: 12, color: 'var(--muted2)', fontStyle: 'italic' }}>"{rec.notes}"</div>}
            </div>
            <div className="oc-actions">
              <div className="oc-field">
                <label>Assigned to</label>
                {isAdmin ? (
                  <select className="oc-select" defaultValue={rec.assignedTo || ''} onChange={(e) => onSaveField(l.mobile, 'assignedTo', e.target.value)}>
                    <option value="">— Unassigned</option>
                    <option value="Manasvi">Manasvi</option>
                    <option value="Srinidhi">Srinidhi</option>
                  </select>
                ) : (
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{rec.assignedTo || '—'}</span>
                )}
              </div>
              <div className="oc-field">
                <label>Call outcome</label>
                <select className="oc-select" defaultValue={rec.outcome || ''} onChange={(e) => onSaveField(l.mobile, 'outcome', e.target.value)}>
                  <option value="">— Not called</option>
                  <option value="Reached">Reached</option>
                  <option value="DNP">DNP</option>
                  <option value="Callback">Callback requested</option>
                  <option value="Not reachable">Not reachable</option>
                </select>
              </div>
              <div className="oc-field" style={{ flex: 1, minWidth: 140 }}>
                <label>Notes / reason</label>
                <PrevNote detail={detail} weekIdx={weekIdx} mobile={l.mobile} />
                <input className="oc-input" type="text" placeholder="What did they say..." defaultValue={rec.notes || ''} onBlur={(e) => onSaveField(l.mobile, 'notes', e.target.value)} />
              </div>
              <div className="oc-field">
                <label>Follow-up date</label>
                <input className="oc-date" type="date" defaultValue={rec.followupDate || ''} min={today} onChange={(e) => onSaveField(l.mobile, 'followupDate', e.target.value)} />
              </div>
              <div className="oc-field" style={{ justifyContent: 'flex-end' }}>
                <label>Follow-up done</label>
                <input type="checkbox" defaultChecked={!!rec.followupDone} onChange={(e) => onSaveField(l.mobile, 'followupDone', e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer', marginTop: 4 }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PrevNote({ detail, weekIdx, mobile }) {
  const info = getPrevWeekNote(detail, weekIdx, mobile);
  if (!info) return null;
  const { prevLabel, prevRec, outcomeColor } = info;
  return (
    <div style={{ background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', marginBottom: 4, fontSize: 11, color: 'var(--muted2)' }}>
      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10 }}>↑ {prevLabel}:</span>
      {prevRec.outcome && <span style={{ color: outcomeColor, fontWeight: 500, marginLeft: 4 }}>{prevRec.outcome}</span>}
      {prevRec.assignedTo && <span style={{ marginLeft: 4 }}>by {prevRec.assignedTo}</span>}
      {prevRec.notes && <span style={{ marginLeft: 4, fontStyle: 'italic' }}>"{prevRec.notes}"</span>}
    </div>
  );
}
