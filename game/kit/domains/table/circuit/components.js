// Circuit components and evaluation.
//
// Signals are numbers, null (「—」: no route), booleans (「是 / 否」) or whole segments: lists of numbers or booleans that
// a sweeping arm reads. A component declares what each input port takes and what its output carries:
//   port types   'num' | 'bool' | 'any' (a number or a yes/no) — a trailing '*' also takes a whole segment
//   signal types 'num' | 'bool' | 'nums' | 'bools' | 'any' (not known until something is wired in)
//   out          a signal type, { copy: k } (whatever reaches input k) or 'lift' (a segment if any input is one)
// Unconnected inputs read as null (number ports) or false (condition ports).

import { OPS } from '../util.js';
import { Halt, evaluate as kitEvaluate } from '../../../engine/circuit.js';
import { sink } from '../../../engine/boards.js';
import { T, tr } from '../i18n.js';

/** Floating-point noise off (0.9 × 8.1 = 7.29, not 7.290000000000001), so tables compare exactly. */
const tidy = v => Math.round(v * 1e9) / 1e9;
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

export const COMPONENTS = {
  msum: { name: MERGER, tag: T('加起来', 'sum'), icon: T('加', 'Σ'), ins: ['num*', 'num*', 'num*'], out: 'num', f: merge(OPS.sum), desc: T(`把接进来的数加起来。${SKIP[0]}`, `Adds up the numbers wired into it. ${SKIP[1]}`) },
  mmin: { name: MERGER, tag: T('取较小', 'min'), icon: T('小', 'min'), ins: ['num*', 'num*', 'num*'], out: 'num', f: merge(OPS.min), desc: T(`留下接进来的数里最小的那个。${SKIP[0]}`, `Keeps the smallest of the numbers wired into it. ${SKIP[1]}`) },
  mmax: { name: MERGER, tag: T('取较大', 'max'), icon: T('大', 'max'), ins: ['num*', 'num*', 'num*'], out: 'num', f: merge(OPS.max), desc: T(`留下接进来的数里最大的那个。${SKIP[0]}`, `Keeps the largest of the numbers wired into it. ${SKIP[1]}`) },
  many: { name: MERGER, tag: T('任一是', 'any yes'), icon: T('或', 'any'), ins: ['bool*', 'bool*', 'bool*'], out: 'bool', f: ins => ins.flat().some(v => v === true), desc: T('接进来的「是 / 否」里只要有一个「是」，就输出「是」；否则输出「否」。「—」不算「是」。', 'If any of the “yes / no” signals wired into it is “yes”, outputs “yes”; otherwise “no”. A “—” does not count as “yes”.') },
  not: { name: T('取反', 'Not'), tag: T('是 ↔ 否', 'yes ↔ no'), icon: T('反', 'not'), ins: ['bool'], out: 'bool', f: ([v]) => (v === null ? null : !v), desc: T('「是」变「否」，「否」变「是」。收到「—」时，输出「—」。', '“Yes” becomes “no” and “no” becomes “yes”. A “—” comes out as “—”.') },
  add: { name: T('加法器', 'Adder'), tag: 'a + b', icon: '+', ins: ['num*', 'num*'], labels: ['a', 'b'], out: 'lift', f: zip((a, b) => a + b), desc: T('输出 a + b。只要有一边是「—」，结果就是「—」。', 'Outputs a + b. If either side is “—”, so is the result.') },
  mul: { name: T('乘法器', 'Multiplier'), tag: 'a × b', icon: '×', ins: ['num*', 'num*'], labels: ['a', 'b'], out: 'lift', f: zip((a, b) => a * b), desc: T('输出 a × b。只要有一边是「—」，结果就是「—」。', 'Outputs a × b. If either side is “—”, so is the result.') },
  const: { name: T('常数', 'Constant'), icon: '1', ins: [], out: 'num', f: (_, n) => n.value, desc: T('一直输出同一个数。放上电路板后，点它可以改数值。', 'Always outputs the same number. Once it is on the board, click it to change the number.') },
  pass: { name: T('放行闸', 'Pass gate'), tag: T('是 → 放行', 'yes → pass'), icon: T('放', 'go'), ins: ['bool', 'any'], labels: [T('条件', 'if'), T('数', 'num')], out: { copy: 1 }, f: ([c, v]) => (c ? v : null), desc: T('条件是「是」时，把另一个口收到的信号放过去；否则输出「—」。', 'When the condition is “yes”, lets through whatever signal reaches the other input; otherwise outputs “—”.') },
  // The comparator: two numbers in, 是 / 否 out. Its models swap like a merger's (the wires stay).
  ceq: { name: T('比较器', 'Comparator'), tag: 'a = b', icon: '=', ins: ['num', 'num'], labels: ['a', 'b'], out: 'bool', f: ([a, b]) => (a === null || b === null ? null : a === b), desc: T('a 和 b 相等时输出「是」，否则输出「否」。有一边是「—」时，输出「—」。', 'Outputs “yes” when a equals b, “no” otherwise. If either side is “—”, the output is “—”.') },
  cgt: { name: T('比较器', 'Comparator'), tag: 'a > b', icon: '>', ins: ['num', 'num'], labels: ['a', 'b'], out: 'bool', f: ([a, b]) => (a === null || b === null ? null : a > b), desc: T('a 比 b 大时输出「是」，否则输出「否」。有一边是「—」时，输出「—」。', 'Outputs “yes” when a is greater than b, “no” otherwise. If either side is “—”, the output is “—”.') },
  clt: { name: T('比较器', 'Comparator'), tag: 'a < b', icon: '<', ins: ['num', 'num'], labels: ['a', 'b'], out: 'bool', f: ([a, b]) => (a === null || b === null ? null : a < b), desc: T('a 比 b 小时输出「是」，否则输出「否」。有一边是「—」时，输出「—」。', 'Outputs “yes” when a is less than b, “no” otherwise. If either side is “—”, the output is “—”.') },
  block: { name: T('拦截闸', 'Block gate'), tag: T('是 → 拦下', 'yes → block'), icon: T('拦', 'stop'), ins: ['bool', 'any'], labels: [T('条件', 'if'), T('数', 'num')], out: { copy: 1 }, f: ([c, v]) => (c ? null : v), desc: T('条件是「是」时，输出「—」；否则把另一个口收到的信号原样放过去。', 'When the condition is “yes”, outputs “—”; otherwise lets whatever signal reaches the other input through unchanged.') },
};

