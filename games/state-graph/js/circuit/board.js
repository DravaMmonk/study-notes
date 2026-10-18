// 状态之图's circuit on the shared circuit editor (../../../kit/circuit), the one Vision Complete uses.
//
// The engine keeps its own circuit, { nodes: [{ id, kind, value? }], wires: [{ from, to }], lit, at }, where a
// source is a node id, a reader's output '<node>#<sensor>', or a sensor wired straight in ('tap:<id>', a bench's
// inputs), and a sink is '<node>:<k>' or 'out:<id>' (components.js). The editor works on the shared shape,
// { nodes: [{ id, type, x, y, slot }], wires: [{ from, to, port }] }: readers (and sensors wired straight in) are
// source cards, the world's outputs sink cards, the components parts. toGraph and fromGraph translate; `xy` (desktop
// positions) and `at` (phone slots) are layout only and never reach the engine.

import { connect as linkPorts, litOf, placement as slotsOf } from './editor.js';
import { def, isInput, srcType, picksOf, splitSrc } from './components.js';
import { lookIcon } from './looks.js';
import { ICONS } from './glyphs.js';

const HUES = 6; // colours are theme tokens: --w0…--w5 for readers and sensors, --n0…--n5 for components
const isTerm = (n) => n.type === 'tap' || n.type === 'out';
const sinkOf = (to, port) => (to.startsWith('out:') ? to : `${to}:${port}`);

/** Where a card sits on the desktop board when the player has not moved it: inputs left, outputs right. */
function home(kind, k, slot) {
  if (kind === 'tap') return [20, 30 + k * 120];
  // The input cards are tall (视野 holds the robot's view): one under the other, well apart.
  if (kind === 'card') return [20, 30 + k * 280];
  if (kind === 'out') return [700, 60 + k * 140];
  return [250 + (slot % 2) * 200, 30 + Math.floor(slot / 2) * 170];
}

/** The engine's circuit as the editor's graph. `u` = { sensors, avail, outs } of the world the board runs in. */
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
    for (let tries = 0; tries < 60 && clash([x, y]); tries++) y += kind === 'tap' ? 120 : kind === 'card' ? 280 : kind === 'out' ? 140 : 170;
    taken.push([x, y]);
    return [x, y];
  };
  const taps = u.avail.filter((t) => lit.includes(t));
  return {
    nodes: [
      ...taps.map((t, k) => { const id = `tap:${t}`, [x, y] = at(id, 'tap', k); return { id, type: 'tap', tap: t, x, y }; }),
      // The input cards stand in the inputs' column on the left; the parts in their slots.
      ...circ.nodes.map((n) => { const [x, y] = isInput(n.kind) ? at(n.id, 'card', circ.nodes.filter((m) => isInput(m.kind)).indexOf(n)) : at(n.id, 'part', 0, cell[n.id]); return { id: n.id, type: n.kind, value: n.value, x, y, slot: cell[n.id] }; }),
      ...u.outs.map(([o], k) => { const id = `out:${o}`, [x, y] = at(id, 'out', k); return { id, type: 'out', out: o, x, y }; }),
    ],
    wires: circ.wires.map((w) => ({ ...(w.to.startsWith('out:') ? { to: w.to, port: 'in' } : { to: w.to.split(':')[0], port: w.to.split(':')[1] }), from: pickedSrc(circ, w.from) })),
  };
}

/** A wire from a reader always names the pick it reads ('n3#up'): one saved from its bare id reads its first. */
function pickedSrc(circ, from) {
  const n = !from.includes('#') && circ.nodes.find((x) => x.id === from);
  return n && isInput(n.kind) && picksOf(n).length ? `${from}#${picksOf(n)[0]}` : from;
}

/** A reader's outputs, one per sensor it reads, by the sensor's name; a fact goes by its symbol (glyphs.js). */
export function outputsOf(node, sensors) {
  if (!isInput(node.type)) return null;
  const glyph = (m) => (m?.family === 'here' && ICONS[m.icon] ? `<svg class="glyph" viewBox="0 0 48 32" aria-hidden="true">${ICONS[m.icon]}</svg>` : undefined);
  return picksOf({ kind: node.type, value: node.value }).map((p) => ({ key: p, label: sensors[p]?.label ?? p, short: String(sensors[p]?.short ?? p), glyph: glyph(sensors[p]) }));
}

/** The editor's graph back as the engine's circuit; sensors wired straight in (a bench's) stay as they were. */
export function fromGraph(graph, circ) {
  const parts = graph.nodes.filter((n) => !isTerm(n));
  return {
    ...circ,
    nodes: parts.map((n) => ({ id: n.id, kind: n.type, ...(n.type === 'const' ? { value: n.value ?? 1 } : n.value !== undefined ? { value: n.value } : {}) })),
    wires: graph.wires.map((w) => ({ from: w.from, to: sinkOf(w.to, w.port) })),
    at: Object.fromEntries(parts.filter((n) => Number.isInteger(n.slot)).map((n) => [n.id, n.slot])),
    xy: Object.fromEntries(graph.nodes.map((n) => [n.id, [Math.round(n.x), Math.round(n.y)]])),
  };
}

