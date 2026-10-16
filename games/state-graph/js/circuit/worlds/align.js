// Alignment tables: one word on top, one on the left.

import { E } from '../../svg.js';
import { ORDERS } from '../../algo.js';
import { world, look, cell, yes } from '../world.js';

/* ---------- alignment table: one word on top, one on the left ---------- */

const align = world({
  taps: {
    ul: cell('左上', '左上', [0, -1, -1]), up: cell('上面', '上', [0, -1, 0]), left: cell('左边', '左', [0, 0, -1]),
    same: yes('两字相同', '同', 'eq'), start: yes('是起点', '起', 'flag'),
  },
  facts: ['same', 'start'],
  outs: [['cell', '本格', [0, 0, 0]]],
  here: (t, { i, j }) => [[i, j]],
  keyAt: (t, L, i, j) => (i >= 0 && i <= t.left.length && j >= 0 && j <= t.top.length ? `${i},${j}` : null),
  mark(t, key) { const [i, j] = key.split(',').map(Number); return i && j && t.left[i - 1] === t.top[j - 1] ? { corner: '=', cls: 'eq' } : {}; },
  fact: (t, { i, j }, id) => (id === 'same' ? !!(i && j && t.left[i - 1] === t.top[j - 1]) : !i && !j),
  base: (t, o) => {
    if (!o.border0) return [];
    const b = [];
    for (let i = 0; i <= t.left.length; i++) for (let j = 0; j <= t.top.length; j++) if (!i || !j) b.push([`${i},${j}`, 0]);
    return b;
  },
  order(t, o) {
    const cells = [];
    for (let i = 0; i <= t.left.length; i++) for (let j = 0; j <= t.top.length; j++) if (!o.border0 || (i && j)) cells.push({ i, j, id: `${i},${j}` });
    return cells;
  },
  keys: (t, x) => ({ cell: x.id }),
  where: x => `第 ${x.i} 行第 ${x.j} 列`,
  answerKey: t => `${t.left.length},${t.top.length}`,
  answer: (t, table) => table.get(align.answerKey(t)),
  name: key => { const [i, j] = key.split(','); return `第 ${i} 行第 ${j} 列`; },
  label: t => `${t.top} / ${t.left}`,
  orderText: () => ORDERS.rowTL.l,
  sample: t => { const i = Math.min(2, t.left.length), j = Math.min(2, t.top.length); return { i, j, id: `${i},${j}` }; },
  /** o.path: cells of a traced answer; o.okTop / o.okLeft: matched letters to highlight. */
  scene(t, view, o = {}) {
    const g = look(view, [align.answerKey(t)], align.base(t, o), o.bench), sp = 52, sz = 44, cells = [], path = new Set(o.path || []);
    const okT = o.okTop || new Set(), okL = o.okLeft || new Set();
    for (let j = 0; j <= t.top.length; j++) cells.push({ id: `t${j}`, x: j * sp, y: -sp + 10, w: sz, h: 32, value: j ? t.top[j - 1] : '空', cls: `axis${j ? '' : ' axis0'}${okT.has(j - 1) ? ' ok' : ''}` });
    for (let i = 0; i <= t.left.length; i++) cells.push({ id: `l${i}`, x: -sp + 8, y: i * sp, w: 32, h: sz, value: i ? t.left[i - 1] : '空', cls: `axis${i ? '' : ' axis0'}${okL.has(i - 1) ? ' ok' : ''}` });
    for (let i = 0; i <= t.left.length; i++) for (let j = 0; j <= t.top.length; j++) {
      const id = `${i},${j}`, m = align.mark(t, id);
      cells.push({ id, x: j * sp, y: i * sp, w: sz, h: sz, value: g.val(id), corner: m.corner || '', cls: [m.cls, g.cls(id), path.has(id) ? 'path' : ''].filter(Boolean).join(' '), tap: g.tap(id), aria: align.name(id) });
    }
    const edges = g.arrows();
    for (let q = 0; q + 1 < (o.path || []).length; q++) edges.push(E(o.path[q + 1], o.path[q], 'good'));
    return { cells, edges, robot: g.robot };
  },
});

export { align };
