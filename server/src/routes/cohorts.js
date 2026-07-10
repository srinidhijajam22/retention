import { Router } from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { COHORTS, COHORT_PHASES, COHORT_COLORS, ALL_TRACKS } from '../lib/config.js';
import { getCohortRow, getWeeks, serializeCohort } from '../lib/cohortData.js';

import { getAccessibleCohorts, getAccessibleTracks } from '../lib/assignments.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function assertAccessible(req, res, name) {
  if (!COHORTS.includes(name)) {
    res.status(404).json({ error: 'Unknown cohort' });
    return false;
  }
  const accessible = getAccessibleCohorts(req.user);
  if (!accessible.includes(name)) {
    res.status(403).json({ error: 'You do not have access to this cohort' });
    return false;
  }
  return true;
}

router.get('/', requireAuth, (req, res) => {
  const accessible = getAccessibleCohorts(req.user);
  const list = accessible.map((name) => {
    const cohort = getCohortRow(name);
    const weeks = getWeeks(cohort.id);
    const cfg = COHORT_PHASES[name];
    const phaseOverride = cohort.phase_override_key
      ? { key: cohort.phase_override_key, label: cohort.phase_override_label, cssClass: cohort.phase_override_class }
      : null;
    return {
      name,
      color: COHORT_COLORS[name],
      config: cfg,
      hasData: weeks.length > 0,
      weekCount: weeks.length,
      weekly: weeks.map((w) => ({ w: w.label, on: w.on_count, pa: w.pa_count, mi: w.mi_count })),
      lastUpdated: cohort.last_updated || null,
      phaseOverride,
      accessibleTracks: getAccessibleTracks(req.user, name),
    };
  });
  res.json({ cohorts: list });
});

router.get('/:name', requireAuth, (req, res) => {
  const { name } = req.params;
  if (!assertAccessible(req, res, name)) return;
  res.json(serializeCohort(name));
});

// ─── Track edits ───
router.put('/:name/learners/:mobile/track', requireAuth, (req, res) => {
  const { name, mobile } = req.params;
  if (!assertAccessible(req, res, name)) return;
  const { track } = req.body || {};
  if (!ALL_TRACKS.includes(track)) return res.status(400).json({ error: 'Invalid track' });
  const cohort = getCohortRow(name);
  const result = db.prepare('UPDATE learners SET track = ? WHERE cohort_id = ? AND mobile = ?').run(track, cohort.id, mobile);
  if (result.changes === 0) return res.status(404).json({ error: 'Learner not found' });
  res.json(serializeCohort(name));
});

router.post('/:name/learners/bulk-track', requireAuth, (req, res) => {
  const { name } = req.params;
  if (!assertAccessible(req, res, name)) return;
  const { mobiles, track } = req.body || {};
  if (!ALL_TRACKS.includes(track)) return res.status(400).json({ error: 'Invalid track' });
  if (!Array.isArray(mobiles) || !mobiles.length) return res.status(400).json({ error: 'No learners specified' });
  const cohort = getCohortRow(name);
  const stmt = db.prepare('UPDATE learners SET track = ? WHERE cohort_id = ? AND mobile = ?');
  const tx = db.transaction((list) => {
    for (const m of list) stmt.run(track, cohort.id, m);
  });
  tx(mobiles);
  res.json(serializeCohort(name));
});

// ─── Phase override ───
router.put('/:name/phase', requireAuth, (req, res) => {
  const { name } = req.params;
  if (!assertAccessible(req, res, name)) return;
  const { key, label, cssClass } = req.body || {};
  if (!label) return res.status(400).json({ error: 'label is required' });
  const cohort = getCohortRow(name);
  db.prepare('UPDATE cohorts SET phase_override_key = ?, phase_override_label = ?, phase_override_class = ? WHERE id = ?')
    .run(key || 'custom', label, cssClass || 'phase-ai', cohort.id);
  res.json(serializeCohort(name));
});

router.delete('/:name/phase', requireAuth, (req, res) => {
  const { name } = req.params;
  if (!assertAccessible(req, res, name)) return;
  const cohort = getCohortRow(name);
  db.prepare('UPDATE cohorts SET phase_override_key = NULL, phase_override_label = NULL, phase_override_class = NULL WHERE id = ?').run(cohort.id);
  res.json(serializeCohort(name));
});

