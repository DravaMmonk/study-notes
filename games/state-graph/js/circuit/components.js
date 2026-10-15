// Circuit components and evaluation.
// Signals are numbers, null ("—": no route) or booleans (booleans only come from input taps).
// Unconnected inputs read as null (number ports) or false (condition ports).

import { OPS } from '../util.js';

const merge = op => ins => { const v = ins.filter(x => x !== null); return v.length ? op(v) : null; };
const SKIP = '「—」不参与；全是「—」时，输出「—」。';

export const COMPONENTS = {
  msum: { name: '汇合器', tag: '加起来', icon: '加', ins: ['num', 'num', 'num'], f: merge(OPS.sum), desc: `把接进来的数加起来。${SKIP}` },
  mmin: { name: '汇合器', tag: '取较小', icon: '小', ins: ['num', 'num', 'num'], f: merge(OPS.min), desc: `留下接进来的数里最小的那个。${SKIP}` },
  mmax: { name: '汇合器', tag: '取较大', icon: '大', ins: ['num', 'num', 'num'], f: merge(OPS.max), desc: `留下接进来的数里最大的那个。${SKIP}` },
  add: { name: '加法器', tag: 'a + b', icon: '+', ins: ['num', 'num'], labels: ['a', 'b'], f: ([a, b]) => (a === null || b === null ? null : a + b), desc: '输出 a + b。只要有一边是「—」，结果就是「—」：走不通的路，加多少都走不通。' },
  const: { name: '常数', icon: '1', ins: [], f: (_, n) => n.value, desc: '一直输出同一个数。放上电路板后，点它可以改数值。' },
  pass: { name: '放行闸', tag: '是 → 放行', icon: '放', ins: ['bool', 'num'], labels: ['条件', '数'], f: ([c, v]) => (c ? v : null), desc: '条件是「是」时，把数放过去；否则输出「—」。' },
  block: { name: '拦截闸', tag: '是 → 拦下', icon: '拦', ins: ['bool', 'num'], labels: ['条件', '数'], f: ([c, v]) => (c ? null : v), desc: '条件是「是」时，输出「—」；否则把数原样放过去。' },
};

/**
 * Circuits that work as components, keyed 'bp:<levelId>'. Filled by the level registry:
 * { name, desc, ins: [type], labels: [short], tapIds: [id], out, circuit }
 */
export const BLUEPRINTS = {};

export function def(kind) {
  if (COMPONENTS[kind]) return COMPONENTS[kind];
  const b = BLUEPRINTS[kind];
  return {
    name: b.name, tag: '零件', ins: b.ins, labels: b.labels, desc: b.desc, bp: true,
    f: ins => evaluate(b.circuit, id => { const k = b.tapIds.indexOf(id); return k < 0 ? null : ins[k]; }, [b.out]).out[b.out],
  };
}

/** Evaluate every output once. `tap(id)` is called lazily, only for taps that are wired. */
export function evaluate(circ, tap, outs, probe = {}) {
  const by = new Map(circ.nodes.map(n => [n.id, n])), into = new Map(circ.wires.map(w => [w.to, w.from])), memo = new Map();
  const src = id => {
    if (memo.has(id)) return memo.get(id);
    let v;
    if (id.startsWith('tap:')) v = tap(id.slice(4));
    else {
      const n = by.get(id), d = def(n.kind);
      v = d.f(d.ins.map((type, k) => { const f = into.get(`${id}:${k}`); return f ? src(f) : type === 'bool' ? false : null; }), n);
    }
    memo.set(id, v);
    probe[id] = v;
    return v;
  };
  const out = {};
  for (const o of outs) { const f = into.get(`out:${o}`); out[o] = f ? src(f) : null; probe[`out:${o}`] = out[o]; }
  return { out, probe };
}

/** Compact circuit notation for reference solutions: nodes [[id, kind, value?]], wires ['from>to']. */
export function circ(nodes, wires) {
  return {
    nodes: nodes.map(([id, kind, value]) => ({ id, kind, ...(value !== undefined ? { value } : {}) })),
    wires: wires.map(s => { const [from, to] = s.split('>'); return { from, to }; }),
  };
}

export const blank = () => ({ nodes: [], wires: [], lit: [], pos: {} });
export const usesTap = (c, id) => c.wires.some(w => w.from === `tap:${id}`);
export const hasKind = (c, kind) => c.nodes.some(n => n.kind === kind);
export const clone = c => JSON.parse(JSON.stringify(c));
