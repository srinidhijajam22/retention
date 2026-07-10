import { useState } from 'react';
import { PHASE_OPTIONS } from '../lib/config.js';
import { api } from '../lib/api.js';

export default function PhaseModal({ cohortName, currentLabel, onClose, onChanged }) {
  const [customLabel, setCustomLabel] = useState('');

  async function setOption(p) {
    await api.setPhase(cohortName, { key: p.key, label: p.label, cssClass: p.cssClass });
    onChanged();
    onClose();
  }
  async function setCustom() {
    const label = customLabel.trim();
    if (!label) { alert('Please enter a phase label.'); return; }
    await api.setPhase(cohortName, { key: 'custom', label, cssClass: 'phase-ai' });
    onChanged();
    onClose();
  }
  async function resetOverride() {
    await api.resetPhase(cohortName);
    onChanged();
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div><h3>Change phase</h3><div className="mh-sub">{cohortName} — current: {currentLabel}</div></div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ padding: '20px 22px' }}>
          <p style={{ fontSize: 12, color: 'var(--muted2)', marginBottom: 16 }}>Select the current phase. Historical data stays unchanged.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PHASE_OPTIONS.map((p) => {
              const isActive = currentLabel === p.label;
              return (
                <button key={p.key} onClick={() => setOption(p)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${isActive ? 'rgba(104,53,251,0.4)' : 'var(--border)'}`,
                  background: isActive ? 'rgba(104,53,251,0.1)' : 'var(--surface2)', cursor: 'pointer', textAlign: 'left',
                }}>
                  <span className={`phase-badge ${p.cssClass}`} style={{ fontSize: 11 }}>{p.label}</span>
                  {isActive && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--accent)' }}>current</span>}
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--muted2)', marginBottom: 8, fontFamily: "'DM Mono',monospace" }}>OR SET CUSTOM LABEL</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="text" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} placeholder="e.g. System Design Phase 2" style={{ flex: 1, fontSize: 13, padding: '7px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', outline: 'none' }} />
              <button onClick={setCustom} style={{ fontSize: 13, padding: '7px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', border: 'none', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' }}>Set</button>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <button onClick={resetOverride} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--muted2)', cursor: 'pointer' }}>Reset to default</button>
          </div>
        </div>
      </div>
    </div>
  );
}