// ─── Week management ───
router.delete('/:name/weeks/:idx', requireAuth, (req, res) => {
  const { name } = req.params;
  if (!assertAccessible(req, res, name)) return;
  const idx = parseInt(req.params.idx, 10);
  const cohort = getCohortRow(name);
  const weeks = getWeeks(cohort.id);
  const target = weeks.find((w) => w.idx === idx);
  if (!target) return res.status(404).json({ error: 'Week not found' });

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM outreach WHERE cohort_id = ? AND week_label = ?').run(cohort.id, target.label);
    db.prepare('DELETE FROM weeks WHERE id = ?').run(target.id); // cascades attendance
    // Shift subsequent week indices/labels down by one to stay contiguous, like the original array splice.
    const later = weeks.filter((w) => w.idx > idx).sort((a, b) => a.idx - b.idx);
    for (const w of later) {
      const newIdx = w.idx - 1;
      const newLabel = 'W' + (newIdx + 1);
      db.prepare('UPDATE weeks SET idx = ?, label = ? WHERE id = ?').run(newIdx, newLabel, w.id);
      db.prepare('UPDATE outreach SET week_label = ? WHERE cohort_id = ? AND week_label = ?').run(newLabel, cohort.id, w.label);
    }
    // If the deleted week was mid-upload, clear any in-progress marker referencing it.
    const c = getCohortRow(name);
    if (c.week_in_progress) {
      const wip = JSON.parse(c.week_in_progress);
      if (wip.wLabel === target.label) db.prepare('UPDATE cohorts SET week_in_progress = NULL WHERE id = ?').run(cohort.id);
    }
  });
  tx();
  res.json(serializeCohort(name));
});

// ─── Reset cohort ───
router.post('/:name/reset', requireAuth, (req, res) => {
  const { name } = req.params;
  if (!assertAccessible(req, res, name)) return;
  const cohort = getCohortRow(name);
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM outreach WHERE cohort_id = ?').run(cohort.id);
    db.prepare('DELETE FROM weeks WHERE cohort_id = ?').run(cohort.id); // cascades attendance
    db.prepare('DELETE FROM learners WHERE cohort_id = ?').run(cohort.id);
    db.prepare('UPDATE cohorts SET week_in_progress = NULL, phase_override_key = NULL, phase_override_label = NULL, phase_override_class = NULL, last_updated = NULL WHERE id = ?').run(cohort.id);
  });
  tx();
  res.json(serializeCohort(name));
});

// ─── Upload LXD export ───
function detectTrack(fname) {
  const f = (fname || '').toLowerCase();
  if (f.includes('java')) return 'JAVA';
  if (f.includes('node')) return 'NODE';
  if (f.includes('python')) return 'PYTHON';
  if (f.includes('ai') || f.includes('artificial')) return 'AI';
  if (f.includes('sysdesign') || f.includes('system')) return 'SYSDESIGN';
  return null;
}

function normalizeMobile(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  return digits.length >= 10 ? digits : '';
}

