import { useMemo, useState } from 'react';
import { getFocusGroup, isAtRisk } from '../lib/priority.js';
import { PHASE_COLORS } from '../lib/config.js';
import { api } from '../lib/api.js';
import ChartCanvas from './ChartCanvas.jsx';
import LearnerTable from './LearnerTable.jsx';
import UploadModal from './UploadModal.jsx';
import PhaseModal from './PhaseModal.jsx';

const CHART_BASE_OPTS = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(19,21,31,0.96)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, titleColor: '#e2e4ed', bodyColor: '#8891a8', mode: 'index', intersect: false } },
};

function defaultTrackFilter(isAdmin, accessibleTracks) {
  if (!isAdmin && accessibleTracks && accessibleTracks.length === 1) return accessibleTracks[0];
  return 'all';
}

export default function RetentionView({ cohortName, detail, cohortMeta, isAdmin, accessibleTracks, onMutated }) {
  const [trackFilter, setTrackFilter] = useState(() => defaultTrackFilter(isAdmin, accessibleTracks));
  const [uploadOpen, setUploadOpen] = useState(false);
  const [phaseModalOpen, setPhaseModalOpen] = useState(false);

  const cfg = detail.config;
  const weekly = useMemo(() => detail.weekly.filter((w) => w && w.on !== undefined), [detail.weekly]);

  const filteredLearners = useMemo(() => {
    if (trackFilter === 'all') return detail.learners;
    return detail.learners.filter((l) => (l.track || 'JAVA').toUpperCase() === trackFilter);
  }, [detail.learners, trackFilter]);

  const filteredWeekly = useMemo(() => {
    if (trackFilter === 'all') return weekly;
    return weekly.map((w, i) => {
      let on = 0, pa = 0, mi = 0;
      filteredLearners.forEach((l) => {
        const s = l.history[i];
        if (s === 'On Track') on++; else if (s === 'Passive') pa++; else mi++;
      });
      return { w: w.w, on, pa, mi };
    });
  }, [weekly, trackFilter, filteredLearners]);

  const phaseOverride = detail.phaseOverride;
  const displayLabel = phaseOverride ? phaseOverride.label : cfg.label;
  const displayClass = phaseOverride ? phaseOverride.cssClass : (PHASE_COLORS[cfg.phase] || '');

  async function handleDeleteWeek(idx) {
    const w = detail.weekly[idx];
    if (!confirm(`Delete ${w.w} (${cohortName})? This will also remove all learner history and outreach data for this week. This cannot be undone.`)) return;
    await api.deleteWeek(cohortName, idx);
    await onMutated();
  }

  async function handleResetCohort() {
    if (!confirm(`Reset ALL data for ${cohortName}?\n\nThis will permanently delete:\n- All weekly upload history\n- All learner records\n- All outreach logs\n\nThis cannot be undone.`)) return;
    await api.resetCohort(cohortName);
    await onMutated();
    alert(`${cohortName} has been reset. You can now upload fresh data.`);
  }

  if (!detail.weekly.length) {
    return (
      <div>
        <UploadZone cohortName={cohortName} cfg={cfg} lastUpdated={detail.lastUpdated} onOpenUpload={() => setUploadOpen(true)} />
        <div className="no-data"><h3>No data yet for {cohortName}</h3><p>Upload the LXD export to begin tracking.</p></div>
        {uploadOpen && (
          <UploadModal cohortName={cohortName} weekInProgress={detail.weekInProgress} onClose={() => setUploadOpen(false)} onUploaded={async (r) => { setUploadOpen(false); await onMutated(); if (r.message) alert(r.message); }} />
        )}
      </div>
    );
  }

  const last = filteredWeekly[filteredWeekly.length - 1];
  const total = last ? (last.on + last.pa + last.mi || 1) : 1;
  const activeNow = last ? last.on + last.pa : 0;
  const ar = last ? Math.round((activeNow / total) * 100) : 0;
  const mr = last ? Math.round((last.mi / total) * 100) : 0;
  const base = filteredWeekly[0] ? filteredWeekly[0].on + filteredWeekly[0].pa || 1 : 1;
  const ret = Math.round((activeNow / base) * 100);
  const atRiskCount = filteredLearners.filter((l) => isAtRisk(l.history)).length;
  const suffix = trackFilter !== 'all' ? ` (${trackFilter})` : '';

  const retChartConfig = filteredWeekly.length ? {
    type: 'line',
    data: {
      labels: filteredWeekly.map((x) => x.w),
      datasets: [{ data: filteredWeekly.map((x) => Math.round(((x.on + x.pa) / base) * 100)), borderColor: '#6835FB', backgroundColor: 'rgba(104,53,251,0.12)', tension: 0.35, fill: true, pointRadius: 3, pointBackgroundColor: '#6835FB', borderWidth: 2 }],
    },
    options: { ...CHART_BASE_OPTS, scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#5c6070', font: { size: 11 }, autoSkip: true, maxRotation: 0 } }, y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#5c6070', font: { size: 11 }, callback: (v) => v + '%' } } } },
  } : null;

  const churnChartConfig = filteredWeekly.length ? {
    type: 'bar',
    data: {
      labels: filteredWeekly.map((x) => x.w),
      datasets: [{ data: filteredWeekly.map((x) => Math.round((x.mi / (x.on + x.pa + x.mi || 1)) * 100)), backgroundColor: filteredWeekly.map((x) => { const v = Math.round((x.mi / (x.on + x.pa + x.mi || 1)) * 100); return v > 70 ? 'rgba(240,82,82,0.75)' : v > 50 ? 'rgba(245,166,35,0.75)' : 'rgba(34,201,138,0.75)'; }), borderRadius: 4 }],
    },
    options: { ...CHART_BASE_OPTS, scales: { x: { grid: { display: false }, ticks: { color: '#5c6070', font: { size: 11 }, autoSkip: true, maxRotation: 0 } }, y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#5c6070', font: { size: 11 }, callback: (v) => v + '%' } } } },
  } : null;

  const fgTrendConfig = (filteredLearners.length && filteredWeekly.length) ? (() => {
    const f1d = [], f2d = [], f3d = [];
    filteredWeekly.forEach((_, wi) => {
      let a = 0, b = 0, c = 0;
      filteredLearners.forEach((l) => {
        const fg = getFocusGroup(l.history.slice(0, wi + 1));
        if (fg === 'FG1') a++; else if (fg === 'FG2') b++; else c++;
      });
      f1d.push(a); f2d.push(b); f3d.push(c);
    });
    return {
      type: 'line',
      data: {
        labels: filteredWeekly.map((x) => x.w),
        datasets: [
          { label: 'FG1', data: f1d, borderColor: '#54F9DA', backgroundColor: 'transparent', tension: 0.3, pointRadius: 2, borderWidth: 2 },
          { label: 'FG2', data: f2d, borderColor: '#F42479', backgroundColor: 'transparent', tension: 0.3, pointRadius: 2, borderWidth: 2, borderDash: [4, 3] },
          { label: 'FG3', data: f3d, borderColor: '#FC4917', backgroundColor: 'transparent', tension: 0.3, pointRadius: 2, borderWidth: 2, borderDash: [2, 2] },
        ],
      },
      options: { ...CHART_BASE_OPTS, plugins: { ...CHART_BASE_OPTS.plugins, legend: { display: true, labels: { color: '#8891a8', font: { size: 11 }, boxWidth: 10, boxHeight: 10, padding: 14 } } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#5c6070', font: { size: 11 }, autoSkip: true, maxRotation: 0 } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#5c6070', font: { size: 11 } } } } },
    };
  })() : null;

  const fgCounts = (() => {
    const t = filteredLearners.length || 1;
    const f1 = filteredLearners.filter((l) => getFocusGroup(l.history) === 'FG1').length;
    const f2 = filteredLearners.filter((l) => getFocusGroup(l.history) === 'FG2').length;
    const f3 = filteredLearners.filter((l) => getFocusGroup(l.history) === 'FG3').length;
    return { f1, f2, f3, t };
  })();

  return (
    <div>
      <div className="phase-strip">
        <span className="ps-label">Phase:</span>
        <span className={`phase-badge ${displayClass}`}>{displayLabel}</span>
        {isAdmin && (
          <button onClick={() => setPhaseModalOpen(true)} style={{ marginLeft: 10, fontSize: 11, padding: '2px 10px', borderRadius: 20, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--muted2)', cursor: 'pointer' }}>✎ Edit phase</button>
        )}
      </div>

      {isAdmin && (
        <div className="admin-bar" style={{ display: 'flex' }}>
          <span className="admin-label">Admin — Track filter</span>
          <div className="track-group">
            <span>Show:</span>
            <button className={'tbtn t-all' + (trackFilter === 'all' ? ' active' : '')} onClick={() => setTrackFilter('all')}>All tracks</button>
            <button className={'tbtn t-java' + (trackFilter === 'JAVA' ? ' active' : '')} onClick={() => setTrackFilter('JAVA')}>Java</button>
            <button className={'tbtn t-node' + (trackFilter === 'NODE' ? ' active' : '')} onClick={() => setTrackFilter('NODE')}>Node</button>
            {cfg.tracks.includes('PYTHON') && <button className={'tbtn t-python' + (trackFilter === 'PYTHON' ? ' active' : '')} onClick={() => setTrackFilter('PYTHON')}>Python</button>}
          </div>
        </div>
      )}

      <UploadZone cohortName={cohortName} cfg={cfg} lastUpdated={detail.lastUpdated} onOpenUpload={() => setUploadOpen(true)} />

      {isAdmin && (
        <div style={{ marginBottom: 16, padding: '10px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--muted2)', fontFamily: "'DM Mono',monospace" }}>Weeks uploaded:</span>
          <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 4 }}>(re-upload any week to update tracks)</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flex: 1 }}>
            {detail.weekly.map((w, i) => {
              const isLast = i === detail.weekly.length - 1;
              return (
                <span key={w.w} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontFamily: "'DM Mono',monospace", padding: '3px 10px', borderRadius: 20, background: isLast ? 'rgba(104,53,251,0.15)' : 'var(--surface2)', border: `1px solid ${isLast ? 'rgba(104,53,251,0.4)' : 'var(--border)'}`, color: isLast ? 'var(--accent)' : 'var(--muted2)' }}>
                  {w.w} <span style={{ fontSize: 10, color: 'var(--muted)' }}>({w.on}/{w.pa}/{w.mi})</span>
                  <button onClick={() => handleDeleteWeek(i)} title={`Delete ${w.w}`} style={{ background: 'transparent', border: 'none', color: isLast ? 'var(--accent)' : 'var(--muted)', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: '0 0 0 4px', opacity: 0.7 }}>✕</button>
                </span>
              );
            })}
          </div>
          <button onClick={handleResetCohort} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, border: '1px solid rgba(252,73,23,0.35)', background: 'rgba(252,73,23,0.08)', color: '#FC4917', cursor: 'pointer', whiteSpace: 'nowrap' }} title="Clear all data for this cohort and start fresh">⚠ Reset cohort</button>
        </div>
      )}

      {last && (
        <div className="metrics">
          <div className="mc t-accent"><div className="lbl"><span className="sdot"></span>Active — {last.w}{suffix}</div><div className="val">{activeNow}</div><div className={`delta ${ar >= 40 ? 'c-green' : 'c-red'}`}>{ar}% of cohort</div></div>
          <div className="mc t-green"><div className="lbl">On Track</div><div className="val">{last.on}</div><div className="delta c-muted">{Math.round((last.on / total) * 100)}%</div></div>
          <div className="mc t-amber"><div className="lbl">Passive</div><div className="val">{last.pa}</div><div className="delta c-muted">{Math.round((last.pa / total) * 100)}%</div></div>
          <div className="mc t-red"><div className="lbl">Missed</div><div className="val">{last.mi}</div><div className={`delta ${mr < 60 ? 'c-amber' : 'c-red'}`}>{mr}% drop-off</div></div>
          <div className="mc t-accent"><div className="lbl">Retention vs W1</div><div className="val">{ret}%</div><div className={`delta ${ret >= 40 ? 'c-green' : 'c-red'}`}>{filteredWeekly.length}w</div></div>
          <div className="mc t-purple"><div className="lbl">At risk</div><div className="val">{atRiskCount}</div><div className="delta c-red">4+ missed</div></div>
        </div>
      )}

      <div className="grid2">
        <div className="card"><div className="card-hdr"><div><h3>Retention curve</h3><div className="sub">% cohort active each week</div></div></div>{retChartConfig && <ChartCanvas config={retChartConfig} ariaLabel="Retention curve" />}</div>
        <div className="card"><div className="card-hdr"><div><h3>Weekly missed rate</h3><div className="sub">% missed each week</div></div></div>{churnChartConfig && <ChartCanvas config={churnChartConfig} ariaLabel="Missed rate" />}</div>
        <div className="card">
          <div className="card-hdr"><div><h3>Focus group distribution</h3><div className="sub">Based on last 3 weeks</div></div></div>
          <div className="fg-list">
            <FgBar label="FG1 — Highly engaged" color="#22c98a" count={fgCounts.f1} total={fgCounts.t} />
            <FgBar label="FG2 — Moderately engaged" color="#f5a623" count={fgCounts.f2} total={fgCounts.t} />
            <FgBar label="FG3 — Disengaged" color="#f05252" count={fgCounts.f3} total={fgCounts.t} />
            <div style={{ marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--muted2)' }}>Based on last 3 weeks · {filteredLearners.length} learners</div>
          </div>
        </div>
        <div className="card"><div className="card-hdr"><div><h3>Focus group trend</h3><div className="sub">How engagement tiers shift</div></div></div>{fgTrendConfig && <ChartCanvas config={fgTrendConfig} ariaLabel="FG trend" />}</div>
        <LearnerTable cohortName={cohortName} learners={filteredLearners} weekly={detail.weekly} isAdmin={isAdmin} onMutated={onMutated} />
      </div>

      {uploadOpen && (
        <UploadModal cohortName={cohortName} weekInProgress={detail.weekInProgress} onClose={() => setUploadOpen(false)} onUploaded={async (r) => { setUploadOpen(false); await onMutated(); if (r.message) alert(r.message); }} />
      )}
      {phaseModalOpen && (
        <PhaseModal cohortName={cohortName} currentLabel={displayLabel} onClose={() => setPhaseModalOpen(false)} onChanged={onMutated} />
      )}
    </div>
  );
}

