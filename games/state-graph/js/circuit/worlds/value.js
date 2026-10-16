// Value maps: a treasure, traps and cliffs whose values are fixed, walls nobody can enter, and floor cells whose value
// is how good it is to stand there. Levels on these maps scan in rounds until the table stops changing.

import { E } from '../../svg.js';
import { rcName } from '../../algo.js';
import { world, look } from '../world.js';
import { gridDef } from './grid.js';

const has = (list, r, c) => (list || []).some(p => p[0] === r && p[1] === c);
/** What stands on a cell: 'gold' (10), 'trap' and 'cliff' (−10), 'wall' (nobody enters), or 'floor'. */
export function tileAt(t, r, c) {
  if (t.gold[0] === r && t.gold[1] === c) return 'gold';
  if (has(t.traps, r, c)) return 'trap';
  if (has(t.cliffs, r, c)) return 'cliff';
  if (has(t.walls, r, c)) return 'wall';
  return 'floor';
}
const FIXED = { gold: 10, trap: -10, cliff: -10, wall: null };
const LABEL = { gold: '宝藏', trap: '陷阱', cliff: '悬崖', wall: '' };

/**
 * The robot's best move from every floor cell once the values have settled: to the best neighbour, or, on a slippery
 * floor (o.slip = chance to slide sideways), the move whose expected value is best. Returns [[from, to]].
 */
export function policy(t, table, o = {}) {
  const v = (r, c) => (r >= 0 && c >= 0 && r < t.R && c < t.C ? table.get(`${r},${c}`) ?? null : null), out = [];
  for (let r = 0; r < t.R; r++) for (let c = 0; c < t.C; c++) {
    if (tileAt(t, r, c) !== 'floor') continue;
    const mix = (a, b) => (a === null || b === null ? null : (1 - o.slip) * a + o.slip * b);
    const moves = o.slip ? [[r, c + 1, mix(v(r, c + 1), v(r + 1, c))], [r + 1, c, mix(v(r + 1, c), v(r, c + 1))]]
      : [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].map(([y, x]) => [y, x, v(y, x)]);
    const ok = moves.filter(m => m[2] !== null);
    if (!ok.length) continue;
    const best = ok.reduce((a, b) => (b[2] > a[2] ? b : a));
    out.push([`${r},${c}`, `${best[0]},${best[1]}`]);
  }
  return out;
}

export const vgrid = world({
  ...gridDef,
  taps: { ul: gridDef.taps.ul, up: gridDef.taps.up, ur: gridDef.taps.ur, left: gridDef.taps.left, right: gridDef.taps.right, dl: gridDef.taps.dl, down: gridDef.taps.down, dr: gridDef.taps.dr },
  facts: [],
  mark(t, key) {
    const [r, c] = key.split(',').map(Number), k = tileAt(t, r, c);
    return { cls: k === 'floor' ? '' : k === 'wall' ? 'rock' : k, label: LABEL[k] || '', corner: r + c === 0 ? '起' : '' };
  },
  /** Fixed tiles hold their value from the start; every floor cell starts at 0. */
  base: t => { const b = []; for (let r = 0; r < t.R; r++) for (let c = 0; c < t.C; c++) { const k = tileAt(t, r, c); b.push([`${r},${c}`, k === 'floor' ? 0 : FIXED[k]]); } return b; },
  order: t => { const o = []; for (let r = 0; r < t.R; r++) for (let c = 0; c < t.C; c++) if (tileAt(t, r, c) === 'floor') o.push({ r, c, id: `${r},${c}` }); return o; },
  answerKey: () => '0,0',
  label: t => `${t.R}×${t.C}${t.slip ? ' · 会打滑' : ''}`,
  orderText: () => '逐行，从左上开始，一轮一轮地扫',
  sample: t => ({ r: 0, c: 0, id: '0,0' }),
  scene(t, view, o) {
    const g = look(view, [this.answerKey(t, o)], this.base(t, o), o.bench), cells = [];
    for (let r = 0; r < t.R; r++) for (let c = 0; c < t.C; c++) {
      const id = `${r},${c}`, m = this.mark(t, id), fixed = tileAt(t, r, c) !== 'floor';
      cells.push({ id, x: c * 64, y: r * 64, w: 56, h: 56, value: tileAt(t, r, c) === 'wall' ? '' : g.val(id), label: m.label, corner: m.corner, cls: `${m.cls} ${fixed ? '' : g.cls(id)}`, tap: !fixed && g.tap(id), aria: rcName(id) });
    }
    const edges = g.arrows();
    // Once the values have settled, every floor cell grows an arrow toward its best move.
    if (o.arrows && view && view.end && view.pass) policy(t, g.shown, { slip: t.slip }).forEach(([a, b]) => edges.push(E(a, b, 'good')));
    return { cells, edges, robot: g.robot };
  },
});

/** The settled values of a map without slipping: every floor cell = γ × its best neighbour, scanned until nothing changes. */
export function settle(t, gamma = 0.9) {
  const table = new Map(vgrid.base(t)), v = (r, c) => (r >= 0 && c >= 0 && r < t.R && c < t.C ? table.get(`${r},${c}`) : null);
  for (let moved = true; moved;) {
    moved = false;
    vgrid.order(t).forEach(({ r, c, id }) => {
      const n = [v(r - 1, c), v(r + 1, c), v(r, c - 1), v(r, c + 1)].filter(x => x !== null && x !== undefined);
      const x = n.length ? Math.round(gamma * Math.max(...n) * 1e9) / 1e9 : null;
      if (x !== table.get(id)) { table.set(id, x); moved = true; }
    });
  }
  return table;
}
