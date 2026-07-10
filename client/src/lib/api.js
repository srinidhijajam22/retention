const TOKEN_KEY = 'belToken';
const USER_KEY = 'belUserInfo';

// Same-origin by default (single-service deploy, or local dev via the Vite proxy).
// Set VITE_API_BASE (e.g. https://your-backend.onrender.com) when the frontend and
// backend are hosted separately, such as frontend-on-Vercel + backend-on-Render.
const API_BASE = import.meta.env.VITE_API_BASE || '';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function getStoredUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; }
}
export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function request(path, opts = {}) {
  const token = getToken();
  const headers = { ...(opts.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.body && !(opts.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${API_BASE}/api${path}`, { ...opts, headers });
  if (res.status === 401) {
    clearSession();
    window.location.reload();
    throw new Error('Session expired');
  }
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    throw new Error((isJson && data.error) || 'Request failed');
  }
  return data;
}

export const api = {
  login: (username, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  me: () => request('/auth/me'),

  listCohorts: () => request('/cohorts'),
  getCohort: (name) => request(`/cohorts/${encodeURIComponent(name)}`),
  updateTrack: (cohort, mobile, track) => request(`/cohorts/${encodeURIComponent(cohort)}/learners/${mobile}/track`, { method: 'PUT', body: JSON.stringify({ track }) }),
  bulkTrack: (cohort, mobiles, track) => request(`/cohorts/${encodeURIComponent(cohort)}/learners/bulk-track`, { method: 'POST', body: JSON.stringify({ mobiles, track }) }),
  setPhase: (cohort, payload) => request(`/cohorts/${encodeURIComponent(cohort)}/phase`, { method: 'PUT', body: JSON.stringify(payload) }),
  resetPhase: (cohort) => request(`/cohorts/${encodeURIComponent(cohort)}/phase`, { method: 'DELETE' }),
  deleteWeek: (cohort, idx) => request(`/cohorts/${encodeURIComponent(cohort)}/weeks/${idx}`, { method: 'DELETE' }),
  resetCohort: (cohort) => request(`/cohorts/${encodeURIComponent(cohort)}/reset`, { method: 'POST' }),
  upload: (cohort, formData) => request(`/cohorts/${encodeURIComponent(cohort)}/upload`, { method: 'POST', body: formData }),

  saveOutreach: (cohort, mobile, week, field, value) => request(`/cohorts/${encodeURIComponent(cohort)}/outreach/${mobile}`, { method: 'PUT', body: JSON.stringify({ week, field, value }) }),
  bulkAssign: (cohort, week, scope, person) => request(`/cohorts/${encodeURIComponent(cohort)}/outreach/bulk-assign`, { method: 'POST', body: JSON.stringify({ week, scope, person }) }),
  exportOutreachUrl: (cohort, week) => `${API_BASE}/api/cohorts/${encodeURIComponent(cohort)}/outreach/export?week=${encodeURIComponent(week)}`,

  getAssignments: () => request('/assignments'),
  toggleAssignment: (person, cohort, track, checked) => request('/assignments/toggle', { method: 'POST', body: JSON.stringify({ person, cohort, track, checked }) }),
};
