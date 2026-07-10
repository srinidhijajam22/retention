import { useRef, useState } from 'react';
import { TRACK_OPTIONS } from '../lib/config.js';
import { api } from '../lib/api.js';

export default function UploadModal({ cohortName, weekInProgress, onClose, onUploaded }) {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState('single');
  const [customTrack, setCustomTrack] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef(null);
  const pendingTrackRef = useRef(null);

  const sub = weekInProgress
    ? `Week in progress: ${weekInProgress.wLabel} · uploaded: ${weekInProgress.tracksUploaded.join(', ')}`
    : 'Choose how many track files you are uploading this week';

  function chooseMode(m) {
    setMode(m);
    setStep(2);
  }

  function pickTrack(track) {
    pendingTrackRef.current = track;
    fileInputRef.current?.click();
  }

  function pickCustomTrack() {
    const val = customTrack.trim().toUpperCase();
    if (!val) { alert('Please enter a track name.'); return; }
    pendingTrackRef.current = val;
    fileInputRef.current?.click();
  }

  async function onFileChosen(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', mode);
      formData.append('track', pendingTrackRef.current || 'auto');
      const result = await api.upload(cohortName, formData);
      onUploaded(result);
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <div><h3>Upload {cohortName} — LXD export</h3><div className="mh-sub">{sub}</div></div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ padding: '20px 22px' }}>
          {step === 1 && (
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted2)', marginBottom: 14 }}>How many track files are you uploading for this week?</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => chooseMode('single')} style={optBtnStyle}>
                  <span style={{ fontSize: 22 }}>📄</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>Single file</div>
                    <div style={{ fontSize: 12, color: 'var(--muted2)' }}>One file covering all learners (e.g. AI, System Design, or combined)</div>
                  </div>
                </button>
                <button onClick={() => chooseMode('multiple')} style={optBtnStyle}>
                  <span style={{ fontSize: 22 }}>📂</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>Multiple files</div>
                    <div style={{ fontSize: 12, color: 'var(--muted2)' }}>Separate files per track (Java + Node + Python)</div>
                  </div>
                </button>
              </div>
            </div>
          )}
          {step === 2 && (
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted2)', marginBottom: 14 }}>Which track is this file for?</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                {TRACK_OPTIONS.map((t) => (
                  <button key={t.key} onClick={() => pickTrack(t.key)} disabled={busy} style={{
                    padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: `1px solid ${t.border}`,
                    background: t.color, color: t.text, cursor: busy ? 'wait' : 'pointer', fontSize: 13, fontWeight: 500, textAlign: 'center',
                  }}>{t.label}</button>
                ))}
              </div>
              <div style={{ paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--muted2)', marginBottom: 8, fontFamily: "'DM Mono',monospace" }}>OR TYPE CUSTOM TRACK NAME</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" value={customTrack} onChange={(e) => setCustomTrack(e.target.value)} placeholder="e.g. LLD, DSA..." style={{ flex: 1, fontSize: 13, padding: '7px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', outline: 'none' }} />
                  <button onClick={pickCustomTrack} disabled={busy} style={{ fontSize: 13, padding: '7px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', border: 'none', color: '#fff', cursor: 'pointer' }}>Upload</button>
                </div>
              </div>
              <button onClick={() => setStep(1)} style={{ marginTop: 12, fontSize: 12, padding: '4px 0', border: 'none', background: 'transparent', color: 'var(--muted2)', cursor: 'pointer' }}>← Back</button>
              {busy && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted2)' }}><span className="spinner"></span> Uploading…</div>}
            </div>
          )}
          <input ref={fileInputRef} type="file" accept=".xlsx,.csv" style={{ display: 'none' }} onChange={onFileChosen} />
        </div>
      </div>
    </div>
  );
}

const optBtnStyle = {
  display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', cursor: 'pointer', textAlign: 'left',
};
