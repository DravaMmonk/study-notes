// The interval table: cell (i, j) answers the question for items i … j of a row (letters, stones, words).
// Rows are i, columns are j, so only the upper triangle is used; a short segment sits near the diagonal, and the
// whole row's answer is in the top-right corner. A level may fill the diagonal (single items, o.diag) and the empty
// segments just under it (o.empty0) before the robot starts.

import { T, tr } from '../../i18n.js';
import { world, look, cell, yes, num, seg, DIR, THIS_CELL } from '../world.js';

const items = t => [...(t.s || t.w || t.words)];
const ORDERS = {
  rowTL: { l: T('逐行，从上往下', 'row by row, top to bottom'), list: n => { const o = []; for (let i = 0; i < n; i++) for (let j = i; j < n; j++) o.push([i, j]); return o; } },
  rowBR: { l: T('逐行，从下往上', 'row by row, bottom to top'), list: n => { const o = []; for (let i = n - 1; i >= 0; i--) for (let j = i; j < n; j++) o.push([i, j]); return o; } },
  colL: { l: T('逐列，每列从上往下', 'column by column, each from the top down'), list: n => { const o = []; for (let j = 0; j < n; j++) for (let i = 0; i <= j; i++) o.push([i, j]); return o; } },
  colLB: { l: T('逐列，每列从下往上', 'column by column, each from the bottom up'), list: n => { const o = []; for (let j = 0; j < n; j++) for (let i = j; i >= 0; i--) o.push([i, j]); return o; } },
  len: { l: T('按长度，从短到长', 'by length, shortest first'), list: n => { const o = []; for (let d = 0; d < n; d++) for (let i = 0; i + d < n; i++) o.push([i, i + d]); return o; } },
};
const span = (i, j) => (i === j ? tr(`第 ${i + 1} 个`, `item ${i + 1}`) : tr(`第 ${i + 1}–${j + 1} 个`, `items ${i + 1}–${j + 1}`));
/** A run's tag on the arm: 「3」 or 「2–4」. */
const short = (i, j) => (i === j ? `${i + 1}` : `${i + 1}–${j + 1}`);

export const interval = world({
  sensors: {
    left: cell(...DIR.left, [0, 0, -1]), down: cell(...DIR.down, [0, 1, 0]), dl: cell(...DIR.dl, [0, 1, -1]),
    same: yes(T('两端相同', 'ends match'), T('同', '='), 'ends'), weight: num(T('这段总重', 'run weight'), T('重', 'wt'), 'weight'),
    segL: seg(T('左段们', 'left parts'), T('左', 'L')), segR: seg(T('右段们', 'right parts'), T('右', 'R')),
  },
  facts: ['same', 'weight'],
  armSensors: ['segL', 'segR'],
  outs: [['cell', THIS_CELL, [0, 0, 0]]],
  dial: Object.fromEntries(Object.entries(ORDERS).map(([id, o]) => [id, { l: o.l, fig: { R: 4, C: 4, list: o.list(4) } }])),
  here: (t, { i, j }) => [i, j],
  keyAt: (t, i, j) => (i >= 0 && j >= 0 && i < items(t).length && j < items(t).length && i <= j + 1 ? `${i},${j}` : null),
  mark: (t, key) => { const [i, j] = key.split(',').map(Number); return i > j ? { cls: 'void', corner: '' } : t.s && t.s[i] === t.s[j] && i < j ? { corner: '=', cls: 'eq' } : {}; },
  sense(t, { i, j }, id, get) {
    const ks = Array.from({ length: j - i }, (_, d) => i + d);
    switch (id) {
      case 'same': return items(t)[i] === items(t)[j];
      case 'weight': return t.w.slice(i, j + 1).reduce((a, b) => a + b, 0);
      case 'segL': return ks.map(k => get(`${i},${k}`));
      case 'segR': return ks.map(k => get(`${k + 1},${j}`));
    }
    return null;
  },
  /** The arm, at every split point k: the left part i … k and the right part k + 1 … j, as two segments. */
  arm(t, { i, j }) {
    const ks = Array.from({ length: j - i }, (_, d) => i + d);
    return {
      label: tr(`按切分点，一共 ${ks.length} 个`, `${ks.length} split point${ks.length === 1 ? '' : 's'}`),
      sweeps: [
        { sensor: 'segL', label: tr('左段', 'left part'), cells: ks.map(k => ({ key: `${i},${k}`, label: short(i, k) })) },
        { sensor: 'segR', label: tr('右段', 'right part'), cells: ks.map(k => ({ key: `${k + 1},${j}`, label: short(k + 1, j) })) },
      ],
    };
  },
  base: (t, o) => {
    const n = items(t).length, b = [];
    if (o.empty0) for (let i = 1; i < n; i++) b.push([`${i},${i - 1}`, 0]);
    if (o.diag !== undefined) for (let i = 0; i < n; i++) b.push([`${i},${i}`, o.diag]);
    return b;
  },
  order: (t, o) => ORDERS[o.scan || 'len'].list(items(t).length).filter(([i, j]) => o.diag === undefined || i < j).map(([i, j]) => ({ i, j, id: `${i},${j}` })),
  keys: (t, x) => ({ cell: x.id }),
  where: x => span(x.i, x.j),
  answerKey: t => `0,${items(t).length - 1}`,
  answer(t, table) { return table.get(this.answerKey(t)); },
  name: key => { const [i, j] = key.split(',').map(Number); return i > j ? tr('空段', 'empty run') : tr(`${span(i, j)}这一段`, `the run of ${span(i, j)}`); },
  label: t => (t.s ? t.s : t.w ? tr(`${t.w.length} 堆 · ${t.w.join(' ')}`, `${t.w.length} piles · ${t.w.join(' ')}`) : t.words.join(' ')),
  orderText: o => ORDERS[o.scan || 'len'].l,
  sample: t => { const j = Math.min(2, items(t).length - 1); return { i: 0, j, id: `0,${j}` }; },
  cellOf: (t, key, o) => { const [i, j] = key.split(',').map(Number); return i < j || (i === j && o.diag === undefined) ? { i, j, id: key } : null; },
  scene(t, view, o = {}) {
    const n = items(t).length, g = look(view, [this.answerKey(t)], this.base(t, o), o.bench), sp = 54, sz = 46, cells = [];
    const show = x => (t.words ? x : String(x)), word = x => (t.words && String(x).length > 3 ? ' word' : '');
    items(t).forEach((x, k) => {
      cells.push({ id: `tc${k}`, x: k * sp, y: -sp + 12, w: sz, h: 30, value: show(x), cls: `axis${word(x)}` });
      cells.push({ id: `tr${k}`, x: -sp + 6, y: k * sp, w: 34, h: sz, value: show(x), cls: `axis${word(x)}` });
    });
    for (let i = 0; i < n; i++) for (let j = Math.max(0, i - 1); j < n; j++) {
      const id = `${i},${j}`, m = this.mark(t, id), empty = i > j;
      if (empty && !o.empty0) continue;
      cells.push({ id, x: j * sp, y: i * sp, w: sz, h: sz, value: g.val(id), corner: m.corner || '', cls: [m.cls, g.cls(id)].filter(Boolean).join(' '), tap: !empty && g.tap(id), aria: this.name(id) });
    }
    return { cells, edges: g.arrows(), robot: g.robot };
  },
});