/** A new component of `kind` in phone slot `at` (and the first free spot on the desktop board: an input part down the
 *  inputs' column on the left, any other part between them and the outputs). `value`: an input part's setting. */
export function create(graph, kind, at, value) {
  const used = graph.nodes.map((n) => /^n(\d+)$/.exec(n.id)).filter(Boolean).map((m) => +m[1]);
  const id = `n${Math.max(0, ...used) + 1}`;
  const taken = (x, y) => graph.nodes.some((n) => Math.abs(n.x - x) < 170 && Math.abs(n.y - y) < 140);
  const input = isInput(kind);
  let [x, y] = home(input ? 'tap' : 'part', 0, at);
  for (let tries = 0; tries < 30 && taken(x, y); tries++) y += input ? 120 : 150;
  return { graph: { ...graph, nodes: [...graph.nodes, { id, type: kind, x, y, slot: at, ...(kind === 'const' ? { value: 1 } : input ? { value } : {}) }] }, id };
}

/**
 * The editor's description of this board's nodes (../../../kit/circuit/model.js). `circ()` is the engine's circuit
 * the graph came from and `u` the world's sensors and outputs: a wire is refused when its signal does not fit (a
 * yes / no into a number port, a whole segment into a gate…), with the engine's own reason.
 */
export function partsFor(circ, u) {
  const io = { sensors: u.sensors, outs: u.outs };
  const lit = litOf(circ).filter((t) => u.avail.includes(t));
  const order = u.avail.filter((t) => lit.includes(t));
  const colour = (node) => {
    if (!node || node.type === 'out') return 'var(--ink)';
    if (node.type === 'tap') return `var(--w${Math.max(0, order.indexOf(node.tap)) % HUES})`;
    if (isInput(node.type)) return `var(--w${Math.max(0, circ.nodes.filter((n) => isInput(n.kind)).findIndex((n) => n.id === node.id)) % HUES})`;
    const k = circ.nodes.findIndex((n) => n.id === node.id);
    return `var(--n${Math.max(0, k) % HUES})`;
  };
  const look = (node, port, key = null) => {
    if (port === null) {
      if (node.type === 'out') return '';
      const t = srcType(circ, io, key === null ? node.id : `${node.id}#${key}`);
      return t.endsWith('s') ? 'list' : t;
    }
    const t = node.type === 'out' ? (u.outs.find((o) => o[0] === node.out)?.[3] || 'num') : def(node.type).ins[+port];
    return t.startsWith('bool') ? 'bool' : t === 'any' ? 'any' : 'num';
  };
  const byId = (graph, id) => graph.nodes.find((n) => n.id === id);
  return {
    // An input card is a source (on top on a phone).
    role: (node) => (node.type === 'tap' || isInput(node.type) ? 'source' : node.type === 'out' ? 'sink' : 'part'),
    // The input cards are fixed: every level has them, and only their outputs change.
    removable: (node) => node.type !== 'tap' && node.type !== 'out' && !isInput(node.type),
    inputs: (node) => (!node.type || node.type === 'tap' ? [] : node.type === 'out' ? ['in'] : def(node.type).ins.map((_, k) => String(k))),
    label: (node) => (node.type === 'tap' ? u.sensors[node.tap].label : node.type === 'out' ? u.outs.find((o) => o[0] === node.out)?.[1] : def(node.type).name),
    portLabel: (node, port) => (isTerm(node) ? '' : def(node.type).labels?.[+port] ?? ''),
    family: () => 'sg',
    // Inputs and outputs are named by a short mark; a part shows its look (circuit/looks.js).
    // Each thing a reader reads is an output of its own.
    outputs: (node) => outputsOf(node, u.sensors),
    // On the desktop a cell reader's outputs are rows of their own, each with the fact it reads to choose.
    outputLayout: (node) => (node.type === 'fact' ? { row: 28, wide: true } : null),
    icon: (node) => (node.type === 'tap' ? String(u.sensors[node.tap].short) : node.type === 'out' ? '→' : lookIcon(node.type)),
    cardStyle: (node) => ({ '--fam': colour(node) }),
    wireStyle: (wire, graph) => ({ '--fam': colour(byId(graph, splitSrc(wire.from)[0])) }),
    portClass: (node, port, key) => `look-${look(node, port, key ?? null)}`,
    refuse: (graph, from, to, port) => {
      const r = linkPorts(fromGraph(graph, circ), io, from, sinkOf(to, port));
      return r.msg ? { zh: r.msg, en: r.msg } : null;
    },
  };
}
