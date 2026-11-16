// A table board, the same object everywhere: saved in progress, drawn by the shared circuit editor
// (../../../circuit), run by the shared engine (../../../engine/circuit.js), written as blueprint text in content.
//
//   { nodes: [{ id, type, params?, x?, y?, slot? }], wires: [{ from, to, port }] }
//
// The level gives every board its sources and sinks (parts.js CARDS): 视野 ('view') and 本格信息 ('facts') with the
// sensors they read in params.picks, a port input for each port of a part the level builds that reads no sensor, and
// an output node for each cell the robot writes (type 'out', its id the output's: 'cell'). Every other node is a part
// the player placed: a primitive or a built part (parts.js), its settings in params ({ value } for a constant). A
// wire runs from a source ('view#up', 'facts#start', a part's id) into a port: '0', '1', … of a part, 'in' of an output.
// x, y (the desktop board) and slot (the phone's grid) are layout only and never reach the engine.

import { sourceOf, splitSource } from '../../../engine/wire-source.js';
import { isCard, isGiven } from './parts.js';
import { tr } from '../lang.js';

export const blank = () => ({ nodes: [], wires: [] });

/** The sensors a card reads. */
export const picksOf = n => Array.isArray(n?.params?.picks) ? n.params.picks : [];
export const withPicks = (n, picks) => ({ ...n, params: { ...n.params, picks } });

/** The sensors the board's cards read. */
export const readsOf = b => b.nodes.filter(n => isCard(n.type)).flatMap(picksOf);
/** Whether the board reads sensor `id` and wires it on. */
export const usesSensor = (b, id) => b.wires.some(w => {
  const [from, pick] = splitSource(w.from);
  return pick === id && isCard(b.nodes.find(n => n.id === from)?.type);
});
/** The parts of a type on the board (with this value, when one is given). */
export const partsOfType = (b, type, value) => b.nodes.filter(n => n.type === type && (value === undefined || n.params?.value === value));
export const roleOf = node => node.type === 'out' ? 'sink' : isGiven(node.type) ? 'source' : 'part';

/** The parts the player placed. */
export const placed = b => b.nodes.filter(n => !isGiven(n.type));

/**
 * What a task's board is given (course.js played): the cards with what they may read ({ view: [sensor], facts:
 * [sensor] }; a card with nothing to offer is left off), the port inputs of the part it builds ([id]) and the world's
 * outputs ([id]).
 */
export const givenOf = ({ offers, inputs = [], outs }) => [
  ...['view', 'facts'].filter(card => offers[card].length).map(card => ({ id: card, type: card })),
  ...inputs.map(id => ({ id, type: 'port' })),
  ...outs.map(id => ({ id, type: 'out' })),
];

/**
 * The board fitted to what its task gives: each given node there once (keeping where it sat), no given node the task
 * lacks, each sensor read on the card that offers it (in the order the card offers them, its wires moving with it),
 * none the task does not offer, and no wire to or from something gone.
 */
export function fitted(b, given) {
  const want = givenOf(given);
  const old = new Map(b.nodes.map(n => [n.id, n]));
  const offers = given.offers;
  const read = new Set(b.nodes.filter(n => isCard(n.type)).flatMap(picksOf));
  const cardFor = pick => ['view', 'facts'].find(card => offers[card].includes(pick));
  const nodes = [
    ...want.map(g => {
      const had = old.get(g.id);
      const keep = had && had.type === g.type ? { ...had } : { ...g };
      return isCard(g.type) ? withPicks(keep, offers[g.type].filter(p => read.has(p))) : keep;
    }),
    ...b.nodes.filter(n => !isGiven(n.type)),
  ];
  const byId = new Map(nodes.map(n => [n.id, n]));
  const wires = b.wires.map(w => {
    const [from, pick] = splitSource(w.from);
    return isCard(old.get(from)?.type) && cardFor(pick) ? { ...w, from: sourceOf(cardFor(pick), pick) } : w;
  }).filter(w => {
    const [from, pick] = splitSource(w.from), src = byId.get(from);
    return src && byId.has(w.to) && (!isCard(src.type) || picksOf(src).includes(pick));
  });
  return { ...b, nodes, wires };
}

/**
 * Why a board cannot become the part its level builds: it must read exactly the part's ports, each sensor and port
 * input once, so the part does what the board did. `ports` as a task has them (course.js). null when it can.
 */
export function portsProblem(board, ports) {
  const want = new Set(ports.map(p => p.sensor ?? p.input));
  const read = new Set(board.wires.map(w => splitSource(w.from)).filter(([id]) => isCard(board.nodes.find(n => n.id === id)?.type)).map(([, pick]) => pick));
  for (const w of board.wires) if (board.nodes.find(n => n.id === w.from)?.type === 'port') read.add(w.from);
  const extra = [...read].filter(x => !want.has(x)), missing = [...want].filter(x => !read.has(x));
  const name = id => String(ports.find(p => (p.sensor ?? p.input) === id)?.label ?? id);
  if (extra.length) return tr(`这块电路板要做成元件，它的输入只能是元件的口；它还读了：${extra.join('、')}。`, `This board becomes a part, so it may read only the part’s ports; it also reads: ${extra.join(', ')}.`);
  if (missing.length) return tr(`这块电路板要做成元件，元件的每个口都要接进电路；还没接的：${missing.map(name).join('、')}。`, `This board becomes a part, so every port of the part must be wired in; not yet: ${missing.map(name).join(', ')}.`);
  return null;
}
