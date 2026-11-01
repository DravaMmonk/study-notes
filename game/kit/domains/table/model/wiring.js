// How the editor wires a table board (../../../circuit/model.js parts, without the drawing: ui/board.js adds names,
// colours and icons): which nodes the level gives, the ports of each part, a card's outputs (one a sensor it reads),
// what a card is written out with as text, and the wires the engine would refuse, with the engine's own reason.
// u = { sensors, outs } of the world the board runs in.

import { def, isCard, isGiven } from './parts.js';
import { picksOf } from './board.js';
import { refusal } from './run.js';

/** The board a graph of the editor stands for: what a board keeps of each node. */
export const fromGraph = graph => ({
  nodes: graph.nodes.map(n => ({ id: n.id, type: n.type, ...(n.params ? { params: n.params } : {}), ...(n.x !== undefined ? { x: Math.round(n.x), y: Math.round(n.y) } : {}), ...(Number.isInteger(n.slot) && !isGiven(n.type) ? { slot: n.slot } : {}) })),
  wires: graph.wires.map(w => ({ from: w.from, to: w.to, port: w.port })),
});

export function wiring(u) {
  const io = { sensors: u.sensors, outs: u.outs };
  return {
    // What the level gives is a source (on top on a phone) or a sink; the rest are parts.
    role: node => (node.type === 'out' ? 'sink' : isGiven(node.type) ? 'source' : 'part'),
    // What the level gives stays on the board: only a card's outputs change.
    removable: node => !isGiven(node.type),
    inputs: node => (node.type === 'out' ? ['in'] : !node.type || isGiven(node.type) ? [] : def(node.type).ins.map((_, k) => String(k))),
    // Each sensor a card reads is an output of its own.
    outputs: node => (isCard(node.type) ? picksOf(node).map(p => ({ key: p, label: u.sensors[p]?.label ?? p })) : null),
    // As text (../../../circuit/text.js): a card is written out with what it reads.
    text: { sets: node => (isCard(node.type) ? ['picks'] : []) },
    refuse: (graph, from, to, port) => {
      const why = refusal(fromGraph(graph), io, from, to, port);
      return why ? { zh: why, en: why } : null;
    },
  };
}