router.post('/:name/upload', requireAuth, upload.single('file'), (req, res) => {
  const { name } = req.params;
  if (!assertAccessible(req, res, name)) return;
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const cfg = COHORT_PHASES[name];
  const mode = req.body.mode === 'multiple' ? 'multiple' : 'single';
  const requestedTrack = (req.body.track || '').toUpperCase();

  let rows;
  try {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  } catch (err) {
    return res.status(400).json({ error: 'Could not parse file: ' + err.message });
  }
  if (!rows.length) return res.status(400).json({ error: 'No data found in file.' });

  const keys = Object.keys(rows[0]);
  const nk = keys.find((k) => k.toLowerCase().includes('user name')) || 'User Name';
  const mk = keys.find((k) => k.toLowerCase().includes('mobile')) || 'Mobile Number';
  const ek = keys.find((k) => k.toLowerCase().includes('email')) || 'User Email';
  const sk = keys.find((k) => k.toLowerCase().includes('attendance status')) || 'Attendance Status';

  const track = requestedTrack && requestedTrack !== 'AUTO' ? requestedTrack : (detectTrack(req.file.originalname) || cfg.tracks[0] || 'JAVA');

  const weekData = {};
  for (const r of rows) {
    const mobile = normalizeMobile(r[mk]);
    if (!mobile) continue;
    const statusRaw = String(r[sk] || '').trim();
    const status = ['On Track', 'Passive', 'Missed'].includes(statusRaw) ? statusRaw : 'Missed';
    weekData[mobile] = { name: String(r[nk] || '').trim(), mobile, email: String(r[ek] || '').trim(), track, status };
  }
  const vals = Object.values(weekData);
  if (!vals.length) return res.status(400).json({ error: 'No valid learner rows (missing mobile numbers) found in file.' });
  const on = vals.filter((v) => v.status === 'On Track').length;
  const pa = vals.filter((v) => v.status === 'Passive').length;
  const mi = vals.filter((v) => v.status === 'Missed').length;

  const cohort = getCohortRow(name);
  let message = '';

  const tx = db.transaction(() => {
    const weeks = getWeeks(cohort.id);
    const weekInProgress = cohort.week_in_progress ? JSON.parse(cohort.week_in_progress) : null;
    const isMultiTrack = mode === 'multiple';
    const isNewWeek = !(isMultiTrack && weekInProgress);

    const findLearner = (mobile) => {
      let l = db.prepare('SELECT * FROM learners WHERE cohort_id = ? AND mobile = ?').get(cohort.id, mobile);
      if (!l && mobile.length > 10) {
        l = db.prepare('SELECT * FROM learners WHERE cohort_id = ? AND mobile = ?').get(cohort.id, mobile.slice(-10));
      }
      return l;
    };

    const upsertAttendance = (learnerId, weekId, status, replace) => {
      if (replace) {
        db.prepare('INSERT INTO attendance (learner_id, week_id, status) VALUES (?, ?, ?) ON CONFLICT(learner_id, week_id) DO UPDATE SET status = excluded.status').run(learnerId, weekId, status);
      } else {
        db.prepare('INSERT OR IGNORE INTO attendance (learner_id, week_id, status) VALUES (?, ?, ?)').run(learnerId, weekId, status);
      }
    };

    const updateLearnerMeta = (learnerId, v) => {
      const l = db.prepare('SELECT * FROM learners WHERE id = ?').get(learnerId);
      db.prepare('UPDATE learners SET track = ?, name = COALESCE(NULLIF(?, \'\'), name), email = COALESCE(NULLIF(?, \'\'), email) WHERE id = ?')
        .run(v.track, v.name, v.email, learnerId);
      return l;
    };

    // ── Re-upload of an already-uploaded track within an in-progress multi-track week ──
    if (!isNewWeek && weekInProgress.tracksUploaded.includes(track)) {
      const lastWeek = weeks[weeks.length - 1];
      const prev = (weekInProgress.prevCounts && weekInProgress.prevCounts[track]) || { on: 0, pa: 0, mi: 0 };
      const newOn = lastWeek.on_count - prev.on + on;
      const newPa = lastWeek.pa_count - prev.pa + pa;
      const newMi = lastWeek.mi_count - prev.mi + mi;
      db.prepare('UPDATE weeks SET on_count = ?, pa_count = ?, mi_count = ? WHERE id = ?').run(newOn, newPa, newMi, lastWeek.id);
      weekInProgress.prevCounts = weekInProgress.prevCounts || {};
      weekInProgress.prevCounts[track] = { on, pa, mi };

      for (const v of vals) {
        let l = findLearner(v.mobile);
        if (l) {
          upsertAttendance(l.id, lastWeek.id, v.status, true);
          updateLearnerMeta(l.id, v);
        }
      }
      db.prepare('UPDATE cohorts SET week_in_progress = ?, last_updated = ? WHERE id = ?').run(
        JSON.stringify(weekInProgress),
        new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' + lastWeek.label + ' · ' + track + ' re-uploaded',
        cohort.id
      );
      message = `${track} track re-uploaded for ${lastWeek.label} — counts updated for ${vals.length} learners.`;
      return;
    }

    let targetWeek;
    let nextWeekInProgress = weekInProgress;

    if (isNewWeek) {
      const idx = weeks.length;
      const label = 'W' + (idx + 1);
      const weekId = db.prepare('INSERT INTO weeks (cohort_id, idx, label, on_count, pa_count, mi_count) VALUES (?, ?, ?, ?, ?, ?)').run(cohort.id, idx, label, on, pa, mi).lastInsertRowid;
      targetWeek = { id: weekId, idx, label };
      nextWeekInProgress = isMultiTrack ? { wLabel: label, tracksUploaded: [track], prevCounts: {} } : null;
    } else {
      const lastWeek = weeks[weeks.length - 1];
      const newOn = lastWeek.on_count + on;
      const newPa = lastWeek.pa_count + pa;
      const newMi = lastWeek.mi_count + mi;
      db.prepare('UPDATE weeks SET on_count = ?, pa_count = ?, mi_count = ? WHERE id = ?').run(newOn, newPa, newMi, lastWeek.id);
      targetWeek = { id: lastWeek.id, idx: lastWeek.idx, label: lastWeek.label };
      nextWeekInProgress = { ...weekInProgress, tracksUploaded: [...weekInProgress.tracksUploaded, track] };
      nextWeekInProgress.prevCounts = nextWeekInProgress.prevCounts || {};
      nextWeekInProgress.prevCounts[track] = { on, pa, mi };
      if (nextWeekInProgress.tracksUploaded.length >= cfg.tracks.length) nextWeekInProgress = null;
    }

    // Merge learner records for this week's file.
    for (const v of vals) {
      let l = findLearner(v.mobile);
      if (l) {
        upsertAttendance(l.id, targetWeek.id, v.status, false);
        updateLearnerMeta(l.id, v);
      } else {
        const learnerId = db.prepare('INSERT INTO learners (cohort_id, name, mobile, email, track) VALUES (?, ?, ?, ?, ?)').run(cohort.id, v.name, v.mobile, v.email, v.track).lastInsertRowid;
        const priorWeeks = weeks.filter((w) => w.idx < targetWeek.idx);
        for (const w of priorWeeks) upsertAttendance(learnerId, w.id, 'Missed', false);
        upsertAttendance(learnerId, targetWeek.id, v.status, false);
      }
    }

    // Once the week is fully complete (all tracks in), pad any untouched learner with 'Missed'.
    if (!nextWeekInProgress) {
      const allLearners = db.prepare('SELECT id FROM learners WHERE cohort_id = ?').all(cohort.id);
      for (const l of allLearners) upsertAttendance(l.id, targetWeek.id, 'Missed', false);
    }

    const uploadedTracks = nextWeekInProgress ? nextWeekInProgress.tracksUploaded.join('+') : track;
    const remaining = nextWeekInProgress
      ? ' · waiting for: ' + cfg.tracks.filter((t) => !nextWeekInProgress.tracksUploaded.includes(t)).join(', ')
      : '';
    const lastUpdated = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' + targetWeek.label + ' · ' + uploadedTracks + ' uploaded' + remaining;
    db.prepare('UPDATE cohorts SET week_in_progress = ?, last_updated = ? WHERE id = ?').run(
      nextWeekInProgress ? JSON.stringify(nextWeekInProgress) : null,
      lastUpdated,
      cohort.id
    );

    const trackUpdatedCount = db.prepare('SELECT COUNT(*) c FROM learners WHERE cohort_id = ? AND track = ?').get(cohort.id, track).c;
    const totalLearners = db.prepare('SELECT COUNT(*) c FROM learners WHERE cohort_id = ?').get(cohort.id).c;
    message = `${track} track assigned to ${trackUpdatedCount} learners out of ${totalLearners} total.`;
    if (nextWeekInProgress) {
      const still = cfg.tracks.filter((t) => !nextWeekInProgress.tracksUploaded.includes(t));
      message += ` ${vals.length} learners auto-assigned to ${track} for ${targetWeek.label}.`;
      if (still.length) message += ` Still to upload: ${still.join(', ')}.`;
    }
  });

  try {
    tx();
  } catch (err) {
    return res.status(500).json({ error: 'Upload failed: ' + err.message });
  }

  res.json({ ...serializeCohort(name), message });
});

export default router;
