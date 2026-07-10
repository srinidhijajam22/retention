import { PHASE_COLORS } from '../lib/config.js';

export default function CohortNav({ cohorts, activeCohort, onSelect, isAdmin }) {
  return (
    <nav className="cohort-nav">
      <button className={'cohort-tab' + (activeCohort === null ? ' active' : '')} onClick={() => onSelect(null)}>
        Overview
      </button>
      {cohorts.map((c) => {
        const override = c.phaseOverride;
        const phaseTag = override
          ? override.label.split(' ')[0].substring(0, 4)
          : c.config.phase === 'ai' ? 'AI' : c.config.phase === 'sysdesign' ? 'SD' : 'J·N' + (c.config.tracks.includes('PYTHON') ? '·P' : '');
        const trackTag = !isAdmin && c.accessibleTracks ? ` (${c.accessibleTracks.join('+')})` : '';
        return (
          <button
            key={c.name}
            className={'cohort-tab' + (activeCohort === c.name ? ' active' : '')}
            onClick={() => onSelect(c.name)}
          >
            <span className="dot" style={{ background: c.hasData ? c.color : 'var(--muted)' }}></span>
            {c.name} <span style={{ fontSize: 10, opacity: 0.55, marginLeft: 2 }}>{phaseTag}</span>
            {trackTag && <span style={{ fontSize: 9, opacity: 0.7, color: 'var(--accent)' }}>{trackTag}</span>}
          </button>
        );
      })}
    </nav>
  );
}
