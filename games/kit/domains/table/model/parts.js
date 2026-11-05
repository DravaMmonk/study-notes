// The parts of a table board (games/DESIGN.md 3): the primitives every course starts from, the input cards the level
// gives, and the parts the player builds (registered by course.js, each running the board it was built from).
//
// Signals are numbers, null (「—」: no route), booleans (「是 / 否」), kinds ({ cat, label }) or whole segments: lists of
// numbers or booleans that a sweeping arm reads. A part declares what each input port takes and what its output
// carries:
//   port types   'num' | 'bool' | 'cat' | 'any' (a number, a yes / no or a kind) — a trailing '*' also takes a segment
//   signal types 'num' | 'bool' | 'cat' | 'nums' | 'bools' | 'any' (not known until something is wired in)
//   out          a signal type, { copy: k } (whatever reaches input k), 'lift' (a segment if any input is one) or
//                'input' (a card's outputs carry what each of its sensors carries)
// Its ports are '0', '1', …; an unconnected one reads null (a number port) or false (a condition port).
// A part with `params` carries those settings on its node (node.params); a constant its number, `value`.

import { OPS, tidy } from './format.js';
import { T } from '../lang.js';

const merge = op => ins => { const v = ins.flat().filter(x => x !== null); return v.length ? op(v) : null; };
/** a ∘ b, element by element when either side is a segment (a single number then applies to every element). */
const zip = op => ([a, b]) => {
  const one = (x, y) => (x === null || y === null || x === undefined || y === undefined ? null : tidy(op(x, y)));
  if (!Array.isArray(a) && !Array.isArray(b)) return one(a, b);
  const n = Math.max(Array.isArray(a) ? a.length : 0, Array.isArray(b) ? b.length : 0);
  return Array.from({ length: n }, (_, k) => one(Array.isArray(a) ? a[k] : a, Array.isArray(b) ? b[k] : b));
};
const SKIP = ['「—」不参与；全是「—」时，输出「—」。', '“—” is left out; if every input is “—”, the output is “—”.'];
const MERGER = T('汇合器', 'Merger');

/** The primitives: what a course may start from (game.json primitives) and a level bring in (adds). */
export const PRIMITIVES = {
  msum: { name: MERGER, tag: T('加起来', 'sum'), ins: ['num*', 'num*', 'num*'], out: 'num', f: merge(OPS.sum), desc: T(`把接进来的数加起来。${SKIP[0]}`, `Adds up the numbers wired into it. ${SKIP[1]}`) },
  mmin: { name: MERGER, tag: T('取较小', 'min'), ins: ['num*', 'num*', 'num*'], out: 'num', f: merge(OPS.min), desc: T(`留下接进来的数里最小的那个。${SKIP[0]}`, `Keeps the smallest of the numbers wired into it. ${SKIP[1]}`) },
  mmax: { name: MERGER, tag: T('取较大', 'max'), ins: ['num*', 'num*', 'num*'], out: 'num', f: merge(OPS.max), desc: T(`留下接进来的数里最大的那个。${SKIP[0]}`, `Keeps the largest of the numbers wired into it. ${SKIP[1]}`) },
  many: { name: MERGER, tag: T('任一是', 'any yes'), ins: ['bool*', 'bool*', 'bool*'], out: 'bool', f: ins => ins.flat().some(v => v === true), desc: T('接进来的「是 / 否」里只要有一个「是」，就输出「是」；否则输出「否」。「—」不算「是」。', 'If any of the “yes / no” signals wired into it is “yes”, outputs “yes”; otherwise “no”. A “—” does not count as “yes”.') },
  not: { name: T('取反', 'Not'), tag: T('是 ↔ 否', 'yes ↔ no'), ins: ['bool'], out: 'bool', f: ([v]) => (v === null ? null : !v), desc: T('「是」变「否」，「否」变「是」。收到「—」时，输出「—」。', '“Yes” becomes “no” and “no” becomes “yes”. A “—” comes out as “—”.') },
  add: { name: T('加法器', 'Adder'), tag: 'a + b', ins: ['num*', 'num*'], labels: ['a', 'b'], out: 'lift', f: zip((a, b) => a + b), desc: T('输出 a + b。只要有一边是「—」，结果就是「—」。', 'Outputs a + b. If either side is “—”, so is the result.') },
  mul: { name: T('乘法器', 'Multiplier'), tag: 'a × b', ins: ['num*', 'num*'], labels: ['a', 'b'], out: 'lift', f: zip((a, b) => a * b), desc: T('输出 a × b。只要有一边是「—」，结果就是「—」。', 'Outputs a × b. If either side is “—”, so is the result.') },
  const: { name: T('常数', 'Constant'), ins: [], out: 'num', params: ['value'], f: (_, n) => n.params?.value ?? 1, desc: T('一直输出同一个数。放上电路板后，点它可以改数值。', 'Always outputs the same number. Once it is on the board, click it to change the number.') },
  pass: { name: T('放行闸', 'Pass gate'), tag: T('是 → 放行', 'yes → pass'), ins: ['bool', 'any'], labels: [T('条件', 'if'), T('数', 'num')], out: { copy: 1 }, f: ([c, v]) => (c ? v : null), desc: T('条件是「是」时，把另一个口收到的信号放过去；否则输出「—」。', 'When the condition is “yes”, lets through whatever signal reaches the other input; otherwise outputs “—”.') },
  block: { name: T('拦截闸', 'Block gate'), tag: T('是 → 拦下', 'yes → block'), ins: ['bool', 'any'], labels: [T('条件', 'if'), T('数', 'num')], out: { copy: 1 }, f: ([c, v]) => (c ? null : v), desc: T('条件是「是」时，输出「—」；否则把另一个口收到的信号原样放过去。', 'When the condition is “yes”, outputs “—”; otherwise lets whatever signal reaches the other input through unchanged.') },
};