/**
 * Boards the player built, now components, keyed 'bp:<levelId>'. Solving the level unlocks one as a black box: `f`, a
 * built-in implementation (the validator runs it on that level's tests). Filled by the level registry:
 * { name, desc, ins: [port type], labels: [short], sensors: [id] (what each port stands for), out, outType, f(ins) }
 */
export const BLUEPRINTS = {};
/** A component's own function, for writing a black box out of the same parts the player had. */
export const partFn = kind => ins => COMPONENTS[kind].f(ins, {});

/** Models that swap for one another on the card, keeping their wires: the mergers, the comparators, the dividers. */
export const MODELS = [['msum', 'mmin', 'mmax'], ['ceq', 'cgt', 'clt'], ['idiv', 'imod']];
export const modelsOf = kind => MODELS.find(m => m.includes(kind)) || null;

/**
 * Readers: the parts that read the robot's sensors (world.js), placed like any part and set on the card. In the engine
 * they are one part, told apart only by the sensors they offer (`family`) and the layer they read on:
 *   视野读取器 ('see')         view sensors: cells in the robot's view
 *   多层视野读取器 ('seem')     view sensors on a table the player stacks, on this layer or a chosen one ('self|…', '2|…');
 *                              'seel' reads on the layer whose number is wired into its port
 *   本格信息读取器 ('fact')     'here' sensors: facts about the robot's own cell
 *   臂读取器 ('arm')            'arm' sensors: what the robot's arm brings in
 * A reader's value lists the sensors it reads, separated by ';' ('up;left', 'self|up;left', 'key_red;door_red'). Each
 * is an output of its own: a wire from one starts at '<node>#<sensor>' (one from the bare node id reads its first).
 * evaluate() reads a sensor through sense(id, layer), layer 'self' (the robot's own) or a layer number.
 */
