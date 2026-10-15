// Theme button: cycles the shared themes (../kit/theme.js) — paper, night, blueprint. index.html applies the saved
// one before first paint.

import { $$, ICON } from './util.js';
import { currentTheme, nextTheme, themeLabel, applyTheme } from '../../kit/theme.js';

const ICONS = { paper: ICON.sun, night: ICON.moon, blueprint: ICON.ruler };

function paint() {
  const t = currentTheme(), n = nextTheme(t);
  $$('[data-theme-toggle]').forEach(b => { b.innerHTML = ICONS[t]; b.title = `主题：${themeLabel(t)}，点一下换成${themeLabel(n)}`; b.setAttribute('aria-label', b.title); });
}

export function initTheme() {
  document.addEventListener('click', e => { if (e.target.closest('[data-theme-toggle]')) { applyTheme(nextTheme(currentTheme())); paint(); } });
  applyTheme(currentTheme());
  paint();
}
