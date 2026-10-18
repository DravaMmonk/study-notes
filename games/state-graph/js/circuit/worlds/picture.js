// Pictures as tables: every cell is a pixel. A pixel's energy is how much it differs from its neighbours (an edge is
// high, a flat background is low); a seam is a path from the top row to the bottom, one pixel per row, each step to
// the pixel below, below-left or below-right. Removing the seam with the least energy narrows the picture by one
// column without cutting through what stands out in it.

import { rcName } from '../../algo.js';
import { T, tr } from '../../i18n.js';
import { world, look, num, yes } from '../world.js';
import { gridDef } from './grid.js';

const at = (img, r, c) => img[Math.max(0, Math.min(img.length - 1, r))][Math.max(0, Math.min(img[0].length - 1, c))];
/** Energy: |right − left| + |below − above|, the picture's edge clamped. */
export const energy = img => img.map((row, r) => row.map((_, c) => Math.abs(at(img, r, c + 1) - at(img, r, c - 1)) + Math.abs(at(img, r + 1, c) - at(img, r - 1, c))));
/** The seam table: each cell = its energy + the smallest of the three cells above it. */
export function seamTable(img) {
  const e = energy(img), f = e.map(row => row.slice());
  for (let r = 1; r < f.length; r++) for (let c = 0; c < f[0].length; c++) f[r][c] = e[r][c] + Math.min(...[c - 1, c, c + 1].filter(x => x >= 0 && x < f[0].length).map(x => f[r - 1][x]));
  return { e, f };
}
/** The cheapest seam, bottom to top: [[r, c]]. */
export function seamPath(img) {
  const { e, f } = seamTable(img), R = f.length, C = f[0].length;
  let c = f[R - 1].indexOf(Math.min(...f[R - 1]));
  const path = [[R - 1, c]];
  for (let r = R - 1; r > 0; r--) {
    c = [c - 1, c, c + 1].filter(x => x >= 0 && x < C).find(x => f[r - 1][x] === f[r][c] - e[r][c]);
    path.push([r - 1, c]);
  }
  return path;
}
/** A test's energies: given outright (t.energy, for a small picture of plain numbers), or worked out from its pixels. */
const energyOf = t => t.energy || energy(t.img);
export const shade = v => `color-mix(in srgb, var(--ink) ${Math.round(8 + v * 9)}%, var(--chip))`;

export const pic = world({
  ...gridDef,
  sensors: { ul: gridDef.sensors.ul, up: gridDef.sensors.up, ur: gridDef.sensors.ur, left: gridDef.sensors.left, right: gridDef.sensors.right, dl: gridDef.sensors.dl, down: gridDef.sensors.down, dr: gridDef.sensors.dr, energy: num(T('本格能量', 'pixel energy'), T('能', 'E'), 'bolt'), top: yes(T('是顶行', 'is top row'), T('顶', 'top'), 'flag') },
  facts: ['energy', 'top'],
  mark: (t, key) => { const [r, c] = key.split(',').map(Number); return { corner: energyOf(t)[r][c] }; },
  sense: (t, { r, c }, id) => (id === 'top' ? r === 0 : energyOf(t)[r][c]),
  answerKeys: t => Array.from({ length: t.C }, (_, c) => `${t.R - 1},${c}`),
  answer(t, table) { return Math.min(...this.answerKeys(t).map(k => table.get(k) ?? Infinity)); },
  label: t => tr(`${t.C}×${t.R} 像素`, `${t.C}×${t.R} pixel${t.C * t.R > 1 ? 's' : ''}`),
  orderText: () => tr('逐行，从顶行往下', 'row by row, from the top row down'),
  scene(t, view, o) {
    const g = look(view, [], [], o.bench), sp = 46, sz = 40, px = 13, cells = [], path = new Set(o.path || []);
    // The picture itself, small, to the left of its table (a test of plain energies has none).
    const x0 = -(t.C * px) - 40;
    (t.img || []).forEach((row, r) => row.forEach((v, c) => cells.push({ id: `p${r},${c}`, x: x0 + c * px, y: r * px, w: px, h: px, rx: 1, value: '', fill: shade(v), cls: path.has(`${r},${c}`) ? 'cut' : 'px' })));
    for (let r = 0; r < t.R; r++) for (let c = 0; c < t.C; c++) {
      const id = `${r},${c}`;
      cells.push({ id, x: c * sp, y: r * sp, w: sz, h: sz, rx: 8, value: g.val(id), corner: this.mark(t, id).corner, cls: [g.cls(id), path.has(id) ? 'path' : ''].filter(Boolean).join(' '), tap: g.tap(id), aria: rcName(id) });
    }
    return { cells, edges: g.arrows(), robot: g.robot };
  },
});
