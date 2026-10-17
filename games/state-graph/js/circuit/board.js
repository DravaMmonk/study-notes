// 状态之图's circuit on the shared circuit editor (../../../kit/circuit), the one Vision Complete uses.
//
// The engine keeps its own circuit, { nodes: [{ id, kind, value? }], wires: [{ from, to }], lit, at }, where a
// source is 'tap:<id>' or a node id and a sink is '<node>:<k>' or 'out:<id>' (components.js). The editor works on
// the shared shape, { nodes: [{ id, type, x, y, slot }], wires: [{ from, to, port }] }: each lit input is a source
// card, each of the world's outputs a sink card, and the components are parts. toGraph and fromGraph translate;
// `xy` (desktop positions) and `at` (phone slots) are layout only and never reach the engine.

import { connect as linkPorts, litOf, placement as slotsOf } from './editor.js';
import { def, srcType } from './components.js';
import { lookIcon } from './looks.js';

const HUES = 6; // colours are theme tokens: --w0…--w5 for lit inputs, --n0…--n5 for components
const isTerm = (n) => n.type === 'tap' || n.type === 'out';
const sinkOf = (to, port) => (to.startsWith('out:') ? to : `${to}:${port}`);

/** Where a card sits on the desktop board when the player has not moved it: inputs left, outputs right. */
function home(kind, k, slot) {
  if (kind === 'tap') return [20, 30 + k * 120];
  if (kind === 'out') return [700, 60 + k * 140];
  return [250 + (slot % 2) * 200, 30 + Math.floor(slot / 2) * 170];
}

/** The engine's circuit as the editor's graph. `u` = { taps, avail, outs } of the world the board runs in. */
export function toGraph(circ, u) {
  const lit = litOf(circ), xy = circ.xy || {}, { cell } = slotsOf(circ);
  // A card with a saved place keeps it. A new one goes to its home spot, or, if a card already sits there (inputs
  // are listed in the view's order, so lighting an earlier cell shifts the homes of the later ones), on down that
  // column to the first free spot: cards never land on top of each other.
  const taken = Object.values(xy);
  const clash = ([x, y]) => taken.some(([a, b]) => Math.abs(a - x) < 170 && Math.abs(b - y) < 100);
  const at = (id, kind, k, slot) => {
    if (xy[id]) return xy[id];
    let [x, y] = home(kind, k, slot);
    for (let tries = 0; tries < 60 && clash([x, y]); tries++) y += kind === 'tap' ? 120 : kind === 'out' ? 140 : 170;
    taken.push([x, y]);
    return [x, y];
  };
  const taps = u.avail.filter((t) => lit.includes(t));
  return {
    nodes: [
      ...taps.map((t, k) => { const id = `tap:${t}`, [x, y] = at(id, 'tap', k); return { id, type: 'tap', tap: t, x, y }; }),
      ...circ.nodes.map((n) => { const [x, y] = at(n.id, 'part', 0, cell[n.id]); return { id: n.id, type: n.kind, value: n.value, x, y, slot: cell[n.id] }; }),
      ...u.outs.map(([o], k) => { const id = `out:${o}`, [x, y] = at(id, 'out', k); return { id, type: 'out', out: o, x, y }; }),
    ],
    wires: circ.wires.map((w) => (w.to.startsWith('out:') ? { from: w.from, to: w.to, port: 'in' } : { from: w.from, to: w.to.split(':')[0], port: w.to.split(':')[1] })),
  };
}

/** The editor's graph back as the engine's circuit; lit inputs stay as they were (they are lit in the robot's view). */
export function fromGraph(graph, circ) {
  const parts = graph.nodes.filter((n) => !isTerm(n));
  return {
    ...circ,
    nodes: parts.map((n) => ({ id: n.id, kind: n.type, ...(n.type === 'const' ? { value: n.value ?? 1 } : {}) })),
    wires: graph.wires.map((w) => ({ from: w.from, to: sinkOf(w.to, w.port) })),
    at: Object.fromEntries(parts.filter((n) => Number.isInteger(n.slot)).map((n) => [n.id, n.slot])),
    xy: Object.fromEntries(graph.nodes.map((n) => [n.id, [Math.round(n.x), Math.round(n.y)]])),
  };
}

