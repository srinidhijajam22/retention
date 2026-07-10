export function getFocusGroup(history) {
  const last3 = history.slice(-3);
  if (!last3.length) return 'FG3';
  let s = 0;
  last3.forEach((x) => {
    if (x === 'On Track') s += 2;
    else if (x === 'Passive') s += 1;
  });
  const r = s / (last3.length * 2);
  return r >= 0.8 ? 'FG1' : r > 0 ? 'FG2' : 'FG3';
}

export function isAtRisk(history) {
  const l = history.slice(-4);
  return l.length >= 3 && l.every((s) => s === 'Missed');
}

export function getPriority(weekStatus, fg) {
  if (weekStatus === 'On Track') return null;
  if (weekStatus === 'Missed' && fg === 'FG1') return 'P0';
  if (weekStatus === 'Missed' && fg === 'FG2') return 'P0';
  if (weekStatus === 'Passive' && fg === 'FG1') return 'P0';
  if (weekStatus === 'Passive' && fg === 'FG2') return 'P1';
  if (weekStatus === 'Passive' && fg === 'FG3') return 'P1';
  if (weekStatus === 'Missed' && fg === 'FG3') return 'P2';
  return 'P2';
}
