import { db } from '../db.js';
import { COHORT_PHASES, COHORT_COLORS } from './config.js';

export function getCohortRow(name) {
  return db.prepare('SELECT * FROM cohorts WHERE name = ?').get(name);
}

export function getWeeks(cohortId) {
  return db.prepare('SELECT * FROM weeks WHERE cohort_id = ? ORDER BY idx ASC').all(cohortId);
}

export function getLearnersWithHistory(cohortId) {
  const weeks = getWeeks(cohortId);
  const learners = db.prepare('SELECT * FROM learners WHERE cohort_id = ? ORDER BY name ASC').all(cohortId);
  const attStmt = db.prepare('SELECT week_id, status FROM attendance WHERE learner_id = ?');
  return learners.map((l) => {
    const rows = attStmt.all(l.id);
    const byWeek = new Map(rows.map((r) => [r.week_id, r.status]));
    const history = weeks.map((w) => byWeek.get(w.id) || 'Missed');
    return { id: l.id, name: l.name, mobile: l.mobile, email: l.email, track: l.track, history };
  });
}

export function getOutreachMap(cohortId) {
  const rows = db.prepare('SELECT * FROM outreach WHERE cohort_id = ?').all(cohortId);
  const out = {};
  for (const r of rows) {
    if (!out[r.week_label]) out[r.week_label] = {};
    out[r.week_label][r.mobile] = {
      assignedTo: r.assigned_to || undefined,
      outcome: r.outcome || undefined,
      notes: r.notes || undefined,
      followupDate: r.followup_date || undefined,
      followupDone: !!r.followup_done,
    };
  }
  return out;
}

export function serializeCohort(name) {
  const cohort = getCohortRow(name);
  if (!cohort) return null;
  const weeks = getWeeks(cohort.id).map((w) => ({ w: w.label, on: w.on_count, pa: w.pa_count, mi: w.mi_count }));
  const learners = getLearnersWithHistory(cohort.id);
  const outreach = getOutreachMap(cohort.id);
  const phaseOverride = cohort.phase_override_key
    ? { key: cohort.phase_override_key, label: cohort.phase_override_label, cssClass: cohort.phase_override_class }
    : null;
  const cfg = COHORT_PHASES[name];
  return {
    name,
    weekly: weeks,
    learners,
    outreach,
    lastUpdated: cohort.last_updated || null,
    phaseOverride,
    weekInProgress: cohort.week_in_progress ? JSON.parse(cohort.week_in_progress) : null,
    config: { ...cfg, color: COHORT_COLORS[name] },
  };
}
