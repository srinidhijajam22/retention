import { db } from '../db.js';
import { COHORTS } from './config.js';

export function personFromUsername(username) {
  return username.charAt(0).toUpperCase() + username.slice(1);
}

export function getAssignmentsMap() {
  const rows = db.prepare('SELECT * FROM assignments').all();
  const map = { Manasvi: {}, Srinidhi: {} };
  for (const r of rows) {
    if (!map[r.person]) map[r.person] = {};
    if (!map[r.person][r.cohort_name]) map[r.person][r.cohort_name] = [];
    map[r.person][r.cohort_name].push(r.track);
  }
  return map;
}

export function getAccessibleCohorts(user) {
  if (user.role === 'admin') return COHORTS;
  const person = personFromUsername(user.username);
  const assigned = getAssignmentsMap()[person] || {};
  const cohorts = Object.keys(assigned).filter((c) => assigned[c] && assigned[c].length > 0);
  return cohorts.length > 0 ? cohorts : COHORTS;
}

export function getAccessibleTracks(user, cohortName) {
  if (user.role === 'admin') return null;
  const person = personFromUsername(user.username);
  const assigned = getAssignmentsMap()[person]?.[cohortName];
  return assigned && assigned.length > 0 ? assigned : null;
}
