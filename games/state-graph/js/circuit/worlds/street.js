// A street of houses: the houses' numbers on top, the table in rows under them.

import { T, tr, isEn } from '../../i18n.js';
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
 * a sweeping arm. more = { money: [label, short, icon], noun, top, unit(j), long(j), arm, armSensor, segment, answer, answerKeys, label }.
 * unit(j) is the short tag on the board (「3号」); long(j) names it in English sentences (house 3); noun is what a house holds.
 */
const street = (rows, sensors, more = {}) => {
  const unit = more.unit || (j => tr(`${j}号`, `#${j}`)), long = j => (isEn() ? (more.long || (k => `house ${k}`))(j) : unit(j)), noun = more.noun || T('钱', 'money');
  const mid = Math.floor((rows.length - 1) / 2), V = world({
    sensors: { ...sensors, money: num(...(more.money || [T('这家的钱', "this house's money"), T('钱', '$'), 'coin'])), ...(more.armSensor ? { seg: seg(...more.armSensor) } : {}) },
    facts: ['money'],
    armSensors: more.armSensor ? ['seg'] : undefined,
    arm: more.arm,
    shown: (L, dr) => dr === -1 - mid,
    outs: rows.map(([id, label], r) => [id, label, [0, r - mid, 0]]),
    here: (t, { i }) => [1 + mid, i],
    keyAt: (t, r, c) => (r === 0 ? (c >= 1 && c <= t.a.length ? `h:${c}` : null) : r <= rows.length && c >= 0 && c <= t.a.length ? `${r - 1}:${c}` : null),
    mark: (t, key) => (key.startsWith('h:') ? { cls: 'house', corner: unit(key.slice(2)) } : {}),
    sense: (t, x, id, get, o) => (id === 'money' ? t.a[x.i - 1] : more.segment(t, x, get, o)),
    base: t => [...rows.map(([, , v], r) => [`${r}:0`, v]), ...t.a.map((x, j) => [`h:${j + 1}`, x])],
    order: t => t.a.map((_, k) => ({ i: k + 1 })),
    keys: (t, { i }) => Object.fromEntries(rows.map(([id], r) => [id, `${r}:${i}`])),
    where: x => `${long(x.i)}`,
    answerKeys: more.answerKeys || (t => [`${rows.length - 1}:${t.a.length}`]),
    answer: more.answer || ((t, table) => table.get(`${rows.length - 1}:${t.a.length}`)),
    name: key => (key.startsWith('h:') ? tr(`${unit(key.slice(2))}的${noun}`, `${long(key.slice(2))}'s ${noun}`) : tr(`${unit(key.split(':')[1])}的「${rows[key.split(':')[0]][1]}」格`, `the “${rows[key.split(':')[0]][1]}” cell of ${long(key.split(':')[1])}`)),
    label: more.label || (t => tr(`${t.a.length} 户人家`, `${t.a.length} houses`)),
    orderText: () => tr(`从${unit(1)}往后`, `from ${long(1)} onward`),
    sample: t => ({ i: Math.min(2, t.a.length) }),
    scene(t, view, o = {}) {
      const g = look(view, V.answerKeys(t), V.base(t), o.bench), n = t.a.length, sp = 60, sz = 50, y0 = 92;
      const plan = view && view.end && view.pass && rows.length > 1 ? robPlan(t.a) : [];
      const cells = t.a.map((x, j) => ({ id: `h:${j + 1}`, x: (j + 1) * sp, y: 0, w: sz, h: 58, label: unit(j + 1), value: x, cls: `house${plan.includes(j + 1) ? ' hot' : g.reads.has(`h:${j + 1}`) ? ' pred' : ''}` }));
      const texts = [{ x: -sz / 2 - 10, y: 5, t: more.top || tr('每家的钱', 'money'), anchor: 'end' }];
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

const BEST = T('最多偷到', 'most so far'), PREV = T('上一格', 'previous');
export const rob1 = street([['cell', BEST, 0]], { prev: cell(PREV, T('上格', 'prev'), [0, 0, -1]) });
export const rob2 = street([['no', T('这家没偷', 'skipped'), 0], ['yes', T('这家偷了', 'robbed'), null], ['best', BEST, 0]], {
  pn: cell(T('上家没偷', 'prev skipped'), T('没偷', 'skip'), [0, -1, -1]), pr: cell(T('上家偷了', 'prev robbed'), T('偷了', 'rob'), [0, 0, -1]),
});

/** Running totals: cell i is the money of houses 1 … i. The arm sweeps the houses themselves. */
export const prefix = street([['cell', T('到这家一共', 'total so far'), 0]], { prev: cell(PREV, T('左格', 'prev'), [0, 0, -1]) }, {
  armSensor: [T('这家和前面每家的钱', 'money of this house and every one before'), T('扫', 'scan')],
  arm: (t, { i }) => ({ label: tr('扫过前面每一家', 'sweeps every house so far'), sweeps: [{ sensor: 'seg', label: tr('1 号到这一家', 'house 1 to this one'), cells: Array.from({ length: i }, (_, j) => ({ key: `h:${j + 1}`, label: tr(`${j + 1}号`, `#${j + 1}`) })) }] }),
  segment: (t, { i }, get) => Array.from({ length: i }, (_, j) => get(`h:${j + 1}`)),
});

/**
 * Rising runs: posts of different heights in a row; cell i is the longest run of ever-taller posts that ends at post i.
 * Column 0 is a post shorter than all, holding 0, so a run can start anywhere. The arm sweeps every earlier cell.
 */
export const heights = street([['cell', T('最长连几根', 'longest run'), 0]], { prev: cell(PREV, T('左格', 'prev'), [0, 0, -1]) }, {
  money: [T('这一根的高度', "this post's height"), T('高', 'ht'), 'ground'], noun: T('高度', 'height'), top: T('每根的高度', 'height'),
  unit: j => tr(`${j}号`, `#${j}`), long: j => `post ${j}`, label: t => tr(`${t.a.length} 根柱子`, `${t.a.length} posts`),
  armSensor: [T('前面每一格', 'every earlier cell'), T('扫', 'scan')],
  arm(t, { i }, o) {
    const cells = Array.from({ length: i }, (_, j) => ({ key: `0:${j}`, label: j ? tr(`${j}号`, `#${j}`) : undefined, mark: j ? undefined : 'start', out: o.filter === 'lower' && j > 0 && !(t.a[j - 1] < t.a[i - 1]) }));
    return { label: tr('扫过前面每一格', 'sweeps every earlier cell'), sweeps: [{ sensor: 'seg', label: tr('起点到上一格', 'from the start to the previous cell'), cells }], filters: [{ v: 'all', l: tr('全部', 'all') }, { v: 'lower', l: tr('只留比这根矮的', 'only posts shorter than this one') }] };
  },
  segment: (t, { i }, get, o) => Array.from({ length: i }, (_, j) => j).filter(j => o.filter !== 'lower' || j === 0 || t.a[j - 1] < t.a[i - 1]).map(j => get(`0:${j}`)),
  answerKeys: t => t.a.map((_, j) => `0:${j + 1}`),
  answer: (t, table) => Math.max(...t.a.map((_, j) => table.get(`0:${j + 1}`) ?? -Infinity)),
});