export const READERS = { see: { family: 'view', families: ['view', 'arm'], card: 'view' }, seem: { family: 'view', layer: 'set' }, seel: { family: 'view', layer: 'port' }, fact: { family: 'here', families: ['here'], card: 'facts' }, arm: { family: 'arm' } };
/**
 * Every level has the same two fixed input cards: 视野 ('view', kind 'see': the cells the robot sees and what its arm
 * reaches) and 本格信息 ('facts', kind 'fact': facts about its own cell). They are never placed or removed; a port
 * appears for each sensor the player picks, on the card or in the inputs window. (The other reader kinds are only
 * read from older saves, which fold them into these cards.)
 */
export const CARDS = { view: 'see', facts: 'fact' };
/** Which card reads a sensor of this family. */
export const cardOf = family => (family === 'here' ? 'facts' : family === 'view' || family === 'arm' ? 'view' : null);
export const INPUT_KINDS = Object.keys(READERS);
export const isInput = kind => kind in READERS;
export const isViewReader = kind => READERS[kind]?.family === 'view';
/** Which sensors a reader offers: 'view', 'here' or 'arm'. */
export const familyOf = kind => READERS[kind]?.family ?? null;
/** The sensor families a reader offers (视野 offers the view and the arm). */
export const familiesOf = kind => READERS[kind]?.families ?? (READERS[kind] ? [READERS[kind].family] : []);
/** A wire's source as [node id, sensor]: 'n3#up' → ['n3', 'up']; a node's only output → ['n3', null]. */
export const splitSrc = src => { const k = src.indexOf('#'); return k < 0 ? [src, null] : [src.slice(0, k), src.slice(k + 1)]; };
/** The sensors a reader reads, in order. */
export function picksOf(n) {
  const v = String(n.value ?? ''), body = n.kind === 'seem' ? (v.includes('|') ? v.slice(v.indexOf('|') + 1) : '') : v;
  return body.split(';').filter(Boolean);
}
/** The same reader set to read `picks` (a layered one keeps its layer). */
export const withPicks = (n, picks) => ({ ...n, value: n.kind === 'seem' ? `${String(n.value || 'self|').split('|')[0] || 'self'}|${picks.join(';')}` : picks.join(';') });
/** The layer a reader reads on: 'self', a layer number, or 'port' (the number wired in). */
export function layerOf(n) {
  if (READERS[n.kind]?.layer === 'port') return 'port';
  if (READERS[n.kind]?.layer !== 'set') return 'self';
  const l = String(n.value || 'self|').split('|')[0];
  return l === 'self' || l === '' ? 'self' : Number(l);
}
/** Every reader reads the same way: each output its own sensor, on the reader's layer. */
const READ = ([port], n, ctx, pick) => {
  const id = pick ?? picksOf(n)[0], l = layerOf(n);
  return ctx && ctx.sense && id ? ctx.sense(id, l === 'port' ? port ?? null : l) : null;
};
const LAYERED = T('多层视野读取器', 'Layered view reader');
Object.assign(COMPONENTS, {
  see: { name: T('视野', 'View'), tag: T('视野', 'view'), ins: [], out: 'input', f: READ, desc: T('机器人看得见的格子。点一格，就多一个读那一格的输出口；再点一次，输出口就去掉。', 'The cells the robot sees. Click a cell to add an output that reads it; click it again to remove that output.') },
  seem: {
    name: LAYERED, tag: T('视野', 'view'), ins: [], out: 'input',
    f: READ,
    desc: T('读某一层上机器人身边的格子。元件上选读哪一层（本层、某一层，或接进来的层号），方框里就是那一层上机器人的视野：点哪几格（最多 3 格），就读哪几格，每一格有自己的输出口。没有那一层，或那一格在棋盘外，就是「—」。', 'Reads cells around the robot on some layer. On its part, choose the layer (this one, a numbered one, or the number wired in); the box shows the robot’s view on that layer: click up to three cells to read, and each gets an output of its own. If there is no such layer, or the cell is off the board, it is “—”.'),
  },
  seel: {
    name: LAYERED, tag: T('视野', 'view'), ins: ['num'], labels: [T('层', 'layer')], out: 'input',
    f: READ,
    desc: T('读某一层上机器人身边的格子，层号从左边的口接进来（从 0 数起）。点哪几格（最多 3 格），就读哪几格，每一格有自己的输出口。没有那一层，或那一格在棋盘外，就是「—」。', 'Reads cells around the robot on the layer whose number is wired into its port (counting from 0). Click up to three cells to read, and each gets an output of its own. If there is no such layer, or the cell is off the board, it is “—”.'),
  },
  fact: { name: T('本格信息', 'This cell'), tag: T('本格', 'this cell'), ins: [], out: 'input', f: READ, desc: T('机器人脚下这一格的信息。每选一条，就多一个读它的输出口。', 'Facts about the cell under the robot. Each one you pick adds an output that reads it.') },
  arm: { name: T('臂读取器', 'Arm reader'), tag: T('臂', 'arm'), ins: [], out: 'input', f: READ, desc: T('读机器人的手臂送来的数据。放上后在元件上选读哪一个。', 'Reads what the robot’s arm brings in. Once it is on the board, choose on the part which one it reads.') },
  // A kind check: is this reading (a key's colour, say) of the kind set on the card? 「—」 (no key at all) is not.
  is: { name: T('类别判断器', 'Kind check'), tag: T('是这一类吗', 'is it this kind'), icon: '∈', ins: ['cat'], out: 'bool', f: ([v], n) => !!v && v.cat === n.value, desc: T('收到的类别（比如钥匙的颜色）是元件上选的那一类，就输出「是」；不是，或收到「—」，输出「否」。', 'Outputs “yes” when the kind it receives (a key’s colour, say) is the one chosen on its part; otherwise, or for a “—”, “no”.') },
  // The divider: a ÷ b rounded down, or what is left over. Its models swap like a merger's (the wires stay).
  idiv: { name: T('除法器', 'Divider'), tag: T('a ÷ b 取整', 'a ÷ b, whole'), icon: '÷', ins: ['num', 'num'], labels: ['a', 'b'], out: 'num', f: ([a, b]) => (a === null || b === null || !b ? null : Math.floor(a / b)), desc: T('输出 a 除以 b 的整数部分（往下取整）。b 是 0 或有一边是「—」时，输出「—」。', 'Outputs a divided by b, rounded down to a whole number. If b is 0 or either side is “—”, the output is “—”.') },
  imod: { name: T('除法器', 'Divider'), tag: T('a ÷ b 的余数', 'a ÷ b, remainder'), icon: '%', ins: ['num', 'num'], labels: ['a', 'b'], out: 'num', f: ([a, b]) => (a === null || b === null || !b ? null : ((a % b) + b) % b), desc: T('输出 a 除以 b 的余数。b 是 0 或有一边是「—」时，输出「—」。', 'Outputs the remainder of a divided by b. If b is 0 or either side is “—”, the output is “—”.') },
});

