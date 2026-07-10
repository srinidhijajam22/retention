import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { COHORTS, ALL_TRACKS } from '../lib/config.js';
import { getCohortRow, getWeeks, getLearnersWithHistory } from '../lib/cohortData.js';
import { getAccessibleCohorts } from '../lib/assignments.js';
import { getFocusGroup, getPriority } from '../lib/priority.js';

const router = Router();

function assertAccessible(req, res, name) {
  if (!COHORTS.includes(name)) {
    res.status(404).json({ error: 'Unknown cohort' });
    return false;
  }
  if (!getAccessibleCohorts(req.user).includes(name)) {
    res.status(403).json({ error: 'You do not have access to this cohort' });
    return false;
  }
  return true;
}

const FIELD_COLUMN = { assignedTo: 'assigned_to', outcome: 'outcome', notes: 'notes', followupDate: 'followup_date', followupDone: 'followup_done' };

router.put('/:name/outreach/:mobile', requireAuth, (req, res) => {
  const { name, mobile } = req.params;
  if (!assertAccessible(req, res, name)) return;
  const { week, field, value } = req.body || {};
  const column = FIELD_COLUMN[field];
  if (!week || !column) return res.status(400).json({ error: 'week and a valid field are required' });
  const cohort = getCohortRow(name);
  const storedValue = field === 'followupDone' ? (value ? 1 : 0) : (value ?? null) === '' ? null : value;

  db.prepare(`
    INSERT INTO outreach (cohort_id, week_label, mobile, ${column}) VALUES (?, ?, ?, ?)
    ON CONFLICT(cohort_id, week_label, mobile) DO UPDATE SET ${column} = excluded.${column}
  `).run(cohort.id, week, mobile, storedValue);

  res.json({ ok: true });
});

router.post('/:name/outreach/bulk-assign', requireAuth, (req, res) => {
  const { name } = req.params;
  if (!assertAccessible(req, res, name)) return;
  const { week, scope, person } = req.body || {};
  if (!week || !person || !['Manasvi', 'Srinidhi'].includes(person)) return res.status(400).json({ error: 'week and a valid person are required' });
  const cohort = getCohortRow(name);
  const weeks = getWeeks(cohort.id);
  const weekIdx = weeks.findIndex((w) => w.label === week);
  const learners = getLearnersWithHistory(cohort.id);

  const stmt = db.prepare(`
    INSERT INTO outreach (cohort_id, week_label, mobile, assigned_to) VALUES (?, ?, ?, ?)
    ON CONFLICT(cohort_id, week_label, mobile) DO UPDATE SET assigned_to = excluded.assigned_to
  `);

  const tx = db.transaction(() => {
    for (const l of learners) {
      const hist = weekIdx >= 0 ? l.history.slice(0, weekIdx + 1) : l.history;
      const weekStatus = hist[hist.length - 1] || 'Missed';
      const fg = getFocusGroup(hist);
      const pr = getPriority(weekStatus, fg);
      if (!pr) continue;
      let shouldAssign = false;
      if (scope === 'all') shouldAssign = true;
      else if (ALL_TRACKS.includes(scope)) shouldAssign = (l.track || 'JAVA').toUpperCase() === scope;
      else if (scope === 'p0') shouldAssign = pr === 'P0';
      else if (scope === 'p1') shouldAssign = pr === 'P1';
      else if (scope === 'p2') shouldAssign = pr === 'P2';
      if (shouldAssign) stmt.run(cohort.id, week, l.mobile, person);
    }
  });
  tx();
  res.json({ ok: true });
});

router.get('/:name/outreach/export', requireAuth, (req, res) => {
  const { name } = req.params;
  if (!assertAccessible(req, res, name)) return;
  const week = req.query.week;
  const cohort = getCohortRow(name);
  const weeks = getWeeks(cohort.id);
  const weekIdx = weeks.findIndex((w) => w.label === week);
  const learners = getLearnersWithHistory(cohort.id);
  const outreachRows = db.prepare('SELECT * FROM outreach WHERE cohort_id = ? AND week_label = ?').all(cohort.id, week || '');
  const outByMobile = new Map(outreachRows.map((r) => [r.mobile, r]));

  const rows = [['Name', 'Mobile', 'Email', 'Track', 'Focus Group', 'Priority', 'Status this week', 'Assigned To', 'Call Outcome', 'Notes', 'Follow-up Date', 'Follow-up Done']];
  for (const l of learners) {
    const hist = weekIdx >= 0 ? l.history.slice(0, weekIdx + 1) : l.history;
    const weekStatus = hist[hist.length - 1] || 'Missed';
    const fg = getFocusGroup(hist);
    const pr = getPriority(weekStatus, fg);
    if (!pr) continue;
    const rec = outByMobile.get(l.mobile) || {};
    rows.push([l.name, '+' + l.mobile, l.email, l.track || 'JAVA', fg, pr, weekStatus, rec.assigned_to || '', rec.outcome || '', rec.notes || '', rec.followup_date || '', rec.followup_done ? 'Yes' : 'No']);
  }

  const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const filename = `${name.replace(/ /g, '_')}_Outreach_${week || 'export'}_${new Date().toISOString().split('T')[0]}.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

export default router;
