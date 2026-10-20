// Tables laid out in one row: a staircase, a pile of stones, an amount paid in coins, the letters of a word.
// Cell i of the row is the small problem of size i; cell 0 is where every count starts.

import { T, tr } from '../../i18n.js';
import { world, look, cell, yes, seg, THIS_CELL } from '../world.js';

/**
 * A one-row world. spec = { noun(i), out, ground: [label, short, icon], near: { m1, m2, p1 } labels, label(t),
 * orderText?, cellType?, top?(t) letters drawn over the row, arm?, armSensor? (the arm's segment sensor), segment?,
 * more?: { id: [label, short, icon, is(t, i)] } further yes / no facts about a cell, drawn as rocks where they hold,
 * arms?: { id: [label, short, type?] } several segments the arm brings at once (segment(t, cell, get, o, id) reads each) }.
 */
function line(spec) {
  const at = String, size = t => (spec.size ? spec.size(t) : t.n);
  const V = world({
    cellType: spec.cellType,
    sensors: {
      m2: cell(...spec.near.m2, [0, 0, -2]), m1: cell(...spec.near.m1, [0, 0, -1]), p1: cell(...spec.near.p1, [0, 0, 1]),
      ground: yes(...spec.ground), ...(spec.armSensor ? { seg: seg(...spec.armSensor) } : {}),
      ...Object.fromEntries(Object.entries(spec.arms || {}).map(([id, a]) => [id, seg(...a)])),
      ...Object.fromEntries(Object.entries(spec.more || {}).map(([id, [label, short, icon]]) => [id, yes(label, short, icon)])),
    },
    facts: ['ground'],
    armSensors: spec.arms ? Object.keys(spec.arms) : spec.armSensor ? ['seg'] : undefined,
    outs: [['cell', spec.out, [0, 0, 0]]],
    here: (t, { i }) => [0, i],
    keyAt: (t, r, c) => (r === 0 && c >= 0 && c <= size(t) ? at(c) : null),
    mark: (t, key) => ({ corner: key, ...(Object.values(spec.more || {}).some(m => m[3](t, +key)) ? { cls: 'rock' } : {}) }),
    sense: (t, x, id, get, o) => (id === 'ground' ? x.i === 0 : spec.more?.[id] ? spec.more[id][3](t, x.i) : spec.segment(t, x, get, o, id)),
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
      const cells = Array.from({ length: size(t) + 1 }, (_, i) => ({ id: at(i), x: i * sp, y: 0, w: 50, h: 50, value: g.val(at(i)), corner: i, cls: [this.mark(t, at(i)).cls, g.cls(at(i))].filter(Boolean).join(' '), tap: g.tap(at(i)), aria: spec.noun(i) }));
      // Letters sit between the cells: letter k joins position k to position k + 1.
      if (spec.top) [...spec.top(t)].forEach((ch, k) => cells.push({ id: `ch${k}`, x: k * sp + sp / 2, y: -50, w: 36, h: 34, value: ch, cls: 'tile' }));
      const d = r => Math.abs(+r - +g.act.at[0]);
      return { cells, edges: g.arrows(undefined, r => (d(r) > 1 ? -(16 + 16 * Math.min(d(r), 6)) : 0)), robot: g.robot };
    },
  });
  return V;
}

/** Stairs: step 0 is the ground; a step is reached from one or two steps below. A broken step (t.broken) can't be
 *  stood on. */
export const strip = line({
  more: { broken: [T('是坏台阶', 'is broken'), T('坏', 'broken'), 'brokenstep', (t, i) => (t.broken || []).includes(i)] },
  noun: i => tr(`第 ${i} 级`, `step ${i}`), out: T('本级', 'this step'), ground: [T('是地面', 'is ground'), T('地', 'gnd'), 'ground'], label: t => tr(`第 ${t.n} 级`, `step ${t.n}`), orderText: T('从第 0 级往上', 'from step 0 upward'),
  near: { m2: [T('前 2 级', '2 steps down'), '−2'], m1: [T('前 1 级', '1 step down'), '−1'], p1: [T('后 1 级', '1 step up'), '+1'] },
});

/** A pile of n stones; cell i holds whether the player to move, with i stones left, wins. */
export const pile = line({
  cellType: 'bool', noun: i => tr(`剩 ${i} 颗`, `${i} left`), out: T('轮到的人赢吗', 'does the mover win'), ground: [T('一颗不剩', 'none left'), T('空', '0'), 'empty'], label: t => tr(`${t.n} 颗石子`, `${t.n} stones`), orderText: T('从一颗不剩开始，一颗一颗往上', 'from none left, one stone at a time upward'),
  near: { m2: [T('拿走 2 颗后', 'after taking 2'), '−2'], m1: [T('拿走 1 颗后', 'after taking 1'), '−1'], p1: [T('多 1 颗', 'one more'), '+1'] },
});

