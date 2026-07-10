import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'retention.db');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','team'))
);

CREATE TABLE IF NOT EXISTS cohorts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  phase_override_key TEXT,
  phase_override_label TEXT,
  phase_override_class TEXT,
  week_in_progress TEXT,
  last_updated TEXT
);

CREATE TABLE IF NOT EXISTS learners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cohort_id INTEGER NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT,
  track TEXT NOT NULL DEFAULT 'JAVA',
  UNIQUE(cohort_id, mobile)
);

CREATE TABLE IF NOT EXISTS weeks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cohort_id INTEGER NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  idx INTEGER NOT NULL,
  label TEXT NOT NULL,
  on_count INTEGER NOT NULL DEFAULT 0,
  pa_count INTEGER NOT NULL DEFAULT 0,
  mi_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(cohort_id, idx)
);

CREATE TABLE IF NOT EXISTS attendance (
  learner_id INTEGER NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  week_id INTEGER NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('On Track','Passive','Missed')),
  PRIMARY KEY (learner_id, week_id)
);

CREATE TABLE IF NOT EXISTS outreach (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cohort_id INTEGER NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  week_label TEXT NOT NULL,
  mobile TEXT NOT NULL,
  assigned_to TEXT,
  outcome TEXT,
  notes TEXT,
  followup_date TEXT,
  followup_done INTEGER NOT NULL DEFAULT 0,
  UNIQUE(cohort_id, week_label, mobile)
);

CREATE TABLE IF NOT EXISTS assignments (
  person TEXT NOT NULL,
  cohort_name TEXT NOT NULL,
  track TEXT NOT NULL,
  PRIMARY KEY (person, cohort_name, track)
);

CREATE INDEX IF NOT EXISTS idx_learners_cohort ON learners(cohort_id);
CREATE INDEX IF NOT EXISTS idx_weeks_cohort ON weeks(cohort_id);
CREATE INDEX IF NOT EXISTS idx_attendance_week ON attendance(week_id);
CREATE INDEX IF NOT EXISTS idx_outreach_cohort_week ON outreach(cohort_id, week_label);
`);

export default db;
