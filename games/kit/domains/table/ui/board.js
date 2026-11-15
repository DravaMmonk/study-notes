// A table board on the shared circuit editor (../../../circuit), the one Vision Complete uses. The board is already
// the editor's shape (../model/board.js). Its desktop anchors start the canvas layout, and the parts description
// adds names and colours to the shared wiring rules.

import { sourceOf, srcNode } from '../../../engine/wire-source.js';
import { CARDS, isCard, isGiven } from '../model/parts.js';
import { roleOf } from '../model/board.js';
import { placement } from '../../../circuit/model.js';
import { wiring } from '../model/wiring.js';
import { lookIcon } from './looks.js';
import { ICONS } from './glyphs.js';

const HUES = 6; // colours are theme tokens: --w0…--w5 for the cards and port inputs, --n0…--n5 for the parts

/** Where a node sits on the desktop board when the player has not moved it: the level's inputs left, its outputs
 *  right, the parts between them. */
function home(kind, k, slot) {
  if (kind === 'card') return [20, 30 + k * 300];
  if (kind === 'tap') return [20, 30 + k * 120];
  if (kind === 'out') return [740, 60 + k * 140];
  return [290 + (slot % 2) * 210, 30 + Math.floor(slot / 2) * 170];
}
const kindOf = n => (isCard(n.type) ? 'card' : n.type === 'port' || n.type === 'tap' ? 'tap' : n.type === 'out' ? 'out' : 'part');

/** Initial desktop anchors. The shared editor assigns and saves the phone slots. */
export function withDesktopAnchors(b) {
  const positioned = node => Number.isFinite(node.x) && Number.isFinite(node.y);
  if (b.nodes.every(positioned)) return b;
  const { cell } = placement(b, { role: roleOf });
  const taken = b.nodes.filter(positioned).map(n => [n.x, n.y]);
  const clash = ([x, y]) => taken.some(([a, c]) => Math.abs(a - x) < 170 && Math.abs(c - y) < 100);
  const count = { card: 0, tap: 0, out: 0 };
  return {
    ...b,
    nodes: b.nodes.map(n => {
      const kind = kindOf(n), k = kind === 'part' ? 0 : count[kind]++;
      if (positioned(n)) return n;
      const slot = cell.get(n.id);
      let [x, y] = home(kind, k, slot);
      for (let tries = 0; tries < 60 && clash([x, y]); tries++) y += kind === 'card' ? 300 : kind === 'out' ? 140 : kind === 'tap' ? 120 : 170;
      taken.push([x, y]);
      return { ...n, x, y };
    }),
  };
}

/** Draw the shared sensor ports by their short names or symbols. */
export function robotWiring(model, terms) {
  const rules = wiring(model, terms);
  const glyph = m => (m?.family === 'here' && ICONS[m.icon] ? `<svg class="glyph" viewBox="0 0 48 32" aria-hidden="true">${ICONS[m.icon]}</svg>` : undefined);
  return {
    ...rules,
    outputs: node => rules.outputs(node)?.map(port => {
      const sensor = terms.sensors[port.key];
      return { ...port, short: String(sensor?.short ?? port.key), glyph: glyph(sensor) };
    }) ?? null,
  };
}

/**
 * The editor's description of this board's nodes (../../../circuit/model.js). `model` is the course's board model,
 * `b` the board and `u` = { sensors, outs, ports? } of the world the board runs in (ports: the built part's port
 * inputs, by id: { label, short }).
 */
export function partsFor(model, b, u) {
  const { def } = model;
  const io = { sensors: u.sensors, outs: u.outs };
  const label = node => (isCard(node.type) ? CARDS[node.type].name : node.type === 'tap' ? u.sensors[node.params.sensor].label : node.type === 'port' ? u.ports?.[node.id]?.label ?? node.id : node.type === 'out' ? u.outs.find(o => o[0] === node.id)?.[1] : def(node.type).name);
  const colour = node => {
    if (!node || node.type === 'out') return 'var(--ink)';
    const given = b.nodes.filter(n => isGiven(n.type) && n.type !== 'out');
    if (isGiven(node.type)) return `var(--w${Math.max(0, given.findIndex(n => n.id === node.id)) % HUES})`;
    return `var(--n${Math.max(0, b.nodes.filter(n => !isGiven(n.type)).findIndex(n => n.id === node.id)) % HUES})`;
  };
  const look = (node, port, key = null) => {
    if (port === null) {
      if (node.type === 'out') return '';
      const t = model.srcType(b, io, sourceOf(node.id, key));
      return t.endsWith('s') ? 'list' : t;
    }
    const t = node.type === 'out' ? (u.outs.find(o => o[0] === node.id)?.[3] || 'num') : def(node.type).ins[+port];
    return t.startsWith('bool') ? 'bool' : t === 'any' ? 'any' : 'num';
  };
  const byId = (graph, id) => graph.nodes.find(n => n.id === id);
  return {
    ...robotWiring(model, u),
    label,
    portLabel: (node, port) => (isGiven(node.type) ? '' : def(node.type).labels?.[+port] ?? ''),
    family: () => 'sg',
    // A port input and a sensor go by their short name; an output by an arrow; a part shows its look (looks.js).
    icon: node => (node.type === 'tap' ? String(u.sensors[node.params.sensor].short) : node.type === 'port' ? String(u.ports?.[node.id]?.short ?? '') : node.type === 'out' ? '→' : lookIcon(node.type)),
    cardStyle: node => ({ '--fam': colour(node) }),
    valueView: node => (isCard(node.type) ? 'sensor' : 'value'),
    hasSettings: node => model.hasValue(node.type),
    wireStyle: (wire, graph) => ({ '--fam': colour(byId(graph, srcNode(wire.from))) }),
    portClass: (node, port, key) => `look-${look(node, port, key ?? null)}`,
    packed: node => Boolean(def(node.type)?.built),
  };
}