export function def(kind) {
  if (COMPONENTS[kind]) return COMPONENTS[kind];
  const b = BLUEPRINTS[kind];
  return {
    name: b.name, tag: tr('零件', 'part'), ins: b.ins, labels: b.labels, desc: b.desc, bp: true, out: b.outType,
    // A part with a number of its own (b.value, its default) is set on its card, like a Constant.
    f: (ins, n) => b.f(ins, n?.value ?? b.value),
  };
}

/** Whether a part carries a number set on its card: a Constant, or a built part with a setting. */
export const hasValue = kind => kind === 'const' || BLUEPRINTS[kind]?.value !== undefined;
/** The number such a part starts with when it is placed. */
export const valueDefault = kind => (kind === 'const' ? 1 : BLUEPRINTS[kind]?.value);

/** What an unconnected input of this port type reads. */
const idle = type => (type.startsWith('bool') ? false : null);

// The circuit as the shared engine reads it (../../../engine/circuit.js). The engine keeps its own circuit (a
// component's inputs by number, sinks 'out:<id>', sensors wired straight in as 'tap:<id>'); this is that circuit in
// the engine's shape, built once per circuit: a component's ports are '0', '1', …, an unconnected one reads its idle
// signal, a reader's outputs are its picks, and each world output is a sink.
const asEngine = new WeakMap();
function engineCircuit(circ, outs) {
  const key = outs.join();
  const known = asEngine.get(circ);
  if (known && known.key === key) return known.graph;
  const taps = [...new Set(circ.wires.filter(w => w.from.startsWith('tap:')).map(w => w.from))];
  const graph = {
    nodes: [
      ...circ.nodes.map(n => ({ id: n.id, type: n.kind, src: n })),
      ...taps.map(id => ({ id, type: 'tap:' })),
      ...outs.map(o => ({ id: `out:${o}`, type: 'out:' })),
    ],
    wires: circ.wires.map(w => {
      if (w.to.startsWith('out:')) return { from: w.from, to: w.to, port: 'in' };
      const [to, port] = w.to.split(':');
      return { from: w.from, to, port };
    }),
  };
  asEngine.set(circ, { key, graph });
  return graph;
}
const enginePart = new Map();
const TAP = { inputs: [], eval: (_, node, ctx) => ctx.sense(node.id.slice(4), 'self') };
const OUT = sink();
function partOf(type) {
  if (type === 'tap:') return TAP;
  if (type === 'out:') return OUT;
  const d = def(type);
  if (!enginePart.has(type) || enginePart.get(type).d !== d) {
    enginePart.set(type, {
      d,
      inputs: d.ins.map((_, k) => String(k)),
      idle: port => idle(d.ins[+port]),
      eval: (ins, node, ctx, pick) => d.f(d.ins.map((_, k) => ins[k]), node.src, ctx, pick),
    });
  }
  return enginePart.get(type);
}

