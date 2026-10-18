// Symbols for facts about the robot's cell, drawn in SVG. Each fact has its own (a fact that means the same thing in
// several worlds, 是起点 say, keeps one), so a fact's output can go by its symbol alone.

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
  // 杨辉三角: the top brick of the triangle.
  apex: '<rect class="g-mark" x="20" y="4" width="8" height="6.5" rx="1.2"/><path class="g-ink" d="M16 13H24V19.5H16ZM24 13H32V19.5H24ZM12 22H20V28.5H12ZM20 22H28V28.5H20ZM28 22H36V28.5H28Z"/>',
  // 最大的正方形: open ground, grass on it.
  grass: '<path class="g-ink" d="M9 26H39"/><path class="g-mark-o" d="M15 25V18M15 25L11.5 20M15 25L18.5 19.5M24 25V14M24 25L20 18M24 25L28 17.5M33 25V18M33 25L29.5 20M33 25L36.5 19.5"/>',
  // 拿石子: the pile is empty.
  empty: '<path class="g-ink" d="M9 21Q24 33 39 21"/><circle class="g-ink" cx="24" cy="13" r="5.5" stroke-dasharray="3 3"/>',
  // 凑零钱: nothing left to pay.
  zero: '<circle class="g-mark-o" cx="24" cy="16" r="10.5"/><text class="g-tx" x="24" y="20.5">0</text>',
  // 不能连着偷: the money in this house.
  house: '<path class="g-ink" d="M12 16L24 6L36 16M15.5 13.5V27H32.5V13.5"/><circle class="g-mark" cx="24" cy="20.5" r="4.2"/>',
  // 越来越高: this post's height.
  post: '<rect class="g-mark" x="16" y="9" width="8" height="18" rx="1.2"/><path class="g-ink" d="M11 27H37M32 26V7M28.5 10.5L32 7L35.5 10.5"/>',
  // 钥匙: a key picked up here.
  keyget: '<circle class="g-mark-o" cx="14" cy="19" r="4.4"/><path class="g-mark-o" d="M18.4 19H26.5M24 19V22.5"/><path class="g-ink" d="M35 27V7M30.5 11.5L35 7L39.5 11.5"/>',
  // 钥匙: the routes here move on to another layer.
  carry: '<path class="g-ink" d="M6 22L17 17L28 22L17 27Z"/><path class="g-mark" d="M14 11L25 6L36 11L25 16Z"/><path class="g-ink" d="M30 24C38 24 40 20 39.5 15.5M36.5 18L39.5 14.5L42.5 18"/>',
  // 两端相同: the run's two ends match.
  ends: '<path class="g-ink" d="M13 6H8V26H13M35 6H40V26H35"/><path class="g-mark-o" d="M18.5 13.5H29.5M18.5 18.5H29.5"/>',
  // 本格得分: a score.
  star: '<path class="g-mark" d="M24 4L27.4 11.8L35.8 12.6L29.4 18.2L31.3 26.5L24 22.2L16.7 26.5L18.6 18.2L12.2 12.6L20.6 11.8Z"/>',
  // 这段总重: a weight.
  weight: '<path class="g-ink" d="M19.5 13C19.5 6.5 28.5 6.5 28.5 13"/><path class="g-mark" d="M15 27L18 13H30L33 27Z"/>',
  // 这个词这么标: a tag.
  tag: '<path class="g-mark" d="M9 9H30L38.5 16L30 23H9Z"/><circle cx="30" cy="16" r="2.2" fill="#1E1606"/>',
  // 跟在名词 / 动词 / 形容词后: a word of that kind, then this one.
  get afterN() { return `<rect class="g-cell" x="2" y="5" width="22" height="22" rx="3.5"/><text class="g-tx" x="13" y="21.5" style="font-size:15px">${tr('名', 'N')}</text><path class="g-mark-o" d="M28 16H44M39.5 11.5L44 16L39.5 20.5"/>`; },
  get afterV() { return `<rect class="g-cell" x="2" y="5" width="22" height="22" rx="3.5"/><text class="g-tx" x="13" y="21.5" style="font-size:15px">${tr('动', 'V')}</text><path class="g-mark-o" d="M28 16H44M39.5 11.5L44 16L39.5 20.5"/>`; },
  get afterA() { return `<rect class="g-cell" x="2" y="5" width="22" height="22" rx="3.5"/><text class="g-tx" x="13" y="21.5" style="font-size:15px">${tr('形', 'A')}</text><path class="g-mark-o" d="M28 16H44M39.5 11.5L44 16L39.5 20.5"/>`; },
  // 图里的缝: a pixel's energy.
  pixel: '<rect class="g-cell" x="12" y="5" width="22" height="22" rx="2"/><path class="g-ink" d="M12 16H34M23 5V27"/><path class="g-mark" d="M30 3L22 14H27.5L25 26L34 12H28.5Z"/>',
  // 图里的缝: the picture's top row.
  toprow: '<rect class="g-mark" x="12" y="4" width="24" height="7" rx="1.2"/><rect class="g-cell" x="12" y="13" width="24" height="7" rx="1.2"/><rect class="g-cell" x="12" y="22" width="24" height="7" rx="1.2"/>',
};
