// The river: stones in a row, the bank at 0. Stone i says how far back the frog can jump onto it from (t.k[i]; null:
// no long jump lands here); the telescopic arm reaches that stone. With t.p, each stone also has a chance of holding
// the frog (the bank always holds).

import { T, tr } from '../../i18n.js';
import { world, look, cell, yes, num, THIS_CELL } from '../world.js';

const last = t => t.k.length - 1;
/** The stone a long jump onto stone i starts from, or null. */
const from = (t, i) => (i > 0 && t.k[i] && i - t.k[i] >= 0 ? i - t.k[i] : null);

export const river = world({
  sensors: {
    m1: cell(T('前一块', 'the stone before'), '−1', [0, 0, -1]),
    bank: yes(T('是岸边', 'is the bank'), T('岸', 'bank'), 'bank'),
    hold: num(T('站稳的可能', 'chance it holds'), T('稳', 'hold'), 'hold'),
    back: num(T('跳来的那块', 'the stone it jumps from'), T('跳', 'jump')),
  },
  facts: ['bank'],
  armSensors: ['back'],
  outs: [['cell', THIS_CELL, [0, 0, 0]]],
  here: (t, { i }) => [0, i],
  keyAt: (t, r, c) => (r === 0 && c >= 0 && c <= last(t) ? String(c) : null),
  mark: (t, key) => ({ corner: +key && t.k[+key] ? `↶${t.k[+key]}` : '' }),
  sense(t, { i }, id, get) {
    if (id === 'bank') return i === 0;
    if (id === 'hold') return t.p ? t.p[i] : 1;
    const j = from(t, i);
    return j === null ? null : get(String(j));
  },
  /** The arm reaches back to the stone a long jump onto this one starts from. */
  arm: (t, { i }) => {
    const j = from(t, i);
    return { label: j === null ? tr('没有长跳落在这里', 'no long jump lands here') : tr(`往回 ${t.k[i]} 块`, `${t.k[i]} back`), cells: [{ sensor: 'back', key: j === null ? null : String(j), label: tr('跳来处', 'from') }] };
  },
  order: t => Array.from({ length: last(t) + 1 }, (_, i) => ({ i, id: String(i) })),
  keys: (t, x) => ({ cell: x.id }),
  where: x => (x.i ? tr(`第 ${x.i} 块石头`, `stone ${x.i}`) : tr('岸边', 'the bank')),
  answer: (t, table) => table.get(String(last(t))),
  name: key => (+key ? tr(`第 ${key} 块石头`, `stone ${key}`) : tr('岸边', 'the bank')),
  label: t => tr(`${last(t)} 块石头`, `${last(t)} stones`),
  orderText: () => tr('从岸边往前，一块一块', 'from the bank onward, stone by stone'),
  sample: t => ({ i: Math.min(3, last(t)), id: String(Math.min(3, last(t))) }),
  scene(t, view, o = {}) {
    const g = look(view, [String(last(t))], [], o.bench), sp = 58;
    const cells = Array.from({ length: last(t) + 1 }, (_, i) => ({ id: String(i), x: i * sp, y: 0, w: 50, h: 50, value: g.val(String(i)), corner: this.mark(t, String(i)).corner, cls: [i ? 'stone' : 'bank', g.cls(String(i))].filter(Boolean).join(' '), tap: g.tap(String(i)), aria: this.name(String(i)) }));
    // How likely each stone is to hold, under it.
    if (t.p) t.p.forEach((p, i) => { if (i) cells.push({ id: `p${i}`, x: i * sp, y: 48, w: 44, h: 24, value: String(p), cls: 'tile' }); });
    const d = r => Math.abs(+r - +g.act.at[0]);
    return { cells, edges: g.arrows(undefined, r => (d(r) > 1 ? -(16 + 16 * Math.min(d(r), 6)) : 0)), robot: g.robot };
  },
});
