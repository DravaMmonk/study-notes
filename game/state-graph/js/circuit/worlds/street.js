// A street of houses: the houses' numbers on top, the table in rows under them.

import { world, look, cell, num, seg } from '../world.js';

/* ---------- street of houses: the houses on top, then one row, or three rows once the state remembers "robbed or not" ---------- */

function robPlan(a) {
  const n = a.length, no = [0], rb = [-Infinity];
  for (let i = 1; i <= n; i++) { no[i] = Math.max(no[i - 1], rb[i - 1]); rb[i] = no[i - 1] + a[i - 1]; }
  const plan = [];
  for (let i = n, s = rb[n] > no[n] ? 1 : 0; i >= 1; i--) { if (s) { plan.push(i); s = 0; } else s = rb[i - 1] > no[i - 1] ? 1 : 0; }
  return plan;
}

/**
 * rows: [[outId, label, value before house 1]]; the robot stands on the middle row of its column.
 * The houses' numbers are drawn on the board's top row but are read only as the fact 「这家的钱」 (or its own name), or by
 * a sweeping arm. more = { money: [label, short, icon], top, unit(j), arm, armTaps, segment, answer, answerKeys, label }.
 */
const street = (rows, taps, more = {}) => {
  const mid = Math.floor((rows.length - 1) / 2), unit = more.unit || (j => `${j}号`), V = world({
    taps: { ...taps, money: num(...(more.money || ['这家的钱', '钱', 'coin'])), ...(more.armTaps ? { seg: seg(...more.armTaps) } : {}) },
    facts: ['money'],
    armTaps: more.armTaps ? ['seg'] : undefined,
    arm: more.arm,
    shown: (L, dr) => dr === -1 - mid,
    outs: rows.map(([id, label], r) => [id, label, [0, r - mid, 0]]),
    here: (t, { i }) => [[1 + mid, i]],
    keyAt: (t, L, r, c) => (r === 0 ? (c >= 1 && c <= t.a.length ? `h:${c}` : null) : r <= rows.length && c >= 0 && c <= t.a.length ? `${r - 1}:${c}` : null),
    mark: (t, key) => (key.startsWith('h:') ? { cls: 'house', corner: unit(key.slice(2)) } : {}),
    fact: (t, x, id, get, o) => (id === 'money' ? t.a[x.i - 1] : more.segment(t, x, get, o)),
    base: t => [...rows.map(([, , v], r) => [`${r}:0`, v]), ...t.a.map((x, j) => [`h:${j + 1}`, x])],
    order: t => t.a.map((_, k) => ({ i: k + 1 })),
    keys: (t, { i }) => Object.fromEntries(rows.map(([id], r) => [id, `${r}:${i}`])),
    where: x => `${unit(x.i)}`,
    answerKeys: more.answerKeys || (t => [`${rows.length - 1}:${t.a.length}`]),
    answer: more.answer || ((t, table) => table.get(`${rows.length - 1}:${t.a.length}`)),
    name: key => (key.startsWith('h:') ? `${unit(key.slice(2))}的${(more.money || ['钱'])[0].replace(/^这家的|^这一根的/, '')}` : `${unit(key.split(':')[1])}的「${rows[key.split(':')[0]][1]}」格`),
    label: more.label || (t => `${t.a.length} 户人家`),
    orderText: () => `从${unit(1)}往后`,
    sample: t => ({ i: Math.min(2, t.a.length) }),
    scene(t, view, o = {}) {
      const g = look(view, V.answerKeys(t), V.base(t), o.bench), n = t.a.length, sp = 60, sz = 50, y0 = 92;
      const plan = view && view.end && view.pass && rows.length > 1 ? robPlan(t.a) : [];
      const cells = t.a.map((x, j) => ({ id: `h:${j + 1}`, x: (j + 1) * sp, y: 0, w: sz, h: 58, label: unit(j + 1), value: x, cls: `house${plan.includes(j + 1) ? ' hot' : g.reads.has(`h:${j + 1}`) ? ' pred' : ''}` }));
      const texts = [{ x: -sz / 2 - 10, y: 5, t: more.top || '每家的钱', anchor: 'end' }];
      rows.forEach(([, label], r) => {
        texts.push({ x: -sz / 2 - 10, y: y0 + r * sp + 5, t: label, anchor: 'end', cls: 'hd' });
        for (let i = 0; i <= n; i++) {
          const id = `${r}:${i}`;
          cells.push({ id, x: i * sp, y: y0 + r * sp, w: sz, h: sz, value: g.val(id), corner: r === 0 ? i : '', cls: g.cls(id), tap: g.tap(id), aria: V.name(id) });
        }
      });
      const far = rk => !rk.startsWith('h:') && Math.abs(+rk.split(':')[1] - g.act.cell.i) > 1;
      return { cells, edges: g.arrows(rk => (rk.startsWith('h:') ? `0:${g.act.cell.i}` : `${rk.split(':')[0]}:${g.act.cell.i}`), rk => (far(rk) ? -(18 + 10 * Math.min(6, Math.abs(+rk.split(':')[1] - g.act.cell.i))) : 0)), texts, robot: g.robot };
    },
  });
  return V;
};

