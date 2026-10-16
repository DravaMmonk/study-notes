// Street-map grids: right/down routes, the same board holding 是 / 否, and two piles of stones laid out as a grid.

import { ORDERS, rcName } from '../../algo.js';
import { world, look, cell, num, yes } from '../world.js';

export const inGrid = (t, r, c) => r >= 0 && r < t.R && c >= 0 && c < t.C;
const isRock = (t, r, c) => (t.rocks || []).some(p => p[0] === r && p[1] === c);

/** The scan orders a dial can offer on a grid, each with the little picture the dial draws. */
export const GRID_DIAL = Object.fromEntries(Object.entries(ORDERS).map(([id, o]) => [id, { l: o.l, fig: { R: 3, C: 3, list: o.list(3, 3) } }]));

/** The street map. Worlds built on it override what they need; methods refer to the world they end up in (this). */
export const gridDef = {
  taps: {
    ul: cell('左上', '左上', [0, -1, -1]), up: cell('上面', '上', [0, -1, 0]), ur: cell('右上', '右上', [0, -1, 1]), left: cell('左边', '左', [0, 0, -1]),
    right: cell('右边', '右', [0, 0, 1]), dl: cell('左下', '左下', [0, 1, -1]), down: cell('下面', '下', [0, 1, 0]), dr: cell('右下', '右下', [0, 1, 1]),
    start: yes('是起点', '起', 'flag'), end: yes('是终点', '终', 'goal'), rock: yes('是石头', '石', 'rock'),
    cost: num('本格体力', '体', 'bolt'), coin: num('本格金币', '币', 'coin'),
  },
  facts: ['start', 'end', 'rock', 'cost', 'coin'],
  outs: [['cell', '本格', [0, 0, 0]]],
  dial: GRID_DIAL,
  here: (t, { r, c }) => [[r, c]],
  keyAt: (t, L, r, c) => (inGrid(t, r, c) ? `${r},${c}` : null),
  /** The number a cell shows in its corner: its cost, its coins, or 起 / 终. */
  mark(t, key) {
    const [r, c] = key.split(',').map(Number);
    const corner = t.costs ? t.costs[r][c] : t.coins ? t.coins[r][c] : key === '0,0' ? '起' : r === t.R - 1 && c === t.C - 1 ? '终' : '';
    return { corner, cls: isRock(t, r, c) ? 'rock' : t.coins && t.coins[r][c] ? 'coin' : '' };
  },
  fact(t, { r, c }, id) {
    switch (id) {
      case 'start': return r === 0 && c === 0;
      case 'end': return r === t.R - 1 && c === t.C - 1;
      case 'rock': return isRock(t, r, c);
      case 'cost': return t.costs[r][c];
      case 'coin': return t.coins[r][c];
    }
    return null;
  },
  /** t.given: cells written before the robot starts, e.g. { '0,0': 1 }; the robot skips them. */
  base: t => Object.entries(t.given || {}),
  order: (t, o) => ORDERS[o.scan || 'rowTL'].list(t.R, t.C).map(([r, c]) => ({ r, c, id: `${r},${c}` })).filter(x => !(x.id in (t.given || {}))),
  keys: (t, x) => ({ cell: x.id }),
  where: x => rcName(x.id),
  answerKey: (t, o) => (o.answerAt === 'start' ? '0,0' : `${t.R - 1},${t.C - 1}`),
  answer(t, table, o) { return table.get(this.answerKey(t, o)); },
  name: key => rcName(key),
  label: t => `${t.R}×${t.C}${t.rocks ? ` · ${t.rocks.length} 块石头` : ''}`,
  orderText: o => ORDERS[o.scan || 'rowTL'].l,
  sample: t => { const r = Math.min(1, t.R - 1), c = Math.min(1, t.C - 1); return { r, c, id: `${r},${c}` }; },
  scene(t, view, o) {
    const g = look(view, [this.answerKey(t, o)], this.base(t, o), o.bench), cells = [];
    for (let r = 0; r < t.R; r++) for (let c = 0; c < t.C; c++) {
      const id = `${r},${c}`, m = this.mark(t, id);
      cells.push({ id, x: c * 64, y: r * 64, w: 56, h: 56, value: g.val(id), corner: m.corner, cls: `${m.cls} ${g.cls(id)}`, tap: g.tap(id), aria: rcName(id) });
    }
    return { cells, edges: g.arrows(), robot: g.robot };
  },
};

export const grid = world(gridDef);

/** The same map, but every cell holds 是 or 否: can a route get here at all? */
export const gridYes = world({ ...gridDef, cellType: 'bool' });

/**
 * Two piles of stones: cell (a, b) is the position with a stones left in pile A and b in pile B, and holds whether the
 * player about to move wins. A move takes one stone from A (the cell above), from B (the cell to the left) or from both.
 */
export const piles = world({
  ...gridDef,
  cellType: 'bool',
  taps: { up: cell('A 堆少 1 颗', 'A−1', [0, -1, 0]), left: cell('B 堆少 1 颗', 'B−1', [0, 0, -1]), ul: cell('两堆各少 1 颗', '各−1', [0, -1, -1]) },
  facts: [],
  mark: () => ({ corner: '' }),
  where: x => `A 堆 ${x.r} 颗、B 堆 ${x.c} 颗`,
  name: key => { const [a, b] = key.split(','); return `A 堆 ${a} 颗、B 堆 ${b} 颗`; },
  label: t => `${t.R - 1} 颗和 ${t.C - 1} 颗`,
  orderText: () => '逐行，从两堆都空开始',
  scene(t, view, o) {
    const g = look(view, [this.answerKey(t, o)], [], o.bench), sp = 54, sz = 46, cells = [];
    const texts = [{ x: -sp - 12, y: -sp + 19, t: 'B 堆', anchor: 'end' }, { x: -sp - 12, y: 5, t: 'A 堆', anchor: 'end' }];
    for (let c = 0; c < t.C; c++) cells.push({ id: `bx${c}`, x: c * sp, y: -sp + 14, w: sz, h: 26, value: c, cls: 'axis' });
    for (let r = 0; r < t.R; r++) {
      cells.push({ id: `ax${r}`, x: -sp + 8, y: r * sp, w: 30, h: sz, value: r, cls: 'axis' });
      for (let c = 0; c < t.C; c++) {
        const id = `${r},${c}`;
        cells.push({ id, x: c * sp, y: r * sp, w: sz, h: sz, value: g.val(id), cls: g.cls(id), tap: g.tap(id), aria: this.name(id) });
      }
    }
    return { cells, edges: g.arrows(), texts, robot: g.robot };
  },
});
