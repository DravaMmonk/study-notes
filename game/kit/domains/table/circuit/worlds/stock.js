// Trading one stock on 千层: one layer for each state you can be in at the end of a day (not bought yet, holding,
// sold…), the days along each layer. Every layer runs the same board: stay as you were (left), or step over from the
// state you come from (the probe reads that layer's previous day) and book what the step brings in (buying costs
// today's price, selling earns it, waiting earns nothing).
// t = { p: [price on day 1 …], cool?: true }: without `cool` you trade once (the last state is final); with it you may
// trade again, but only a day after selling.

import { T, tr } from '../../i18n.js';
import { world, look, cell, num, DIR, THIS_CELL } from '../world.js';

/** The layers: [id, name, the layer a step comes from, what the step brings in]. */
const LAYERS = {
  once: [['free', T('还没买', 'not bought yet'), null, 'wait'], ['hold', T('手里有股', 'holding'), 'free', 'buy'], ['sold', T('卖掉了', 'sold'), 'hold', 'sell']],
  cool: [['free', T('空手', 'empty-handed'), 'sold', 'wait'], ['hold', T('手里有股', 'holding'), 'free', 'buy'], ['sold', T('刚卖掉', 'just sold'), 'hold', 'sell']],
};
const layersOf = t => LAYERS[t.cool ? 'cool' : 'once'];
const days = t => t.p.length;
const fromOf = (t, m) => { const f = layersOf(t)[m][2]; return f ? layersOf(t).findIndex(l => l[0] === f) : -1; };
const gainOf = (t, m, d) => ({ buy: -t.p[d - 1], sell: t.p[d - 1], wait: 0 })[layersOf(t)[m][3]];

export const stock = world({
  sensors: {
    left: cell(...DIR.left, [0, 0, -1]),
    gain: num(T('这一步的进账', 'what the step brings in'), T('进账', 'in'), 'gain'),
    leftPrev: cell(T('来处那层·前一天', 'the layer it comes from · the day before'), T('来←', 'from←')),
  },
  facts: ['gain'],
  armSensors: ['leftPrev'],
  outs: [['cell', THIS_CELL, [0, 0, 0]]],
  here: (t, { d }) => [0, d],
  keyAt: (t, r, c, x) => (r === 0 && c >= 0 && c <= days(t) ? `${x ? x.m : 0}:${c}` : null),
  winLabel: (t, x) => tr(`「${layersOf(t)[x.m][1]}」这一层`, `layer: ${layersOf(t)[x.m][1]}`),
  mark: (t, key) => ({ corner: key.split(':')[1] }),
  sense(t, { m, d }, id, get) {
    if (id === 'gain') return gainOf(t, m, d);
    const f = fromOf(t, m);
    return f < 0 ? null : get(`${f}:${d - 1}`);
  },
  /** The probe reads the previous day on the layer this one is stepped into from. */
  arm(t, { m, d }) {
    const f = fromOf(t, m);
    return { label: f < 0 ? tr('这一层没有来处', 'nothing steps into this layer') : tr(`来处：「${layersOf(t)[f][1]}」那层`, `from the “${layersOf(t)[f][1]}” layer`), cells: [{ sensor: 'leftPrev', key: f < 0 ? null : `${f}:${d - 1}`, label: tr('前一天', 'day before') }] };
  },
  // Day 0: nothing bought, no money made; the other states can't have happened yet.
  base: t => layersOf(t).map((_, m) => [`${m}:0`, m === 0 ? 0 : null]),
  order(t) {
    const cells = [];
    for (let d = 1; d <= days(t); d++) layersOf(t).forEach((_, m) => cells.push({ d, m, id: `${m}:${d}` }));
    return cells;
  },
  keys: (t, x) => ({ cell: x.id }),
  where: x => tr(`第 ${x.d} 天`, `day ${x.d}`),
  // You end the last day holding no stock: the best of the layers other than "holding".
  answerKeys: t => layersOf(t).map((l, m) => (l[0] === 'hold' ? null : `${m}:${days(t)}`)).filter(Boolean),
  answer(t, table) { return Math.max(...this.answerKeys(t).map(k => table.get(k) ?? -Infinity)); },
  name: key => { const [m, d] = key.split(':'); return tr(`第 ${d} 天 · 第 ${+m + 1} 层`, `day ${d} · layer ${+m + 1}`); },
  label: t => tr(`${days(t)} 天 · 股价 ${t.p.join(' ')}`, `${days(t)} days · prices ${t.p.join(' ')}`),
  orderText: () => tr('一天一天往后，每天算遍每一层', 'day by day, every layer on each day'),
  sample: t => ({ d: Math.min(2, days(t)), m: 1, id: `1:${Math.min(2, days(t))}` }),
  scene(t, view, o = {}) {
    const L = layersOf(t), g = look(view, this.answerKeys(t), this.base(t), o.bench), sp = 58, sz = 50, y0 = 70, cells = [];
    const texts = [{ x: -sz / 2 - 10, y: 5, t: tr('股价', 'price'), anchor: 'end' }];
    t.p.forEach((p, k) => cells.push({ id: `p:${k + 1}`, x: (k + 1) * sp, y: 0, w: sz, h: 40, value: p, cls: 'house' }));
    L.forEach(([, name], m) => {
      texts.push({ x: -sz / 2 - 10, y: y0 + m * sp + 5, t: name, anchor: 'end', cls: 'hd' });
      for (let d = 0; d <= days(t); d++) {
        const id = `${m}:${d}`;
        cells.push({ id, x: d * sp, y: y0 + m * sp, w: sz, h: sz, value: g.val(id), corner: m === 0 ? d : '', cls: g.cls(id), tap: g.tap(id), aria: this.name(id) });
      }
    });
    return { cells, edges: g.arrows(undefined, r => (r.split(':')[0] !== g.act.at[0].split(':')[0] ? -14 : 0)), texts, robot: g.robot };
  },
});
