import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { COHORTS, ALL_TRACKS } from '../lib/config.js';
import { getAssignmentsMap } from '../lib/assignments.js';

const router = Router();

router.get('/', requireAuth, (req, res) => {
  res.json({ assignments: getAssignmentsMap() });
});

router.post('/toggle', requireAuth, requireAdmin, (req, res) => {
  const { person, cohort, track, checked } = req.body || {};
  if (!['Manasvi', 'Srinidhi'].includes(person)) return res.status(400).json({ error: 'Invalid person' });
  if (!COHORTS.includes(cohort)) return res.status(400).json({ error: 'Invalid cohort' });
  if (!ALL_TRACKS.includes(track)) return res.status(400).json({ error: 'Invalid track' });

  if (checked) {
    db.prepare('INSERT OR IGNORE INTO assignments (person, cohort_name, track) VALUES (?, ?, ?)').run(person, cohort, track);
  } else {
    db.prepare('DELETE FROM assignments WHERE person = ? AND cohort_name = ? AND track = ?').run(person, cohort, track);
  }
  res.json({ assignments: getAssignmentsMap() });
});

export default router;