/** Models that swap for one another on the card, keeping their wires: the mergers that merge numbers. */
export const MODELS = [['msum', 'mmin', 'mmax']];
export const modelsOf = type => MODELS.find(m => m.includes(type)) || null;

/**
 * The parts a level gives every board (never placed or removed), each a source of its own:
 *   视野 ('view')         the cells the robot sees and what its arm reaches: an output for each sensor it picks
 *   本格信息 ('facts')     facts about the robot's own cell: an output for each it picks
 *   a port input ('port')  on the board that builds a part, an input of that part with no sensor in the level's world
 *                          (the third way into the Cheapest Cell): 「—」 in the level, the part's port once packed
 *   a sensor ('tap')       one sensor wired straight in, on a part's bench in the components box
 * A card's picks are its node's params.picks, in the order the card offers them.
 */
export const CARDS = {
  view: { name: T('视野', 'View'), tag: T('视野', 'view'), desc: T('机器人看得见的格子。点一格，就多一个读那一格的输出口；再点一次，输出口就去掉。', 'The cells the robot sees. Click a cell to add an output that reads it; click it again to remove that output.') },
  facts: { name: T('本格信息', 'This cell'), tag: T('本格', 'this cell'), desc: T('机器人脚下这一格的信息。每选一条，就多一个读它的输出口。', 'Facts about the cell under the robot. Each one you pick adds an output that reads it.') },
};
export const isCard = type => type === 'view' || type === 'facts';
/** A source the level gives (a card, a port input, a sensor wired straight in): never placed by the player. */
export const isGiven = type => isCard(type) || type === 'port' || type === 'tap' || type === 'out';

/**
 * A course's parts: the primitives, and `built`, the parts its player builds, by part key ('counter'), registered by
 * course.js from the levels that build them: { name, desc, ins: [port type], labels: [short], sensors: [sensor | null],
 * inputs: [port input id | null], out, outType, setting?: default number, board(), part } — board() the board it runs
 * (the player's, or its level's reference board), `part` the engine part that runs it. Each course holds its own, so
 * two courses read in one process never see each other's boards.
 *   def(type)          what a part is (null: no such part)
 *   hasValue(type)     whether it carries a number set on its card: a constant, or a built part with a setting
 *   valueDefault(type) the number it starts with when it is placed
 */
export function partsOf(built) {
  const def = type => {
    if (PRIMITIVES[type]) return PRIMITIVES[type];
    const b = built[type];
    return b ? { name: b.name, tag: T('零件', 'part'), ins: b.ins, labels: b.labels, desc: b.desc, built: true, out: b.outType, params: b.setting !== undefined ? ['value'] : [] } : null;
  };
  const hasValue = type => type === 'const' || built[type]?.setting !== undefined;
  const valueDefault = type => (type === 'const' ? 1 : built[type]?.setting);
  return { built, def, hasValue, valueDefault };
}
