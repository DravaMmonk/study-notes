// Circuit components and evaluation.
//
// Signals are numbers, null (「—」: no route), booleans (「是 / 否」) or whole segments: lists of numbers or booleans that
// a sweeping arm reads. A component declares what each input port takes and what its output carries:
//   port types   'num' | 'bool' | 'any' (a number or a yes/no) — a trailing '*' also takes a whole segment
//   signal types 'num' | 'bool' | 'nums' | 'bools' | 'any' (not known until something is wired in)
//   out          a signal type, { copy: k } (whatever reaches input k) or 'lift' (a segment if any input is one)
// Unconnected inputs read as null (number ports) or false (condition ports).

import { OPS } from '../util.js';

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
const SKIP = '「—」不参与；全是「—」时，输出「—」。';
const SEG = '也能接扫描臂送来的一整段，段里的每个数都参与。';

export const COMPONENTS = {
  msum: { name: '汇合器', tag: '加起来', icon: '加', ins: ['num*', 'num*', 'num*'], out: 'num', f: merge(OPS.sum), desc: `把接进来的数加起来。${SKIP}` },
  mmin: { name: '汇合器', tag: '取较小', icon: '小', ins: ['num*', 'num*', 'num*'], out: 'num', f: merge(OPS.min), desc: `留下接进来的数里最小的那个。${SKIP}` },
  mmax: { name: '汇合器', tag: '取较大', icon: '大', ins: ['num*', 'num*', 'num*'], out: 'num', f: merge(OPS.max), desc: `留下接进来的数里最大的那个。${SKIP}` },
  many: { name: '汇合器', tag: '任一是', icon: '或', ins: ['bool*', 'bool*', 'bool*'], out: 'bool', f: ins => ins.flat().some(v => v === true), desc: '接进来的「是 / 否」里只要有一个「是」，就输出「是」；否则输出「否」。「—」不算「是」。' },
  not: { name: '取反', tag: '是 ↔ 否', icon: '反', ins: ['bool'], out: 'bool', f: ([v]) => (v === null ? null : !v), desc: '「是」变「否」，「否」变「是」。收到「—」时，输出「—」。' },
  add: { name: '加法器', tag: 'a + b', icon: '+', ins: ['num*', 'num*'], labels: ['a', 'b'], out: 'lift', f: zip((a, b) => a + b), desc: '输出 a + b。只要有一边是「—」，结果就是「—」：走不通的路，加多少都走不通。' },
  mul: { name: '乘法器', tag: 'a × b', icon: '×', ins: ['num*', 'num*'], labels: ['a', 'b'], out: 'lift', f: zip((a, b) => a * b), desc: '输出 a × b。只要有一边是「—」，结果就是「—」。' },
  const: { name: '常数', icon: '1', ins: [], out: 'num', f: (_, n) => n.value, desc: '一直输出同一个数。放上电路板后，点它可以改数值。' },
  pass: { name: '放行闸', tag: '是 → 放行', icon: '放', ins: ['bool', 'any'], labels: ['条件', '数'], out: { copy: 1 }, f: ([c, v]) => (c ? v : null), desc: '条件是「是」时，把另一个口收到的信号放过去；否则输出「—」。' },
  block: { name: '拦截闸', tag: '是 → 拦下', icon: '拦', ins: ['bool', 'any'], labels: ['条件', '数'], out: { copy: 1 }, f: ([c, v]) => (c ? null : v), desc: '条件是「是」时，输出「—」；否则把另一个口收到的信号原样放过去。' },
};
['add', 'mul', 'msum', 'mmin', 'mmax'].forEach(k => { COMPONENTS[k].desc += SEG; });

/**
 * Circuits that work as components, keyed 'bp:<levelId>'. Filled by the level registry:
 * { name, desc, ins: [port type], labels: [short], tapIds: [id], out, outType, circuit }
 */
export const BLUEPRINTS = {};

export function def(kind) {
  if (COMPONENTS[kind]) return COMPONENTS[kind];
  const b = BLUEPRINTS[kind];
  return {
    name: b.name, tag: '零件', ins: b.ins, labels: b.labels, desc: b.desc, bp: true, out: b.outType,
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
  if (src.endsWith('s')) return '一整段只能接进汇合器、加法器或乘法器。';
  if (src === 'bool') return '「是 / 否」信号只能接到闸门的条件口、「任一是」或「取反」。';
  return sink.startsWith('bool') ? '这个口只接「是 / 否」信号，比如「是起点」。' : '这两个口的信号对不上。';
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
