import { api } from '../lib/api.js';

const PEOPLE = ['Manasvi', 'Srinidhi'];

export default function SettingsModal({ cohorts, assignments, onClose, onChanged }) {
  async function toggle(person, cohortName, track, checked) {
    await api.toggleAssignment(person, cohortName, track, checked);
    onChanged();
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ maxWidth: 620 }}>
        <div className="modal-header">
          <div><h3>Admin Settings</h3><div className="mh-sub">Manage cohort assignments for Manasvi and Srinidhi</div></div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ padding: '20px 22px' }}>
          <div style={{ fontSize: 12, color: 'var(--muted2)', marginBottom: 12, fontFamily: "'DM Mono',monospace" }}>COHORT &amp; TRACK ASSIGNMENTS — persistent until changed</div>
          {PEOPLE.map((person) => (
            <div key={person} style={{ marginBottom: 20, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '14px 16px' }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(104,53,251,0.2)', border: '1px solid rgba(104,53,251,0.4)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--accent)' }}>{person[0]}</span>
                {person}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {cohorts.map((c) => {
                  const assigned = assignments[person]?.[c.name] || [];
                  const phaseClass = c.config.phase === 'sysdesign' ? 'phase-sysdesign' : c.config.phase === 'ai' ? 'phase-ai' : 'phase-java';
                  return (
                    <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '8px 10px', background: 'var(--surface)', borderRadius: 6, border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', minWidth: 80 }}>{c.name}</span>
                      <span className={`phase-badge ${phaseClass}`} style={{ fontSize: 10 }}>{c.config.label}</span>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginLeft: 'auto' }}>
                        {c.config.tracks.map((t) => {
                          const isChecked = assigned.includes(t);
                          return (
                            <label key={t} style={{
                              display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12,
                              color: isChecked ? 'var(--accent)' : 'var(--muted2)',
                              background: isChecked ? 'rgba(104,53,251,0.12)' : 'transparent',
                              border: `1px solid ${isChecked ? 'rgba(104,53,251,0.35)' : 'var(--border)'}`,
                              borderRadius: 20, padding: '3px 10px', transition: 'all .15s',
                            }}>
                              <input type="checkbox" checked={isChecked} onChange={(e) => toggle(person, c.name, t, e.target.checked)} style={{ display: 'none' }} />
                              {t.charAt(0) + t.slice(1).toLowerCase()}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