/** A new component of `kind` in phone slot `at` (and the first free spot on the desktop board). */
export function create(graph, kind, at) {
  const used = graph.nodes.map((n) => /^n(\d+)$/.exec(n.id)).filter(Boolean).map((m) => +m[1]);
  const id = `n${Math.max(0, ...used) + 1}`;
  const taken = (x, y) => graph.nodes.some((n) => Math.abs(n.x - x) < 170 && Math.abs(n.y - y) < 140);
  let [x, y] = home('part', 0, at);
  for (let tries = 0; tries < 30 && taken(x, y); tries++) y += 150;
  return { graph: { ...graph, nodes: [...graph.nodes, { id, type: kind, x, y, slot: at, ...(kind === 'const' ? { value: 1 } : {}) }] }, id };
}

/**
 * The editor's description of this board's nodes (../../../kit/circuit/model.js). `circ()` is the engine's circuit
 * the graph came from and `u` the world's taps and outputs: a wire is refused when its signal does not fit (a
 * yes / no into a number port, a whole segment into a gate…), with the engine's own reason.
 */
export function partsFor(circ, u) {
  const io = { taps: u.taps, outs: u.outs };
  const lit = litOf(circ).filter((t) => u.avail.includes(t));
  const order = u.avail.filter((t) => lit.includes(t));
  const colour = (node) => {
    if (!node || node.type === 'out') return 'var(--ink)';
    if (node.type === 'tap') return `var(--w${Math.max(0, order.indexOf(node.tap)) % HUES})`;
    const k = circ.nodes.findIndex((n) => n.id === node.id);
    return `var(--n${Math.max(0, k) % HUES})`;
  };
  const look = (node, port) => {
    if (port === null) {
      if (node.type === 'out') return '';
      const t = srcType(circ, io, node.id);
      return t.endsWith('s') ? 'list' : t;
    }
    const t = node.type === 'out' ? (u.outs.find((o) => o[0] === node.out)?.[3] || 'num') : def(node.type).ins[+port];
    return t.startsWith('bool') ? 'bool' : t === 'any' ? 'any' : 'num';
  };
  const byId = (graph, id) => graph.nodes.find((n) => n.id === id);
  return {
    role: (node) => (node.type === 'tap' ? 'source' : node.type === 'out' ? 'sink' : 'part'),
    inputs: (node) => (!node.type || node.type === 'tap' ? [] : node.type === 'out' ? ['in'] : def(node.type).ins.map((_, k) => String(k))),
    label: (node) => (node.type === 'tap' ? u.taps[node.tap].label : node.type === 'out' ? u.outs.find((o) => o[0] === node.out)?.[1] : def(node.type).name),
    portLabel: (node, port) => (isTerm(node) ? '' : def(node.type).labels?.[+port] ?? ''),
    family: () => 'sg',
    // Inputs and outputs are named by a short mark; a part shows its look (circuit/looks.js).
    icon: (node) => (node.type === 'tap' ? String(u.taps[node.tap].short) : node.type === 'out' ? '→' : lookIcon(node.type)),
    cardStyle: (node) => ({ '--fam': colour(node) }),
    wireStyle: (wire, graph) => ({ '--fam': colour(byId(graph, wire.from)) }),
    portClass: (node, port) => `look-${look(node, port)}`,
    refuse: (graph, from, to, port) => {
      const r = linkPorts(fromGraph(graph, circ), io, from, sinkOf(to, port));
      return r.msg ? { zh: r.msg, en: r.msg } : null;
    },
  };
}
