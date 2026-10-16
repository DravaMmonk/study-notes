// Circuit components and evaluation.
//
// Signals are numbers, null (「—」: no route), booleans (「是 / 否」) or whole segments: lists of numbers or booleans that
// a sweeping arm reads. A component declares what each input port takes and what its output carries:
//   port types   'num' | 'bool' | 'any' (a number or a yes/no) — a trailing '*' also takes a whole segment
//   signal types 'num' | 'bool' | 'nums' | 'bools' | 'any' (not known until something is wired in)
//   out          a signal type, { copy: k } (whatever reaches input k) or 'lift' (a segment if any input is one)
// Unconnected inputs read as null (number ports) or false (condition ports).

import { OPS } from '../util.js';
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
const SEG = ['也能接扫描臂送来的一整段，段里的每个数都参与。', 'It also takes a whole segment from a sweep arm, and every number in the segment takes part.'];
const MERGER = T('汇合器', 'Merger');

export const COMPONENTS = {
  msum: { name: MERGER, tag: T('加起来', 'sum'), icon: T('加', 'Σ'), ins: ['num*', 'num*', 'num*'], out: 'num', f: merge(OPS.sum), desc: T(`把接进来的数加起来。${SKIP[0]}`, `Adds up the numbers wired into it. ${SKIP[1]}`) },
  mmin: { name: MERGER, tag: T('取较小', 'min'), icon: T('小', 'min'), ins: ['num*', 'num*', 'num*'], out: 'num', f: merge(OPS.min), desc: T(`留下接进来的数里最小的那个。${SKIP[0]}`, `Keeps the smallest of the numbers wired into it. ${SKIP[1]}`) },
  mmax: { name: MERGER, tag: T('取较大', 'max'), icon: T('大', 'max'), ins: ['num*', 'num*', 'num*'], out: 'num', f: merge(OPS.max), desc: T(`留下接进来的数里最大的那个。${SKIP[0]}`, `Keeps the largest of the numbers wired into it. ${SKIP[1]}`) },
  many: { name: MERGER, tag: T('任一是', 'any yes'), icon: T('或', 'any'), ins: ['bool*', 'bool*', 'bool*'], out: 'bool', f: ins => ins.flat().some(v => v === true), desc: T('接进来的「是 / 否」里只要有一个「是」，就输出「是」；否则输出「否」。「—」不算「是」。', 'If any of the “yes / no” signals wired into it is “yes”, outputs “yes”; otherwise “no”. A “—” does not count as “yes”.') },
  not: { name: T('取反', 'Not'), tag: T('是 ↔ 否', 'yes ↔ no'), icon: T('反', 'not'), ins: ['bool'], out: 'bool', f: ([v]) => (v === null ? null : !v), desc: T('「是」变「否」，「否」变「是」。收到「—」时，输出「—」。', '“Yes” becomes “no” and “no” becomes “yes”. A “—” comes out as “—”.') },
  add: { name: T('加法器', 'Adder'), tag: 'a + b', icon: '+', ins: ['num*', 'num*'], labels: ['a', 'b'], out: 'lift', f: zip((a, b) => a + b), desc: T('输出 a + b。只要有一边是「—」，结果就是「—」：走不通的路，加多少都走不通。', 'Outputs a + b. If either side is “—”, so is the result: a dead end stays a dead end, whatever you add to it.') },
  mul: { name: T('乘法器', 'Multiplier'), tag: 'a × b', icon: '×', ins: ['num*', 'num*'], labels: ['a', 'b'], out: 'lift', f: zip((a, b) => a * b), desc: T('输出 a × b。只要有一边是「—」，结果就是「—」。', 'Outputs a × b. If either side is “—”, so is the result.') },
  const: { name: T('常数', 'Constant'), icon: '1', ins: [], out: 'num', f: (_, n) => n.value, desc: T('一直输出同一个数。放上电路板后，点它可以改数值。', 'Always outputs the same number. Once it is on the board, click it to change the number.') },
  pass: { name: T('放行闸', 'Pass gate'), tag: T('是 → 放行', 'yes → pass'), icon: T('放', 'go'), ins: ['bool', 'any'], labels: [T('条件', 'if'), T('数', 'num')], out: { copy: 1 }, f: ([c, v]) => (c ? v : null), desc: T('条件是「是」时，把另一个口收到的信号放过去；否则输出「—」。', 'When the condition is “yes”, lets through whatever signal reaches the other input; otherwise outputs “—”.') },
  block: { name: T('拦截闸', 'Block gate'), tag: T('是 → 拦下', 'yes → block'), icon: T('拦', 'stop'), ins: ['bool', 'any'], labels: [T('条件', 'if'), T('数', 'num')], out: { copy: 1 }, f: ([c, v]) => (c ? null : v), desc: T('条件是「是」时，输出「—」；否则把另一个口收到的信号原样放过去。', 'When the condition is “yes”, outputs “—”; otherwise lets whatever signal reaches the other input through unchanged.') },
};
['add', 'mul', 'msum', 'mmin', 'mmax'].forEach(k => { const d = COMPONENTS[k].desc; COMPONENTS[k].desc = T(d.zh + SEG[0], `${d.en} ${SEG[1]}`); });

