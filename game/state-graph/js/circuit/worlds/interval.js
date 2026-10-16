// The interval table: cell (i, j) answers the question for items i … j of a row (letters, stones, words).
// Rows are i, columns are j, so only the upper triangle is used; a short segment sits near the diagonal, and the
// whole row's answer is in the top-right corner. A level may fill the diagonal (single items, o.diag) and the empty
// segments just under it (o.empty0) before the robot starts.

import { world, look, cell, yes, num, seg } from '../world.js';

const items = t => [...(t.s || t.w || t.words)];
const ORDERS = {
  rowTL: { l: '逐行，从上往下', list: n => { const o = []; for (let i = 0; i < n; i++) for (let j = i; j < n; j++) o.push([i, j]); return o; } },
  rowBR: { l: '逐行，从下往上', list: n => { const o = []; for (let i = n - 1; i >= 0; i--) for (let j = i; j < n; j++) o.push([i, j]); return o; } },
  colL: { l: '逐列，每列从上往下', list: n => { const o = []; for (let j = 0; j < n; j++) for (let i = 0; i <= j; i++) o.push([i, j]); return o; } },
  colLB: { l: '逐列，每列从下往上', list: n => { const o = []; for (let j = 0; j < n; j++) for (let i = j; i >= 0; i--) o.push([i, j]); return o; } },
  len: { l: '按长度，从短到长', list: n => { const o = []; for (let d = 0; d < n; d++) for (let i = 0; i + d < n; i++) o.push([i, i + d]); return o; } },
};
const span = (i, j) => (i === j ? `第 ${i + 1} 个` : `第 ${i + 1}–${j + 1} 个`);

export const interval = world({
  taps: {
    left: cell('左边', '左', [0, 0, -1]), down: cell('下面', '下', [0, 1, 0]), dl: cell('左下', '左下', [0, 1, -1]),
    same: yes('两端相同', '同', 'eq'), weight: num('这段总重', '重', 'gem'),
    segL: seg('左段们', '左'), segR: seg('右段们', '右'),
  },
  facts: ['same', 'weight'],
  armTaps: ['segL', 'segR'],
  outs: [['cell', '本格', [0, 0, 0]]],
  dial: Object.fromEntries(Object.entries(ORDERS).map(([id, o]) => [id, { l: o.l, fig: { R: 4, C: 4, list: o.list(4) } }])),
  here: (t, { i, j }) => [[i, j]],
  keyAt: (t, L, i, j) => (i >= 0 && j >= 0 && i < items(t).length && j < items(t).length && i <= j + 1 ? `${i},${j}` : null),
  mark: (t, key) => { const [i, j] = key.split(',').map(Number); return i > j ? { cls: 'void', corner: '' } : t.s && t.s[i] === t.s[j] && i < j ? { corner: '=', cls: 'eq' } : {}; },
  fact(t, { i, j }, id, get) {
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
      label: `按切分点，一共 ${ks.length} 个`,
      sweeps: [
        { tap: 'segL', label: '左段', cells: ks.map(k => ({ key: `${i},${k}`, label: span(i, k).replace('第 ', '').replace(' 个', '') })) },
        { tap: 'segR', label: '右段', cells: ks.map(k => ({ key: `${k + 1},${j}`, label: span(k + 1, j).replace('第 ', '').replace(' 个', '') })) },
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
  name: key => { const [i, j] = key.split(',').map(Number); return i > j ? '空段' : `${span(i, j)}这一段`; },
  label: t => (t.s ? t.s : t.w ? `${t.w.length} 堆 · ${t.w.join(' ')}` : t.words.join(' ')),
  orderText: o => ORDERS[o.scan || 'len'].l,
  sample: t => { const j = Math.min(2, items(t).length - 1); return { i: 0, j, id: `0,${j}` }; },
  cellOf: (t, key, o) => { const [i, j] = key.split(',').map(Number); return i < j || (i === j && o.diag === undefined) ? { i, j, id: key } : null; },
  scene(t, view, o = {}) {
    const n = items(t).length, g = look(view, [this.answerKey(t)], this.base(t, o), o.bench), sp = 54, sz = 46, cells = [];
    const show = x => (t.words ? x : String(x));
    items(t).forEach((x, k) => {
      cells.push({ id: `tc${k}`, x: k * sp, y: -sp + 12, w: sz, h: 30, value: show(x), cls: 'axis' });
      cells.push({ id: `tr${k}`, x: -sp + 6, y: k * sp, w: 34, h: sz, value: show(x), cls: 'axis' });
    });
    for (let i = 0; i < n; i++) for (let j = Math.max(0, i - 1); j < n; j++) {
      const id = `${i},${j}`, m = this.mark(t, id), empty = i > j;
      if (empty && !o.empty0) continue;
      cells.push({ id, x: j * sp, y: i * sp, w: sz, h: sz, value: g.val(id), corner: m.corner || '', cls: [m.cls, g.cls(id)].filter(Boolean).join(' '), tap: !empty && g.tap(id), aria: this.name(id) });
    }
    return { cells, edges: g.arrows(), robot: g.robot };
  },
});
