// Symbols for facts about the robot's cell, drawn in SVG.

import { tr } from '../i18n.js';

/** Symbols in a 48×32 box, used on the fact chips under the robot's window. */
export const ICONS = {
  flag: '<path class="g-ink" d="M20 6V26"/><path class="g-mark" d="M20 6L31 10L20 14Z"/>',
  goal: '<circle class="g-ink" cx="24" cy="16" r="8"/><circle class="g-mark" cx="24" cy="16" r="3.2"/>',
  rock: '<rect class="g-cell" x="13" y="5" width="22" height="22" rx="3"/><path class="g-ink" d="M14 13L22 5M14 20L29 5M14 27L35 6M21 27L35 13M28 27L35 20"/>',
  key: '<circle class="g-mark-o" cx="18" cy="16" r="4.6"/><path class="g-mark-o" d="M22.6 16H32M29 16V20M32 16V19"/>',
  door: '<rect class="g-door" x="17" y="5" width="14" height="22" rx="1.5"/><circle class="g-mark" cx="27.5" cy="17" r="1.4"/>',
  ground: '<path class="g-ink" d="M12 27H36M15 27V22H21V17H27V12H33"/><path class="g-mark" d="M12 27H21V22H15Z"/>',
  bolt: '<path class="g-mark" d="M27 4L17 18H24L21.5 28L32 13H25Z"/>',
  eq: '<rect class="g-cell" x="5" y="7" width="14" height="18" rx="2.5"/><rect class="g-cell" x="29" y="7" width="14" height="18" rx="2.5"/><text class="g-tx" x="12" y="20">A</text><text class="g-tx" x="36" y="20">A</text><path class="g-mark-o" d="M21 13.5H27M21 18.5H27"/>',
  get coin() { return `<circle class="g-mark" cx="24" cy="16" r="11"/><text class="g-tx g-dark" x="24" y="20.5">${tr('¥', '$')}</text>`; },
  layers: '<path class="g-ink" d="M24 5L37 11L24 17L11 11Z"/><path class="g-mark" d="M11 16L24 22L37 16M11 21L24 27L37 21"/>',
  gem: '<path class="g-mark" d="M16 11L20 6H28L32 11L24 27Z"/><path class="g-gem" d="M16 11H32M20 6L24 27L28 6"/>',
  many: '<path class="g-mark-o" d="M24 16C21 10 13 10 13 16C13 22 21 22 24 16C27 10 35 10 35 16C35 22 27 22 24 16Z"/>',
};
