import ChartCanvas from './ChartCanvas.jsx';

function lastValidWeek(weekly) {
  const valid = weekly.filter((w) => w && w.on !== undefined);
  return valid.length ? valid[valid.length - 1] : null;
}

function Rankings({ cohorts, onSelect }) {
  const withData = cohorts.filter((c) => c.weekly.length > 0);
  if (!withData.length) {
    return (
      <div className="grid2" style={{ marginBottom: 16 }}>
        <div className="card"><div className="card-hdr"><div><h3>🏆 Best performing cohorts</h3><div className="sub">Ranked by current week active %</div></div></div>
          <div style={{ fontSize: 12, color: 'var(--muted2)', padding: 8 }}>No cohort data uploaded yet.</div>
        </div>
        <div className="card"><div className="card-hdr"><div><h3>⚠ Needs attention</h3><div className="sub">Ranked by highest missed % this week</div></div></div></div>
      </div>
    );
  }
  const stats = withData.map((c) => {
    const last = lastValidWeek(c.weekly);
    if (!last) return null;
    const total = last.on + last.pa + last.mi || 1;
    const activeRate = Math.round(((last.on + last.pa) / total) * 100);
    const missRate = Math.round((last.mi / total) * 100);
    const phaseLabel = c.phaseOverride ? c.phaseOverride.label : c.config.label;
    return { c: c.name, activeRate, missRate, color: c.color, phaseLabel, last, weeks: c.weekly.length };
  }).filter(Boolean);

  const medals = ['🥇', '🥈', '🥉'];
  const byActive = [...stats].sort((a, b) => b.activeRate - a.activeRate);
  const byMissed = [...stats].sort((a, b) => b.missRate - a.missRate);

  return (
    <div className="grid2" style={{ marginBottom: 16 }}>
      <div className="card">
        <div className="card-hdr"><div><h3>🏆 Best performing cohorts</h3><div className="sub">Ranked by current week active %</div></div></div>
        <div>
          {byActive.map((s, i) => (
            <div key={s.c} className="rank-item" onClick={() => onSelect(s.c)}>
              <span className="rank-num">{medals[i] || `${i + 1}.`}</span>
              <div className="rank-info">
                <div className="rank-name">{s.c} <span style={{ fontSize: 10, color: 'var(--muted2)' }}>{s.phaseLabel}</span></div>
                <div className="rank-bar-bg"><div className="rank-bar" style={{ width: s.activeRate + '%', background: s.color }}></div></div>
                <div className="rank-sub">{s.last.on} on track · {s.last.pa} passive</div>
              </div>
              <span className="rank-val" style={{ color: s.color }}>{s.activeRate}%</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="card-hdr"><div><h3>⚠ Needs attention</h3><div className="sub">Ranked by highest missed % this week</div></div></div>
        <div>
          {byMissed.map((s, i) => {
            const col = s.missRate > 70 ? '#FC4917' : s.missRate > 50 ? '#F42479' : '#54F9DA';
            return (
              <div key={s.c} className="rank-item" onClick={() => onSelect(s.c)}>
                <span className="rank-num">{i + 1}.</span>
                <div className="rank-info">
                  <div className="rank-name">{s.c} <span style={{ fontSize: 10, color: 'var(--muted2)' }}>{s.phaseLabel}</span></div>
                  <div className="rank-bar-bg"><div className="rank-bar" style={{ width: s.missRate + '%', background: col }}></div></div>
                  <div className="rank-sub">{s.last.mi} missed · {s.weeks} weeks tracked</div>
                </div>
                <span className="rank-val" style={{ color: col }}>{s.missRate}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MiniChart({ cohort, onSelect }) {
  const last = lastValidWeek(cohort.weekly);
  if (!last) return null;
  const total = last.on + last.pa + last.mi || 1;
  const ar = Math.round(((last.on + last.pa) / total) * 100);
  const mr = Math.round((last.mi / total) * 100);
  const phaseLabel = cohort.phaseOverride ? cohort.phaseOverride.label : cohort.config.label;
  const valid = cohort.weekly.filter((w) => w && w.on !== undefined);
  const config = {
    type: 'bar',
    data: {
      labels: valid.map((w) => w.w),
      datasets: [
        { label: 'On Track', data: valid.map((w) => w.on || 0), backgroundColor: 'rgba(84,249,218,0.75)', borderRadius: 2 },
        { label: 'Passive', data: valid.map((w) => w.pa || 0), backgroundColor: 'rgba(245,247,107,0.65)', borderRadius: 2 },
        { label: 'Missed', data: valid.map((w) => w.mi || 0), backgroundColor: 'rgba(252,73,23,0.55)', borderRadius: 2 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false, backgroundColor: 'rgba(19,21,31,0.96)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, titleColor: '#e2e4ed', bodyColor: '#8891a8' } },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { color: '#5c6070', font: { size: 9 }, autoSkip: true, maxRotation: 0, maxTicksLimit: 8 } },
        y: { stacked: true, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#5c6070', font: { size: 9 } } },
      },
    },
  };
  return (
    <div className="mini-chart-card" onClick={() => onSelect(cohort.name)}>
      <div className="mini-chart-hdr">
        <div>
          <div className="mini-chart-title">
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: cohort.color, marginRight: 6, boxShadow: `0 0 6px ${cohort.color}` }}></span>
            {cohort.name}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted2)', fontFamily: 'DM Mono,monospace', marginTop: 2 }}>{phaseLabel} · {cohort.weekly.length} weeks</div>
        </div>
        <div className="mini-chart-stats">
          <span className="mini-stat" style={{ color: '#54F9DA' }}>{ar}% active</span>
          <span className="mini-stat" style={{ color: '#FC4917', marginLeft: 8 }}>{mr}% missed</span>
        </div>
      </div>
      <ChartCanvas config={config} height={130} ariaLabel={`Mini chart ${cohort.name}`} />
    </div>
  );
}

export default function OverviewView({ cohorts, onSelectCohort }) {
  const withData = cohorts.filter((c) => c.weekly.length > 0);
  return (
    <div>
      <Rankings cohorts={cohorts} onSelect={onSelectCohort} />
      <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 500, fontFamily: 'var(--font-heading)' }}>Weekly engagement — all cohorts</h3>
          <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 2 }}>On Track / Passive / Missed trend per cohort · click any to drill in</div>
        </div>
        <div className="legend" style={{ flexShrink: 0 }}>
          <span><i style={{ background: '#54F9DA' }}></i>On Track</span>
          <span><i style={{ background: '#F5F76B' }}></i>Passive</span>
          <span><i style={{ background: '#FC4917' }}></i>Missed</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 14, marginBottom: 16 }}>
        {withData.length ? withData.map((c) => <MiniChart key={c.name} cohort={c} onSelect={onSelectCohort} />) : (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: 'var(--muted2)', fontSize: 13 }}>No cohort data yet. Upload LXD exports to see charts here.</div>
        )}
      </div>
    </div>
  );
}