function FgBar({ label, color, count, total }) {
  const pct = Math.round((count / total) * 100) || 0;
  return (
    <div>
      <div className="fg-label-row"><span className="fg-name" style={{ color }}>{label}</span><span className="fg-count">{count} ({pct}%)</span></div>
      <div className="fg-bar-bg"><div className="fg-bar" style={{ width: pct + '%', background: color }}></div></div>
    </div>
  );
}

function UploadZone({ cohortName, cfg, lastUpdated, onOpenUpload }) {
  return (
    <div className="upload-zone" onClick={onOpenUpload}>
      <div className="info">
        <h4>Upload {cohortName} — this week's LXD export</h4>
        <p>{cfg.multiTrack ? 'Upload per track (Java/Node/Python). Track auto-detected from filename.' : 'Upload the .xlsx exported from LXD.'}</p>
        <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>Track column auto-updates by matching mobile numbers from the file</p>
        {lastUpdated && <div className="last-updated">Last updated: {lastUpdated}</div>}
      </div>
      <label className="upload-label" onClick={(e) => e.stopPropagation()}>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 16 16"><path d="M8 2v8M5 5l3-3 3 3M2 11v1a2 2 0 002 2h8a2 2 0 002-2v-1" /></svg>
        <span onClick={onOpenUpload} style={{ cursor: 'pointer' }}>Upload LXD export</span>
      </label>
    </div>
  );
}
