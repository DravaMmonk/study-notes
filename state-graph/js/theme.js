// Color theme: paper (default) or night. index.html applies the saved theme before first paint.

import { $$, ICON } from './util.js';

const KEY = 'state-graph-theme';
const BAR = { paper: '#F3F1EB', night: '#11151B' };

export const theme = () => document.documentElement.dataset.theme || 'paper';

function paint() {
  const t = theme();
  $$('[data-theme-toggle]').forEach(b => { b.innerHTML = t === 'night' ? ICON.sun : ICON.moon; b.title = t === 'night' ? '换成浅色' : '换成深色'; });
  document.querySelector('meta[name="theme-color"]').content = BAR[t];
}

export function toggleTheme() {
  const t = theme() === 'night' ? 'paper' : 'night';
  if (t === 'night') document.documentElement.dataset.theme = 'night';
  else delete document.documentElement.dataset.theme;
  try { localStorage.setItem(KEY, t); } catch (e) { /* storage unavailable */ }
  paint();
}

export function initTheme() {
  document.addEventListener('click', e => { if (e.target.closest('[data-theme-toggle]')) toggleTheme(); });
  paint();
}
