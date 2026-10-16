// Tables laid out in one row: a staircase, a pile of stones, an amount paid in coins, the letters of a word.
// Cell i of the row is the small problem of size i; cell 0 is where every count starts.

import { T, tr } from '../../i18n.js';
import { world, look, cell, yes, seg, THIS_CELL } from '../world.js';

/**
 * A one-row world. spec = { noun(i), out, ground: [label, short, icon], near: { m1, m2, p1 } labels, label(t),
 * orderText?, cellType?, top?(t) letters drawn over the row, arm?, armTaps?, fact? (for the arm's segment) }.
 */
function line(spec) {
  const at = String, size = t => (spec.size ? spec.size(t) : t.n);
  const V = world({
    cellType: spec.cellType,
    taps: {
      m2: cell(...spec.near.m2, [0, 0, -2]), m1: cell(...spec.near.m1, [0, 0, -1]), p1: cell(...spec.near.p1, [0, 0, 1]),
      ground: yes(...spec.ground), ...(spec.armTaps ? { seg: seg(...spec.armTaps) } : {}),
    },
    facts: ['ground'],
    armTaps: spec.armTaps ? ['seg'] : undefined,
    outs: [['cell', spec.out, [0, 0, 0]]],
    here: (t, { i }) => [[0, i]],
    keyAt: (t, L, r, c) => (r === 0 && c >= 0 && c <= size(t) ? at(c) : null),
    mark: (t, key) => ({ corner: key }),
    fact: (t, x, id, get, o) => (id === 'ground' ? x.i === 0 : spec.segment(t, x, get, o)),
    arm: spec.arm,
    order: t => Array.from({ length: size(t) + 1 }, (_, i) => ({ i, id: at(i) })),
    keys: (t, x) => ({ cell: x.id }),
    where: x => spec.noun(x.i),
    answer: (t, table) => table.get(at(size(t))),
    name: key => spec.noun(+key),
    label: spec.label,
    orderText: () => spec.orderText || tr('从第 0 格往右', 'from cell 0 rightward'),
    sample: t => ({ i: Math.min(3, size(t)), id: at(Math.min(3, size(t))) }),
    scene(t, view, o = {}) {
      const g = look(view, [at(size(t))], [], o.bench), sp = 58;
      const cells = Array.from({ length: size(t) + 1 }, (_, i) => ({ id: at(i), x: i * sp, y: 0, w: 50, h: 50, value: g.val(at(i)), corner: i, cls: g.cls(at(i)), tap: g.tap(at(i)), aria: spec.noun(i) }));
      // Letters sit between the cells: letter k joins position k to position k + 1.
      if (spec.top) [...spec.top(t)].forEach((ch, k) => cells.push({ id: `ch${k}`, x: k * sp + sp / 2, y: -50, w: 36, h: 34, value: ch, cls: 'tile' }));
      const d = r => Math.abs(+r - +g.act.at[0]);
      return { cells, edges: g.arrows(undefined, r => (d(r) > 1 ? -(16 + 16 * Math.min(d(r), 6)) : 0)), robot: g.robot };
    },
  });
  return V;
}

/** Stairs: step 0 is the ground; a step is reached from one or two steps below. */
export const strip = line({
  noun: i => tr(`第 ${i} 级`, `step ${i}`), out: T('本级', 'this step'), ground: [T('是地面', 'is ground'), T('地', 'gnd'), 'ground'], label: t => tr(`第 ${t.n} 级`, `step ${t.n}`), orderText: T('从第 0 级往上', 'from step 0 upward'),
  near: { m2: [T('前 2 级', '2 steps down'), '−2'], m1: [T('前 1 级', '1 step down'), '−1'], p1: [T('后 1 级', '1 step up'), '+1'] },
});

/** A pile of n stones; cell i holds whether the player to move, with i stones left, wins. */
export const pile = line({
  cellType: 'bool', noun: i => tr(`剩 ${i} 颗`, `${i} left`), out: T('轮到的人赢吗', 'does the mover win'), ground: [T('一颗不剩', 'none left'), T('空', '0'), 'ground'], label: t => tr(`${t.n} 颗石子`, `${t.n} stones`), orderText: T('从一颗不剩开始，一颗一颗往上', 'from none left, one stone at a time upward'),
  near: { m2: [T('拿走 2 颗后', 'after taking 2'), '−2'], m1: [T('拿走 1 颗后', 'after taking 1'), '−1'], p1: [T('多 1 颗', 'one more'), '+1'] },
});

/** Paying i yuan: the arm steps back by every coin at once. */
export const coins = line({
  noun: i => tr(`${i} 元`, `${i} yuan`), out: THIS_CELL, ground: [T('是 0 元', 'is 0 yuan'), T('零', '0'), 'coin'], label: t => tr(`${t.n} 元 · 硬币 ${t.coins.join('、')}`, `${t.n} yuan · coins ${t.coins.join(', ')}`), orderText: T('从 0 元往上', 'from 0 yuan upward'),
  near: { m2: [T('少 2 元', '2 yuan less'), '−2'], m1: [T('少 1 元', '1 yuan less'), '−1'], p1: [T('多 1 元', '1 yuan more'), '+1'] },
  armTaps: [T('退一枚硬币之后', 'one coin back'), T('退', 'back')],
  arm: (t, { i }) => ({ label: tr('每种硬币各退一枚', 'one coin of each kind back'), sweeps: [{ tap: 'seg', label: tr('付掉一枚硬币之前', 'before paying one coin'), cells: t.coins.map(c => ({ key: i - c >= 0 ? String(i - c) : null, label: `−${c}` })) }] }),
  segment: (t, { i }, get) => t.coins.map(c => (i - c >= 0 ? get(String(i - c)) : null)),
});

/** Splitting a string into dictionary words: position i is "the first i letters"; the arm looks back at every position. */
export const words = line({
  cellType: 'bool', size: t => t.s.length, noun: i => tr(`前 ${i} 个字母`, `first ${i} letter${i === 1 ? '' : 's'}`), out: T('切得开吗', 'can it split'), ground: [T('是开头', 'is start'), T('头', 'start'), 'flag'], label: t => t.s, orderText: T('从开头往右', 'from the start rightward'), top: t => t.s,
  near: { m2: [T('少 2 个字母', '2 letters fewer'), '−2'], m1: [T('少 1 个字母', '1 letter fewer'), '−1'], p1: [T('多 1 个字母', '1 letter more'), '+1'] },
  armTaps: [T('前面每个位置', 'every earlier position'), T('扫', 'scan'), 'bools'],
  arm(t, { i }, o) {
    const cells = Array.from({ length: i }, (_, j) => { const w = t.s.slice(j, i); return { key: String(j), label: w, out: o.filter === 'word' && !t.dict.includes(w) }; });
    return { label: tr('扫过前面每个位置', 'sweeps every earlier position'), sweeps: [{ tap: 'seg', label: tr('从那个位置到这里', 'from there to here'), cells }], filters: [{ v: 'all', l: tr('全部', 'all') }, { v: 'word', l: tr('只留刚好是一个词的', 'only the ones that are exactly a word') }] };
  },
  segment: (t, { i }, get, o) => Array.from({ length: i }, (_, j) => j).filter(j => o.filter !== 'word' || t.dict.includes(t.s.slice(j, i))).map(j => get(String(j))),
});
