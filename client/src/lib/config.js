export const COHORTS = ['BEL C17', 'BEL C18', 'BEL C19', 'BEL C20', 'BEL C21', 'BEL C22'];

export const TRACK_COLORS = { JAVA: 'phase-java', NODE: 'phase-node', PYTHON: 'phase-python', AI: 'phase-ai', SYSDESIGN: 'phase-sysdesign' };
export const PHASE_COLORS = { sysdesign: 'phase-sysdesign', ai: 'phase-ai', java_node: 'phase-java' };
export const ALL_TRACKS = ['JAVA', 'NODE', 'PYTHON', 'AI', 'SYSDESIGN'];

export const PHASE_OPTIONS = [
  { key: 'phase1', label: 'Phase 1 — Java, Node & Python', cssClass: 'phase-java' },
  { key: 'phase2', label: 'Phase 2 — LLD', cssClass: 'phase-node' },
  { key: 'phase3', label: 'Phase 3 — AI', cssClass: 'phase-ai' },
  { key: 'phase4', label: 'Phase 4 — System Design', cssClass: 'phase-sysdesign' },
];

export const TRACK_OPTIONS = [
  { key: 'JAVA', label: 'Java', color: 'rgba(104,53,251,0.15)', border: 'rgba(104,53,251,0.4)', text: '#9B7DFF' },
  { key: 'NODE', label: 'Node', color: 'rgba(84,249,218,0.1)', border: 'rgba(84,249,218,0.35)', text: '#54F9DA' },
  { key: 'PYTHON', label: 'Python', color: 'rgba(245,247,107,0.1)', border: 'rgba(245,247,107,0.3)', text: '#c8ca2a' },
  { key: 'AI', label: 'AI Module', color: 'rgba(244,36,121,0.1)', border: 'rgba(244,36,121,0.3)', text: '#F42479' },
  { key: 'SYSDESIGN', label: 'System Design', color: 'rgba(84,249,218,0.1)', border: 'rgba(84,249,218,0.3)', text: '#54F9DA' },
  { key: 'LLD', label: 'LLD', color: 'rgba(252,73,23,0.1)', border: 'rgba(252,73,23,0.3)', text: '#FC4917' },
];
