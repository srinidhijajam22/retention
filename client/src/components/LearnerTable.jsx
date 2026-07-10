import { useMemo, useState } from 'react';
import { getFocusGroup, isAtRisk, getPriority } from '../lib/priority.js';
import { api } from '../lib/api.js';

const ALL_TRACKS = ['JAVA', 'NODE', 'PYTHON', 'AI', 'SYSDESIGN'];

export default function LearnerTable({ cohortName, learners, weekly, isAdmin, onMutated }) {
  const [weekIdx, setWeekIdx] = useState(weekly.length - 1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [bulkTrack, setBulkTrack] = useState('');
  const [flashMobile, setFlashMobile] = useState(null);

  const effectiveWeekIdx = Math.min(weekIdx, weekly.length - 1);
  const showFrom = Math.max(0, effectiveWeekIdx - 7);
  const weekLabels = weekly.slice(showFrom, effectiveWeekIdx + 1).map((x) => x.w);

  const rows = useMemo(() => {
    const s = search.toLowerCase();
    return learners.filter((l) => {
      if (s && !l.name.toLowerCase().includes(s) && !l.email.toLowerCase().includes(s) && !String(l.mobile).includes(s)) return false;
      const fg = getFocusGroup(l.history);
      if (filter === 'fg1') return fg === 'FG1';
      if (filter === 'fg2') return fg === 'FG2';
      if (filter === 'fg3') return fg === 'FG3';
      if (filter === 'atrisk') return isAtRisk(l.history);
      return true;
    });
  }, [learners, search, filter]);

  async function updateTrack(mobile, track) {
    setFlashMobile(mobile);
    await api.updateTrack(cohortName, mobile, track);
    await onMutated();
    setTimeout(() => setFlashMobile(null), 600);
  }

  async function applyBulk() {
    if (!bulkTrack) { alert('Please select a track first.'); return; }
    if (!rows.length) { alert('No learners match the current filter.'); return; }
    if (!confirm(`Set track to ${bulkTrack} for ${rows.length} learner(s)? This updates all currently visible learners.`)) return;
    await api.bulkTrack(cohortName, rows.map((l) => l.mobile), bulkTrack);
    await onMutated();
    setBulkTrack('');
  }

  return (
    <div className="card full">
      <div className="card-hdr">
        <div><h3>Learner-level view</h3><div className="sub">Individual attendance · contact · track</div></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {isAdmin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(104,53,251,0.08)', border: '1px solid rgba(104,53,251,0.25)', borderRadius: 8, padding: '5px 12px' }}>
              <span style={{ fontSize: 11, color: 'var(--muted2)' }}>Set all visible to:</span>
              <select className="track-edit-select" style={{ minWidth: 100 }} value={bulkTrack} onChange={(e) => setBulkTrack(e.target.value)}>
                <option value="">— pick track</option>
                {ALL_TRACKS.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
              </select>
              <button style={{ fontSize: 11, padding: '4px 12px', borderRadius: 6, background: 'var(--accent)', border: 'none', color: '#fff', cursor: 'pointer' }} onClick={applyBulk}>Apply</button>
            </div>
          )}
          <select value={effectiveWeekIdx} onChange={(e) => setWeekIdx(parseInt(e.target.value, 10))}>
            {weekly.map((w, i) => <option key={w.w} value={i}>{w.w}</option>)}
          </select>
        </div>
      </div>
      <div className="table-controls">
        <input className="search-input" type="text" placeholder="Search name, email or phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="tab-group">
          <button className={'tab' + (filter === 'all' ? ' active' : '')} onClick={() => setFilter('all')}>All</button>
          <button className={'tab fg1' + (filter === 'fg1' ? ' active' : '')} onClick={() => setFilter('fg1')}>FG1</button>
          <button className={'tab fg2' + (filter === 'fg2' ? ' active' : '')} onClick={() => setFilter('fg2')}>FG2</button>
          <button className={'tab fg3' + (filter === 'fg3' ? ' active' : '')} onClick={() => setFilter('fg3')}>FG3</button>
          <button className={'tab' + (filter === 'atrisk' ? ' active' : '')} onClick={() => setFilter('atrisk')}>At risk</button>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th><th>Mobile</th><th>Email</th>
              <th>Track {isAdmin && <span style={{ fontSize: 9, color: 'var(--accent)', fontWeight: 400 }}>[editable]</span>}</th>
              {weekLabels.map((w) => <th key={w}>{w}</th>)}
              <th>FG</th><th>Priority</th><th>Active %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => {
              const hist = l.history.slice(0, effectiveWeekIdx + 1);
              const wc = hist.slice(showFrom);
              const on = hist.filter((s) => s === 'On Track').length;
              const pa = hist.filter((s) => s === 'Passive').length;
              const mi = hist.filter((s) => s === 'Missed').length;
              const tot = on + pa + mi || 1;
              const ap = Math.round(((on + pa) / tot) * 100);
              const fg = getFocusGroup(hist);
              const weekStatus = hist[hist.length - 1] || 'Missed';
              const pr = getPriority(weekStatus, fg);
              const fgCls = fg === 'FG1' ? 'pill-fg1' : fg === 'FG2' ? 'pill-fg2' : 'pill-fg3';
              const currentTrack = l.track || 'JAVA';
              const apColor = ap >= 50 ? '#54F9DA' : ap >= 30 ? '#F5F76B' : '#FC4917';
              const risk = isAtRisk(l.history);
              return (
                <tr key={l.mobile}>
                  <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {l.name}
                    {risk && <span className="pill" style={{ background: 'rgba(252,73,23,0.15)', color: '#FC4917', border: '1px solid rgba(252,73,23,0.3)', marginLeft: 4 }}>risk</span>}
                  </td>
                  <td style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'var(--muted2)' }}>+{l.mobile}</td>
                  <td style={{ color: 'var(--accent)', fontSize: 12 }}>{l.email}</td>
                  <td style={{ transition: 'background .3s', background: flashMobile === l.mobile ? 'rgba(104,53,251,0.15)' : 'transparent' }}>
                    {isAdmin ? (
                      <select className="track-edit-select" value={currentTrack} onChange={(e) => updateTrack(l.mobile, e.target.value)} title="Change track">
                        {ALL_TRACKS.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
                      </select>
                    ) : (
                      <span className={`pill pill-${currentTrack.toLowerCase()}`}>{currentTrack}</span>
                    )}
                  </td>
                  {wc.map((s, i) => {
                    const cls = s === 'On Track' ? 'pill-on' : s === 'Passive' ? 'pill-pa' : 'pill-mi';
                    const lb = s === 'On Track' ? 'ON' : s === 'Passive' ? 'PA' : 'MI';
                    return <td key={i}><span className={`pill ${cls}`}>{lb}</span></td>;
                  })}
                  <td><span className={`pill ${fgCls}`}>{fg}</span></td>
                  <td>{pr ? <span className={`pill pill-${pr.toLowerCase()}`}>{pr}</span> : <span style={{ fontSize: 11, color: 'var(--muted2)' }}>—</span>}</td>
                  <td style={{ fontFamily: "'DM Mono',monospace", color: apColor }}>{ap}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="table-footer">Showing {rows.length} of {learners.length} learners{isAdmin ? ' · Track column is editable' : ''}</div>
    </div>
  );
}