/** Paying i yuan: the arm steps back by every coin at once. */
export const coins = line({
  noun: i => tr(`${i} 元`, `${i} yuan`), out: THIS_CELL, ground: [T('是 0 元', 'is 0 yuan'), T('零', '0'), 'zero'], label: t => tr(`${t.n} 元 · 硬币 ${t.coins.join('、')}`, `${t.n} yuan · coins ${t.coins.join(', ')}`), orderText: T('从 0 元往上', 'from 0 yuan upward'),
  near: { m2: [T('少 2 元', '2 yuan less'), '−2'], m1: [T('少 1 元', '1 yuan less'), '−1'], p1: [T('多 1 元', '1 yuan more'), '+1'] },
  armSensor: [T('退一枚硬币之后', 'one coin back'), T('退', 'back')],
  arm: (t, { i }) => ({ label: tr('每种硬币各退一枚', 'one coin of each kind back'), sweeps: [{ sensor: 'seg', label: tr('付掉一枚硬币之前', 'before paying one coin'), cells: t.coins.map(c => ({ key: i - c >= 0 ? String(i - c) : null, label: `−${c}` })) }] }),
  segment: (t, { i }, get) => t.coins.map(c => (i - c >= 0 ? get(String(i - c)) : null)),
});

/** Splitting a string into dictionary words: position i is "the first i letters"; the arm looks back at every position. */
export const words = line({
  cellType: 'bool', size: t => t.s.length, noun: i => tr(`前 ${i} 个字母`, `first ${i} letter${i === 1 ? '' : 's'}`), out: T('切得开吗', 'can it split'), ground: [T('是开头', 'is start'), T('头', 'start'), 'flag'], label: t => t.s, orderText: T('从开头往右', 'from the start rightward'), top: t => t.s,
  near: { m2: [T('少 2 个字母', '2 letters fewer'), '−2'], m1: [T('少 1 个字母', '1 letter fewer'), '−1'], p1: [T('多 1 个字母', '1 letter more'), '+1'] },
  armSensor: [T('前面每个位置', 'every earlier position'), T('扫', 'scan'), 'bools'],
  arm(t, { i }, o) {
    const cells = Array.from({ length: i }, (_, j) => { const w = t.s.slice(j, i); return { key: String(j), label: w, out: o.filter === 'word' && !t.dict.includes(w) }; });
    return { label: tr('扫过前面每个位置', 'sweeps every earlier position'), sweeps: [{ sensor: 'seg', label: tr('从那个位置到这里', 'from there to here'), cells }], filters: [{ v: 'all', l: tr('全部', 'all') }, { v: 'word', l: tr('只留刚好是一个词的', 'only the ones that are exactly a word') }] };
  },
  segment: (t, { i }, get, o) => Array.from({ length: i }, (_, j) => j).filter(j => o.filter !== 'word' || t.dict.includes(t.s.slice(j, i))).map(j => get(String(j))),
});

/** What a piece costs (t.dict: { word: cost }, or a list of words at 1 each); a single letter outside the dictionary
 *  may stand alone at t.letter, when the level allows it. null: the piece can't be cut off. */
const pieceCost = (t, w) => {
  const d = Array.isArray(t.dict) ? Object.fromEntries(t.dict.map(x => [x, 1])) : t.dict;
  return w in d ? d[w] : w.length === 1 && t.letter !== undefined ? t.letter : null;
};
/** Cutting a string into pieces at the least cost: position i is "the first i letters". The arm sweeps every earlier
 *  cut point j and brings two segments of the same length: the table there, and what the piece from j to here costs. */
export const pieces = line({
  size: t => t.s.length, noun: i => tr(`前 ${i} 个字母`, `first ${i} letter${i === 1 ? '' : 's'}`), out: T('切到这里最省', 'cheapest cut so far'), ground: [T('是开头', 'is start'), T('头', 'start'), 'flag'], label: t => t.s, orderText: T('从开头往右', 'from the start rightward'), top: t => t.s,
  near: { m2: [T('少 2 个字母', '2 letters fewer'), '−2'], m1: [T('少 1 个字母', '1 letter fewer'), '−1'], p1: [T('多 1 个字母', '1 letter more'), '+1'] },
  arms: { seg: [T('前面每个切点', 'every earlier cut'), T('切点', 'cuts')], cost: [T('切下的那一块', 'the piece cut off'), T('代价', 'cost')] },
  arm(t, { i }) {
    const js = Array.from({ length: i }, (_, j) => j);
    return { label: tr('扫过前面每个切点', 'sweeps every earlier cut'), sweeps: [
      { sensor: 'seg', label: tr('切在那里', 'cut there'), cells: js.map(j => ({ key: String(j), label: String(j) })) },
      { sensor: 'cost', label: tr('那里到这里的一块', 'the piece from there to here'), cells: js.map(j => ({ key: null, label: t.s.slice(j, i), v: pieceCost(t, t.s.slice(j, i)), out: pieceCost(t, t.s.slice(j, i)) === null })) },
    ] };
  },
  segment: (t, { i }, get, o, id) => Array.from({ length: i }, (_, j) => (id === 'cost' ? pieceCost(t, t.s.slice(j, i)) : get(String(j)))),
});