export const rob1 = street([['cell', '最多偷到', 0]], { prev: cell('上一格', '上格', [0, 0, -1]) });
export const rob2 = street([['no', '这家没偷', 0], ['yes', '这家偷了', null], ['best', '最多偷到', 0]], {
  pn: cell('上家没偷', '没偷', [0, -1, -1]), pr: cell('上家偷了', '偷了', [0, 0, -1]),
});

/** Running totals: cell i is the money of houses 1 … i. The arm sweeps the houses themselves. */
export const prefix = street([['cell', '到这家一共', 0]], { prev: cell('上一格', '左格', [0, 0, -1]) }, {
  armTaps: ['这家和前面每家的钱', '扫'],
  arm: (t, { i }) => ({ label: '扫过前面每一家', sweeps: [{ tap: 'seg', label: '1 号到这一家', cells: Array.from({ length: i }, (_, j) => ({ key: `h:${j + 1}`, label: `${j + 1}号` })) }] }),
  segment: (t, { i }, get) => Array.from({ length: i }, (_, j) => get(`h:${j + 1}`)),
});

/**
 * Rising runs: posts of different heights in a row; cell i is the longest run of ever-taller posts that ends at post i.
 * Column 0 is a post shorter than all, holding 0, so a run can start anywhere. The arm sweeps every earlier cell.
 */
export const heights = street([['cell', '最长连几根', 0]], { prev: cell('上一格', '左格', [0, 0, -1]) }, {
  money: ['这一根的高度', '高', 'ground'], top: '每根的高度', unit: j => `${j}号`, label: t => `${t.a.length} 根柱子`,
  armTaps: ['前面每一根', '扫'],
  arm(t, { i }, o) {
    const cells = Array.from({ length: i }, (_, j) => ({ key: `0:${j}`, label: j ? `${j}号` : '起', out: o.filter === 'lower' && j > 0 && !(t.a[j - 1] < t.a[i - 1]) }));
    return { label: '扫过前面每一根', sweeps: [{ tap: 'seg', label: '起点到上一根', cells }], filters: [{ v: 'all', l: '全部' }, { v: 'lower', l: '只留比这根矮的' }] };
  },
  segment: (t, { i }, get, o) => Array.from({ length: i }, (_, j) => j).filter(j => o.filter !== 'lower' || j === 0 || t.a[j - 1] < t.a[i - 1]).map(j => get(`0:${j}`)),
  answerKeys: t => t.a.map((_, j) => `0:${j + 1}`),
  answer: (t, table) => Math.max(...t.a.map((_, j) => table.get(`0:${j + 1}`) ?? -Infinity)),
});
