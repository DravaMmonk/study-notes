// Circuit components and evaluation.
// Signals are numbers, null ("—": no route) or booleans (booleans only come from input taps).
// Unconnected inputs read as null (number ports) or false (condition ports).

import { OPS } from '../util.js';
import { T, tr } from '../i18n.js';

const merge = op => ins => { const v = ins.filter(x => x !== null); return v.length ? op(v) : null; };
const SKIP = ['「—」不参与；全是「—」时，输出「—」。', '“—” is left out; if every input is “—”, the output is “—”.'];
const MERGER = T('汇合器', 'Merger');

export const COMPONENTS = {
  msum: { name: MERGER, tag: T('加起来', 'sum'), icon: T('加', 'Σ'), ins: ['num', 'num', 'num'], f: merge(OPS.sum), desc: T(`把接进来的数加起来。${SKIP[0]}`, `Adds up the numbers wired into it. ${SKIP[1]}`) },
  mmin: { name: MERGER, tag: T('取较小', 'min'), icon: T('小', 'min'), ins: ['num', 'num', 'num'], f: merge(OPS.min), desc: T(`留下接进来的数里最小的那个。${SKIP[0]}`, `Keeps the smallest of the numbers wired into it. ${SKIP[1]}`) },
  mmax: { name: MERGER, tag: T('取较大', 'max'), icon: T('大', 'max'), ins: ['num', 'num', 'num'], f: merge(OPS.max), desc: T(`留下接进来的数里最大的那个。${SKIP[0]}`, `Keeps the largest of the numbers wired into it. ${SKIP[1]}`) },
  add: { name: T('加法器', 'Adder'), tag: 'a + b', icon: '+', ins: ['num', 'num'], labels: ['a', 'b'], f: ([a, b]) => (a === null || b === null ? null : a + b), desc: T('输出 a + b。只要有一边是「—」，结果就是「—」：走不通的路，加多少都走不通。', 'Outputs a + b. If either side is “—”, so is the result: a dead end stays a dead end, whatever you add to it.') },
  const: { name: T('常数', 'Constant'), icon: '1', ins: [], f: (_, n) => n.value, desc: T('一直输出同一个数。放上电路板后，点它可以改数值。', 'Always outputs the same number. Once it is on the board, click it to change the number.') },
  pass: { name: T('放行闸', 'Pass gate'), tag: T('是 → 放行', 'yes → pass'), icon: T('放', 'go'), ins: ['bool', 'num'], labels: [T('条件', 'if'), T('数', 'num')], f: ([c, v]) => (c ? v : null), desc: T('条件是「是」时，把数放过去；否则输出「—」。', 'When the condition is “yes”, lets the number through; otherwise outputs “—”.') },
  block: { name: T('拦截闸', 'Block gate'), tag: T('是 → 拦下', 'yes → block'), icon: T('拦', 'stop'), ins: ['bool', 'num'], labels: [T('条件', 'if'), T('数', 'num')], f: ([c, v]) => (c ? null : v), desc: T('条件是「是」时，输出「—」；否则把数原样放过去。', 'When the condition is “yes”, outputs “—”; otherwise lets the number through unchanged.') },
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
    name: b.name, tag: tr('零件', 'part'), ins: b.ins, labels: b.labels, desc: b.desc, bp: true,
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

export const blank = () => ({ nodes: [], wires: [], lit: [], at: {} });
export const usesTap = (c, id) => c.wires.some(w => w.from === `tap:${id}`);
export const hasKind = (c, kind) => c.nodes.some(n => n.kind === kind);
export const clone = c => JSON.parse(JSON.stringify(c));