/** Evaluate every output once. `sense(id, layer)` reads a sensor (layer 'self' or a number); it is called lazily, only
 *  for what is wired. A wire straight from a sensor ('tap:<id>', saved before readers) reads it on the robot's layer.
 *  probe collects every signal computed, by source, and each output as 'out:<id>'. A Halt from a sensor (a robot
 *  reading a cell not computed yet) stops it; a part that cannot compute is an error. */
export function evaluate(circ, sense, outs, probe = {}) {
  const record = values => { for (const [src, v] of values) if (!src.startsWith('out:')) probe[src] = v; };
  let run;
  try {
    run = kitEvaluate(engineCircuit(circ, outs), { parts: partOf, ctx: { sense }, targets: outs.map(o => `out:${o}`) });
  } catch (e) {
    if (e instanceof Halt) record(e.values);
    throw e;
  }
  const { values, errors } = run;
  record(values);
  const out = {};
  for (const o of outs) { out[o] = values.get(`out:${o}`) ?? null; probe[`out:${o}`] = out[o]; }
  if (errors.size) throw new Error(`a part cannot compute: ${[...errors.keys()].join(', ')}`);
  return { out, probe };
}

/* ---------- signal types ---------- */

const ACCEPTS = { num: ['num'], bool: ['bool'], cat: ['cat'], any: ['num', 'bool', 'cat'], 'num*': ['num', 'nums'], 'bool*': ['bool', 'bools'] };

