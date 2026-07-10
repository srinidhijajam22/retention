// Static cohort/track configuration — mirrors the original dashboard's config.
export const COHORTS = ['BEL C17', 'BEL C18', 'BEL C19', 'BEL C20', 'BEL C21', 'BEL C22'];

export const COHORT_COLORS = {
  'BEL C17': '#6835FB',
  'BEL C18': '#54F9DA',
  'BEL C19': '#F42479',
  'BEL C20': '#FC4917',
  'BEL C21': '#F5F76B',
  'BEL C22': '#9B7DFF',
};

export const COHORT_PHASES = {
  'BEL C17': { phase: 'ai', label: 'AI Module', tracks: ['AI'], multiTrack: false },
  'BEL C18': { phase: 'ai', label: 'AI Module', tracks: ['AI'], multiTrack: false },
  'BEL C19': { phase: 'java_node', label: 'Java + Node + Python', tracks: ['JAVA', 'NODE', 'PYTHON'], multiTrack: true },
  'BEL C20': { phase: 'java_node', label: 'Java + Node + Python', tracks: ['JAVA', 'NODE', 'PYTHON'], multiTrack: true },
  'BEL C21': { phase: 'java_node', label: 'Java + Node + Python', tracks: ['JAVA', 'NODE', 'PYTHON'], multiTrack: true },
  'BEL C22': { phase: 'java_node', label: 'Java + Node + Python', tracks: ['JAVA', 'NODE', 'PYTHON'], multiTrack: true },
};

export const TRACK_COLORS = { JAVA: 'phase-java', NODE: 'phase-node', PYTHON: 'phase-python', AI: 'phase-ai', SYSDESIGN: 'phase-sysdesign' };
export const PHASE_COLORS = { sysdesign: 'phase-sysdesign', ai: 'phase-ai', java_node: 'phase-java' };

export const PHASE_OPTIONS = [
  { key: 'phase1', label: 'Phase 1 — Java, Node & Python', cssClass: 'phase-java' },
  { key: 'phase2', label: 'Phase 2 — LLD', cssClass: 'phase-node' },
  { key: 'phase3', label: 'Phase 3 — AI', cssClass: 'phase-ai' },
  { key: 'phase4', label: 'Phase 4 — System Design', cssClass: 'phase-sysdesign' },
];

export const ALL_TRACKS = ['JAVA', 'NODE', 'PYTHON', 'AI', 'SYSDESIGN'];

export const USERS_SEED = [
  { username: 'shibu', role: 'admin' },
  { username: 'admin', role: 'admin' },
  { username: 'team', role: 'team' },
  { username: 'manasvi', role: 'team' },
  { username: 'srinidhi', role: 'team' },
];

export const DEFAULT_PASSWORD = 'bel@2024';
