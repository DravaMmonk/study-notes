// Street-map grids: right/down routes, the same board holding 是 / 否, and two piles of stones laid out as a grid.

import { ORDERS, rcName } from '../../algo.js';
import { W } from '../../svg.js';
import { T, tr } from '../../i18n.js';
import { world, look, cell, num, yes, DIR, THIS_CELL } from '../world.js';

export const inGrid = (t, r, c) => r >= 0 && r < t.R && c >= 0 && c < t.C;
const isRock = (t, r, c) => (t.rocks || []).some(p => p[0] === r && p[1] === c);

/** The scan orders a dial can offer on a grid, each with the little picture the dial draws. */
export const GRID_DIAL = Object.fromEntries(Object.entries(ORDERS).map(([id, o]) => [id, { l: o.l, fig: { R: 3, C: 3, list: o.list(3, 3) } }]));

/** The street map. Worlds built on it override what they need; methods refer to the world they end up in (this). */
export const gridDef = {
  sensors: {
    ul: cell(...DIR.ul, [0, -1, -1]), up: cell(...DIR.up, [0, -1, 0]), ur: cell(...DIR.ur, [0, -1, 1]), left: cell(...DIR.left, [0, 0, -1]),
    right: cell(...DIR.right, [0, 0, 1]), dl: cell(...DIR.dl, [0, 1, -1]), down: cell(...DIR.down, [0, 1, 0]), dr: cell(...DIR.dr, [0, 1, 1]),
    start: yes(T('是起点', 'is start'), T('起', 'start'), 'flag'), end: yes(T('是终点', 'is end'), T('终', 'end'), 'goal'), rock: yes(T('是石头', 'is rock'), T('石', 'rock'), 'rock'),
    cost: num(T('本格体力', 'cell energy'), T('体', 'nrg'), 'bolt'), coin: num(T('本格金币', 'cell coins'), T('币', 'coin'), 'coin'),
  },
  facts: ['start', 'end', 'rock', 'cost', 'coin'],
  outs: [['cell', THIS_CELL, [0, 0, 0]]],
  dial: GRID_DIAL,
  here: (t, { r, c }) => [r, c],
  keyAt: (t, r, c) => (inGrid(t, r, c) ? `${r},${c}` : null),
  /** The number a cell shows in its corner: its cost, its coins, or 起 / 终. */
  mark(t, key) {
    const [r, c] = key.split(',').map(Number);
    const corner = t.costs ? t.costs[r][c] : t.coins ? t.coins[r][c] : key === '0,0' ? W.start : r === t.R - 1 && c === t.C - 1 ? W.end : '';
    return { corner, cls: isRock(t, r, c) ? 'rock' : t.coins && t.coins[r][c] ? 'coin' : '' };
  },
  sense(t, { r, c }, id) {
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
  label: t => `${t.R}×${t.C}${t.rocks ? tr(` · ${t.rocks.length} 块石头`, ` · ${t.rocks.length} rock${t.rocks.length > 1 ? 's' : ''}`) : ''}`,
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
  sensors: { up: cell(T('A 堆少 1 颗', 'one fewer in A'), 'A−1', [0, -1, 0]), left: cell(T('B 堆少 1 颗', 'one fewer in B'), 'B−1', [0, 0, -1]), ul: cell(T('两堆各少 1 颗', 'one fewer in each'), T('各−1', 'AB−1'), [0, -1, -1]) },
  facts: [],
  mark: () => ({ corner: '' }),
  where: x => tr(`A 堆 ${x.r} 颗、B 堆 ${x.c} 颗`, `${x.r} in pile A, ${x.c} in pile B`),
  name: key => { const [a, b] = key.split(','); return tr(`A 堆 ${a} 颗、B 堆 ${b} 颗`, `${a} in pile A, ${b} in pile B`); },
  label: t => tr(`${t.R - 1} 颗和 ${t.C - 1} 颗`, `${t.R - 1} and ${t.C - 1} stones`),
  orderText: () => tr('逐行，从两堆都空开始', 'row by row, starting with both piles empty'),
  scene(t, view, o) {
    const g = look(view, [this.answerKey(t, o)], [], o.bench), sp = 54, sz = 46, cells = [];
    const texts = [{ x: -sp - 12, y: -sp + 19, t: tr('B 堆', 'pile B'), anchor: 'end' }, { x: -sp - 12, y: 5, t: tr('A 堆', 'pile A'), anchor: 'end' }];
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

/**
 * Bricks stacked in a triangle (left-aligned): row r has bricks 0…r, and from a brick you step to the one right below
 * or below-right. A cell holds the number of ways down to it from the top brick, so its ways in are the brick above
 * and the one above-left. t = { R, k }: the answer is brick k of the last row.
 */
export const tri = world({
  ...gridDef,
  sensors: { up: cell(...DIR.up, [-1, 0]), ul: cell(...DIR.ul, [-1, -1]), start: yes(T('是顶上那块', 'is the top brick'), T('顶', 'top'), 'apex') },
  facts: ['start'],
  keyAt: (t, r, c) => (r >= 0 && r < t.R && c >= 0 && c <= r ? `${r},${c}` : null),
  mark: () => ({ corner: '' }),
  sense: (t, { r, c }, id) => (id === 'start' ? r === 0 && c === 0 : null),
  base: () => [],
  order: t => { const cells = []; for (let r = 0; r < t.R; r++) for (let c = 0; c <= r; c++) cells.push({ r, c, id: `${r},${c}` }); return cells; },
  answerKey: t => `${t.R - 1},${t.k}`,
  answer(t, table) { return table.get(this.answerKey(t)); },
  where: x => tr(`第 ${x.r + 1} 层第 ${x.c + 1} 块`, `brick ${x.c + 1} of row ${x.r + 1}`),
  name: key => { const [r, c] = key.split(',').map(Number); return tr(`第 ${r + 1} 层第 ${c + 1} 块`, `brick ${c + 1} of row ${r + 1}`); },
  label: t => tr(`${t.R} 层 · 第 ${t.k + 1} 块`, `${t.R} rows · brick ${t.k + 1}`),
  orderText: () => tr('一层一层，从左往右', 'row by row, left to right'),
  sample: t => { const r = Math.min(2, t.R - 1); return { r, c: 1, id: `${r},1` }; },
  scene(t, view, o) {
    const g = look(view, [this.answerKey(t)], [], o.bench), cells = [];
    for (let r = 0; r < t.R; r++) for (let c = 0; c <= r; c++) {
      const id = `${r},${c}`;
      cells.push({ id, x: c * 64, y: r * 64, w: 56, h: 56, value: g.val(id), corner: r === 0 ? W.start : '', cls: g.cls(id), tap: g.tap(id), aria: this.name(id) });
    }
    return { cells, edges: g.arrows(), robot: g.robot };
  },
});

/**
 * A lawn to lay: a field of R × C cells, some with a tree, ringed by a row and a column of 0s (outside the field).
 * A cell holds the side of the biggest square of open cells whose bottom-right corner it is; the answer is the
 * biggest anywhere. t = { R, C, trees: [[r, c]] } with cells counted from 1.
 */
export const lawn = world({
  ...gridDef,
  sensors: { ul: cell(...DIR.ul, [-1, -1]), up: cell(...DIR.up, [-1, 0]), left: cell(...DIR.left, [0, -1]), open: yes(T('是空地', 'is open ground'), T('空', 'open'), 'grass') },
  facts: ['open'],
  keyAt: (t, r, c) => (r >= 0 && r <= t.R && c >= 0 && c <= t.C ? `${r},${c}` : null),
  mark: (t, key) => { const [r, c] = key.split(',').map(Number); return { corner: '', cls: (t.trees || []).some(p => p[0] === r && p[1] === c) ? 'rock' : '' }; },
  sense: (t, { r, c }, id) => (id === 'open' ? !(t.trees || []).some(p => p[0] === r && p[1] === c) : null),
  base: t => { const b = []; for (let r = 0; r <= t.R; r++) b.push([`${r},0`, 0]); for (let c = 1; c <= t.C; c++) b.push([`0,${c}`, 0]); return b; },
  order: t => { const cells = []; for (let r = 1; r <= t.R; r++) for (let c = 1; c <= t.C; c++) cells.push({ r, c, id: `${r},${c}` }); return cells; },
  answerKey: () => null,
  answerKeys: () => [],
  answer(t, table) { let best = null; for (let r = 1; r <= t.R; r++) for (let c = 1; c <= t.C; c++) { const v = table.get(`${r},${c}`); if (typeof v === 'number' && (best === null || v > best)) best = v; } return best; },
  where: x => tr(`第 ${x.r} 行第 ${x.c} 列`, `row ${x.r}, column ${x.c}`),
  name: key => { const [r, c] = key.split(',').map(Number); return r && c ? tr(`第 ${r} 行第 ${c} 列`, `row ${r}, column ${c}`) : tr('地外', 'outside the field'); },
  label: t => tr(`${t.R}×${t.C} · ${(t.trees || []).length} 棵树`, `${t.R}×${t.C} · ${(t.trees || []).length} trees`),
  orderText: () => tr('逐行，从左上开始', 'row by row, from the top left'),
  sample: () => ({ r: 2, c: 2, id: '2,2' }),
  scene(t, view, o) {
    const g = look(view, [], this.base(t), o.bench), cells = [];
    for (let r = 0; r <= t.R; r++) for (let c = 0; c <= t.C; c++) {
      const id = `${r},${c}`, edge = !r || !c;
      cells.push({ id, x: c * 58, y: r * 58, w: edge ? 34 : 50, h: edge ? 34 : 50, value: g.val(id), cls: edge ? 'axis' : `${this.mark(t, id).cls} ${g.cls(id)}`, tap: !edge && g.tap(id), aria: this.name(id) });
    }
    return { cells, edges: g.arrows(), robot: g.robot };
  },
});
