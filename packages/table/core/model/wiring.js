import { portsOf, paramsOf, printLines, readLines } from 'circuit'
import { isCard } from './parts.js'
import { blank, fitted, picksOf, roleOf } from './board.js'
export function wiring(model, u) {
  const io = { sensors: u.sensors, outs: u.outs, workshop: u.workshop };
  return {
    // What the level gives is a source (on top on a phone) or a sink; the rest are parts.
    role: roleOf,
    signalOf: (board, src) => model.srcType(board, io, src),
    // What the level gives stays on the board: only a card's outputs change.
    inputs: node => {
      const part = model.partOf(node.type);
      return part ? portsOf(part, node) : [];
    },
    // Each sensor a card reads is an output of its own.
    outputs: node => model.partOf(node.type)?.outputs?.(node)?.map(key => ({ key, label: u.sensors[key]?.label ?? key })) ?? null,
    // As text (../../../circuit/text.js): a card is written out with what it reads.
    // A card a wire reads a sensor of is switched on for it, if the task offers that sensor (in the card's order).
    text: {
      settings: node => paramsOf(model.partOf(node.type), node),
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
    refuse: (graph) => {
      const why = model.typeError(graph, io);
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
      const types = [...model.types, ...Object.keys(model.built)];
      const { nodes, wires } = readLines(lines, start, parts, types);
      // Course works are kept without positions. The editor places them together with its given cards.
      return { nodes: nodes.map(({ x: _x, y: _y, ...node }) => node), wires };
    },
    write: board => printLines(board, parts),
  };
}
