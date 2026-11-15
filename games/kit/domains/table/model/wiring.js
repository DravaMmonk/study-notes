// How the editor wires a table board (../../../circuit/model.js parts, without the drawing: ui/board.js adds names,
// colours and icons): which nodes the level gives, the ports of each part, a card's outputs (one a sensor it reads),
// what a card is written out with as text (and what it is switched on to read when a text's wire reads it), and the
// wires the engine would refuse, with the engine's own reason.
// model: the course's board model (run.js modelOf); u = { sensors, outs, offers? } of the world the board runs in
// (offers: what each card may read on this task, { view: [sensor], facts: [sensor] }).

import { printLines, readLines } from '../../../circuit/text.js';
import { isCard, isGiven, PRIMITIVES } from './parts.js';
import { blank, fitted, picksOf } from './board.js';

/** The board a graph of the editor stands for: what a board keeps of each node. */
export const fromGraph = graph => ({
  nodes: graph.nodes.map(n => ({ id: n.id, type: n.type, ...(n.params ? { params: n.params } : {}), ...(n.x !== undefined ? { x: Math.round(n.x), y: Math.round(n.y) } : {}), ...(Number.isInteger(n.slot) && !isGiven(n.type) ? { slot: n.slot } : {}) })),
  wires: graph.wires.map(w => ({ from: w.from, to: w.to, port: w.port })),
});

export function wiring(model, u) {
  const io = { sensors: u.sensors, outs: u.outs };
  return {
    // What the level gives is a source (on top on a phone) or a sink; the rest are parts.
    role: node => (node.type === 'out' ? 'sink' : isGiven(node.type) ? 'source' : 'part'),
    // What the level gives stays on the board: only a card's outputs change.
    inputs: node => (node.type === 'out' ? ['in'] : !node.type || isGiven(node.type) ? [] : model.def(node.type).ins.map((_, k) => String(k))),
    // Each sensor a card reads is an output of its own.
    outputs: node => (isCard(node.type) ? picksOf(node).map(p => ({ key: p, label: u.sensors[p]?.label ?? p })) : null),
    // As text (../../../circuit/text.js): a card is written out with what it reads.
    // A card a wire reads a sensor of is switched on for it, if the task offers that sensor (in the card's order).
    text: {
      settings: node => model.def(node.type).params ?? [],
      sets: node => (isCard(node.type) ? ['picks'] : []),
      check: (node, key, value) => {
        if (key !== 'picks') return null;
        if (!Array.isArray(value)) return { zh: '传感器设置须写成列表。', en: 'Sensor picks must be a list.' };
        const unknown = value.findIndex(pick => !u.offers?.[node.type]?.includes(pick));
        if (unknown < 0) return null;
        return { zh: `「${node.id}」读不到「${value[unknown]}」。`, en: `“${node.id}” cannot read “${value[unknown]}”.` };
      },
      read: (node, key, value) => key === 'picks' ? u.offers[node.type].filter(pick => value.includes(pick)) : value,
      opens: (node, key) => (isCard(node.type) && u.offers?.[node.type]?.includes(key) ? { ...node.params, picks: u.offers[node.type].filter(p => p === key || picksOf(node).includes(p)) } : null),
    },
    refuse: (graph, from, to, port) => {
      const why = model.wireTypeError(graph, io, from, to, port);
      return why ? { zh: why, en: why } : null;
    },
  };
}

/** Configure the shared blueprint reader and writer for a robot task's world and its given cards. */
export function robotBlueprint(model, given, { sensors, outs }) {
  const parts = wiring(model, { sensors, outs, offers: given.offers });
  const start = fitted(blank(), given);
  return {
    read: lines => {
      const types = [...Object.keys(PRIMITIVES), ...Object.keys(model.built)];
      const { nodes, wires } = readLines(lines, start, parts, types);
      // Course works are kept without positions. The editor places them together with its given cards.
      return { nodes: nodes.map(({ x: _x, y: _y, ...node }) => node), wires };
    },
    write: board => printLines(board, parts),
  };
}
