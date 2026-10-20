// A ring of houses on 千层: the first and the last house are neighbours. Two layers, 甲 and 乙, each the robber's
// street (a row for "this house skipped" and one for "robbed"); what tells the layers apart is up to the player, with
// the facts "is the first house", "is the last house" and "is layer 甲". The answer is the best of both layers' last
// column. t = { a: [money in house 1 …] }.

import { T, tr } from '../../i18n.js';
import { world, look, cell, num, yes } from '../world.js';

const SIDES = [T('甲', 'A'), T('乙', 'B')];
const ROWS = [T('没偷', 'skipped'), T('偷了', 'robbed')];
const n = t => t.a.length;

export const ring = world({
  sensors: {
    pn: cell(T('上一家·没偷', 'previous · skipped'), T('没偷', 'skip'), [0, 0, -1]), pr: cell(T('上一家·偷了', 'previous · robbed'), T('偷了', 'rob'), [0, 1, -1]),
    money: num(T('这家的钱', "this house's money"), T('钱', '$'), 'house'),
    first: yes(T('是第一家', 'is the first house'), T('首', 'first'), 'firsthouse'), last: yes(T('是最后一家', 'is the last house'), T('尾', 'last'), 'lasthouse'),
    sideA: yes(T('是甲层', 'is layer A'), T('甲', 'A'), 'layers'),
  },
  facts: ['money', 'first', 'last', 'sideA'],
  // The robot stands on its layer's "skipped" row and writes both rows of its column.
  outs: [['no', ROWS[0], [0, 0, 0]], ['yes', ROWS[1], [0, 1, 0]]],
  here: (t, { i }) => [0, i],
  keyAt: (t, r, c, x) => (r >= 0 && r <= 1 && c >= 0 && c <= n(t) ? `${x ? x.m : 0}|${r}:${c}` : null),
  winLabel: (t, x) => tr(`${SIDES[x.m]}层`, `layer ${SIDES[x.m]}`),
  mark: (t, key) => ({ corner: key.split(':')[1] }),
  sense(t, { i, m }, id) {
    switch (id) {
      case 'money': return t.a[i - 1];
      case 'first': return i === 1;
      case 'last': return i === n(t);
      case 'sideA': return m === 0;
    }
    return null;
  },
  base: () => [0, 1].flatMap(m => [[`${m}|0:0`, 0], [`${m}|1:0`, null]]),
  order(t) {
    const cells = [];
    for (let i = 1; i <= n(t); i++) [0, 1].forEach(m => cells.push({ i, m, id: `${m}|${i}` }));
    return cells;
  },
  keys: (t, x) => ({ no: `${x.m}|0:${x.i}`, yes: `${x.m}|1:${x.i}` }),
  where: x => tr(`${SIDES[x.m]}层 · ${x.i}号`, `layer ${SIDES[x.m]} · house ${x.i}`),
  answerKeys: t => [0, 1].flatMap(m => [`${m}|0:${n(t)}`, `${m}|1:${n(t)}`]),
  answer(t, table) { return Math.max(...this.answerKeys(t).map(k => table.get(k) ?? -Infinity)); },
  name: key => { const [m, rc] = key.split('|'), [r, c] = rc.split(':'); return tr(`${SIDES[m]}层 ${c}号「${ROWS[r]}」`, `layer ${SIDES[m]}, house ${c}, “${ROWS[r]}”`); },
  label: t => tr(`${n(t)} 户人家围成一圈`, `${n(t)} houses in a ring`),
  orderText: () => tr('一家一家往后，每家算遍两层', 'house by house, both layers on each'),
  sample: t => ({ i: Math.min(2, n(t)), m: 0, id: `0|${Math.min(2, n(t))}` }),
  scene(t, view, o = {}) {
    const g = look(view, this.answerKeys(t), this.base(t), o.bench), sp = 58, sz = 50, y0 = 70, cells = [];
    const texts = [{ x: -sz / 2 - 10, y: 5, t: tr('每家的钱', 'money'), anchor: 'end' }];
    t.a.forEach((x, k) => cells.push({ id: `h:${k + 1}`, x: (k + 1) * sp, y: 0, w: sz, h: 40, value: x, cls: 'house' }));
    [0, 1].forEach(m => ROWS.forEach((row, r) => {
      const y = y0 + (m * 2 + r) * sp + (m ? 16 : 0);
      texts.push({ x: -sz / 2 - 10, y: y + 5, t: tr(`${SIDES[m]}·${row}`, `${SIDES[m]}·${row}`), anchor: 'end', cls: 'hd' });
      for (let c = 0; c <= n(t); c++) {
        const id = `${m}|${r}:${c}`;
        cells.push({ id, x: c * sp, y, w: sz, h: sz, value: g.val(id), corner: m === 0 && r === 0 ? c : '', cls: g.cls(id), tap: g.tap(id), aria: this.name(id) });
      }
    }));
    return { cells, edges: g.arrows(), texts, robot: g.robot };
  },
});