/** The signal a source carries. io = { sensors, outs } of the world the board runs in. */
export function srcType(circ, io, src, seen = new Set()) {
  if (src.startsWith('tap:')) return io.sensors[src.slice(4)].type;
  if (seen.has(src)) return 'any';
  seen.add(src);
  const [nid, pick] = splitSrc(src), n = circ.nodes.find(x => x.id === nid), d = def(n.kind), from = k => circ.wires.find(w => w.to === `${nid}:${k}`);
  // A reader's output carries whatever its sensor carries.
  if (d.out === 'input') { const id = pick ?? picksOf(n)[0]; return id && io.sensors[id] ? io.sensors[id].type : 'any'; }
  if (typeof d.out === 'string' && d.out !== 'lift') return d.out;
  if (d.out && d.out.copy !== undefined) { const w = from(d.out.copy); return w ? srcType(circ, io, w.from, seen) : 'any'; }
  return d.ins.some((_, k) => { const w = from(k); return w && srcType(circ, io, w.from, seen).endsWith('s'); }) ? 'nums' : 'num';
}

/** What a sink takes: a port type of a component input, or the world's type for an output. */
export function sinkType(circ, io, p) {
  if (p.startsWith('out:')) { const o = io.outs.find(x => x[0] === p.slice(4)); return (o && o[3]) || 'num'; }
  const [id, k] = p.split(':'), n = circ.nodes.find(x => x.id === id);
  return def(n.kind).ins[+k];
}

export const fits = (sink, src) => src === 'any' || ACCEPTS[sink].includes(src);

/** Why a wire from a source of type `src` cannot go into a sink of type `sink`. */
function misfit(sink, src) {
  if (src.endsWith('s')) return tr('一整段只能接进汇合器、加法器或乘法器。', 'A whole segment can only go into a Merger, an Adder or a Multiplier.');
  if (src === 'cat' || sink === 'cat') return tr('「颜色」这类信号只能接进「类别判断器」或闸门的数口。', 'A kind (a colour, say) can only go into a Kind check or a gate’s value input.');
  if (src === 'bool') return tr('「是 / 否」信号只能接到闸门的条件口、「任一是」或「取反」。', 'A “yes / no” signal can only go into a gate’s condition input, “any yes” or “Not”.');
  return sink.startsWith('bool') ? tr('这个口只接「是 / 否」信号，比如「是起点」。', 'This input only takes a “yes / no” signal, such as “is start”.') : tr('这两个口的信号对不上。', 'The signals at these two ends do not match.');
}

/** The first wire whose source does not fit its sink, as a message; null when every wire fits. */
export function typeError(circ, io) {
  for (const w of circ.wires) {
    const sink = sinkType(circ, io, w.to), src = srcType(circ, io, w.from);
    if (!fits(sink, src)) return misfit(sink, src);
  }
  return null;
}

/* ---------- notation and helpers ---------- */

/** Compact circuit notation for reference solutions: nodes [[id, kind, value?]], wires ['from>to']. */
export function circ(nodes, wires) {
  return {
    nodes: nodes.map(([id, kind, value]) => ({ id, kind, ...(value !== undefined ? { value } : {}) })),
    wires: wires.map(s => { const [from, to] = s.split('>'); return { from, to }; }),
  };
}

export const blank = () => ({ nodes: [], wires: [], lit: [], at: {} });
/** Whether the circuit reads sensor `id`: a wire straight from it, or a reader's output for it, wired on. */
export const usesSensor = (c, id) => c.wires.some(w => w.from === `tap:${id}`) || c.nodes.some(n => isInput(n.kind) && picksOf(n).includes(id) && c.wires.some(w => w.from === `${n.id}#${id}` || (w.from === n.id && picksOf(n)[0] === id)));
export const hasKind = (c, kind) => c.nodes.some(n => n.kind === kind);
export const clone = c => JSON.parse(JSON.stringify(c));