/**
 * Circuits that work as components, keyed 'bp:<levelId>'. Filled by the level registry:
 * { name, desc, ins: [port type], labels: [short], tapIds: [id], out, outType, circuit }
 */
export const BLUEPRINTS = {};

export function def(kind) {
  if (COMPONENTS[kind]) return COMPONENTS[kind];
  const b = BLUEPRINTS[kind];
  return {
    name: b.name, tag: tr('零件', 'part'), ins: b.ins, labels: b.labels, desc: b.desc, bp: true, out: b.outType,
    f: ins => evaluate(b.circuit, id => { const k = b.tapIds.indexOf(id); return k < 0 ? null : ins[k]; }, [b.out]).out[b.out],
  };
}

/** What an unconnected input of this port type reads. */
const idle = type => (type.startsWith('bool') ? false : null);

/** Evaluate every output once. `tap(id)` is called lazily, only for taps that are wired. */
export function evaluate(circ, tap, outs, probe = {}) {
  const by = new Map(circ.nodes.map(n => [n.id, n])), into = new Map(circ.wires.map(w => [w.to, w.from])), memo = new Map();
  const src = id => {
    if (memo.has(id)) return memo.get(id);
    let v;
    if (id.startsWith('tap:')) v = tap(id.slice(4));
    else {
      const n = by.get(id), d = def(n.kind);
      v = d.f(d.ins.map((type, k) => { const f = into.get(`${id}:${k}`); return f ? src(f) : idle(type); }), n);
    }
    memo.set(id, v);
    probe[id] = v;
    return v;
  };
  const out = {};
  for (const o of outs) { const f = into.get(`out:${o}`); out[o] = f ? src(f) : null; probe[`out:${o}`] = out[o]; }
  return { out, probe };
}

/* ---------- signal types ---------- */

const ACCEPTS = { num: ['num'], bool: ['bool'], any: ['num', 'bool'], 'num*': ['num', 'nums'], 'bool*': ['bool', 'bools'] };

/** The signal a source carries. io = { taps, outs } of the world the board runs in. */
export function srcType(circ, io, src, seen = new Set()) {
  if (src.startsWith('tap:')) return io.taps[src.slice(4)].type;
  if (seen.has(src)) return 'any';
  seen.add(src);
  const n = circ.nodes.find(x => x.id === src), d = def(n.kind), from = k => circ.wires.find(w => w.to === `${src}:${k}`);
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
export const usesTap = (c, id) => c.wires.some(w => w.from === `tap:${id}`);
export const hasKind = (c, kind) => c.nodes.some(n => n.kind === kind);
export const clone = c => JSON.parse(JSON.stringify(c));
