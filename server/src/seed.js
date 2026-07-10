import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';
import { COHORTS, USERS_SEED, DEFAULT_PASSWORD } from './lib/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function seedUsers() {
  const isProd = process.env.NODE_ENV === 'production';
  const password = process.env.SEED_PASSWORD;

  if (!password && isProd) {
    console.error(
      '\nRefusing to seed with the default password in production.\n' +
      'Set a SEED_PASSWORD environment variable (a strong, random password shared by the\n' +
      'seeded accounts) before running `npm run seed`, e.g.:\n\n' +
      '  SEED_PASSWORD="<something long and random>" npm run seed\n'
    );
    process.exit(1);
  }

  const effectivePassword = password || DEFAULT_PASSWORD;
  const insert = db.prepare('INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)');
  const hash = bcrypt.hashSync(effectivePassword, 10);
  const tx = db.transaction(() => {
    for (const u of USERS_SEED) insert.run(u.username, hash, u.role);
  });
  tx();

  if (password) {
    console.log(`Seeded ${USERS_SEED.length} users with the password from SEED_PASSWORD.`);
  } else {
    console.log(`Seeded ${USERS_SEED.length} users (default password: ${DEFAULT_PASSWORD}) — DEV ONLY, do not use in production.`);
  }
}

function ensureCohort(name) {
  db.prepare('INSERT OR IGNORE INTO cohorts (name) VALUES (?)').run(name);
  return db.prepare('SELECT * FROM cohorts WHERE name = ?').get(name);
}

function seedC17() {
  const cohort = ensureCohort('BEL C17');
  const existing = db.prepare('SELECT COUNT(*) c FROM learners WHERE cohort_id = ?').get(cohort.id).c;
  if (existing > 0) {
    console.log('BEL C17 already has learner data — skipping seed.');
    return;
  }
  const raw = fs.readFileSync(path.join(__dirname, 'data', 'c17_seed.json'), 'utf8');
  const { weekly, learners, lastUpdated } = JSON.parse(raw);

  const insertWeek = db.prepare('INSERT INTO weeks (cohort_id, idx, label, on_count, pa_count, mi_count) VALUES (?, ?, ?, ?, ?, ?)');
  const insertLearner = db.prepare('INSERT INTO learners (cohort_id, name, mobile, email, track) VALUES (?, ?, ?, ?, ?)');
  const insertAttendance = db.prepare('INSERT INTO attendance (learner_id, week_id, status) VALUES (?, ?, ?)');
  const setLastUpdated = db.prepare('UPDATE cohorts SET last_updated = ? WHERE id = ?');

  const tx = db.transaction(() => {
    const weekIds = weekly.map((w, i) => insertWeek.run(cohort.id, i, w.w, w.on, w.pa, w.mi).lastInsertRowid);
    for (const l of learners) {
      const learnerId = insertLearner.run(cohort.id, l.name, l.mobile, l.email, l.track || 'JAVA').lastInsertRowid;
      l.history.forEach((status, i) => {
        if (weekIds[i] == null) return;
        insertAttendance.run(learnerId, weekIds[i], status);
      });
    }
    setLastUpdated.run(lastUpdated, cohort.id);
  });
  tx();
  console.log(`Seeded BEL C17 with ${learners.length} learners across ${weekly.length} week(s).`);
}

function seedEmptyCohorts() {
  for (const name of COHORTS) ensureCohort(name);
  console.log('Ensured all cohort rows exist:', COHORTS.join(', '));
}

seedUsers();
seedEmptyCohorts();
seedC17();
console.log('Seed complete.');
