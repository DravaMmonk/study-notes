// Theme button: cycles the shared themes (../kit/theme.js): paper, night, blueprint. index.html applies the saved
// one before first paint; the buttons are labelled by the kit's bar (../kit/bar.js), like on every other page.

import { currentTheme, nextTheme, applyTheme } from '../../kit/theme.js';
import { paintButtons } from '../../kit/bar.js';

/** Label the theme buttons; also called after a language switch. */
export const paintTheme = paintButtons;

export function initTheme() {
  document.addEventListener('click', e => { if (e.target.closest('[data-theme-toggle]')) { applyTheme(nextTheme(currentTheme())); paintButtons(); } });
  applyTheme(currentTheme());
  paintButtons();
}
