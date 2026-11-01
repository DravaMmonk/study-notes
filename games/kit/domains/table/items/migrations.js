// The save migrations content names (vocabulary.js migration): game.json's saves write { data: { item: params } }
// where the shared migrations (../../../shell/saves.js) take a function of every level's kept state; this resolves
// each item into that function. A circuit level keeps { stage, boards } (before version 3, { stage, circs }).

import { callOf } from '../../../engine/schema.js';
import { fromVersion2 } from '../model/board.js';

const circuitState = v => v && typeof v === 'object' && Array.isArray(v.circs);

const MIGRATIONS = {
  /** Boards in the shape before version 3: parts dropped (with their wires), parts renamed. */
  oldBoards: ({ drop = [], rename = {} }) => v => {
    if (!circuitState(v)) return v;
    const fix = b => {
      const gone = new Set(b.nodes.filter(n => drop.includes(n.kind)).map(n => n.id));
      return { ...b, nodes: b.nodes.filter(n => !gone.has(n.id)).map(n => (n.kind in rename ? { ...n, kind: rename[n.kind] } : n)), wires: b.wires.filter(w => !gone.has(w.from.split('#')[0]) && !gone.has(w.to.split(':')[0])) };
    };
    return { ...v, circs: v.circs.map(fix) };
  },
  /** Every board into the shape of version 3 (../model/board.js), built parts ('bp:<level>') by their keys. What it read
   *  goes on 视野 for now: opened in its level, each sensor moves to the card that offers it (fitted). */
  boards: ({ parts }) => v => (circuitState(v) ? { stage: v.stage ?? 0, boards: v.circs.map(b => fromVersion2(b, parts)) } : v),
};

/** A migration item as the function the shared migrations run on every level's state. */
export function migration(call) {
  const [name, params] = callOf(call);
  return MIGRATIONS[name](params);
}

/** game.json's saves with every { data: item } a function. */
export const savesOf = saves => saves.map(step => ({ ...step, ops: step.ops.map(op => ('data' in op ? { data: migration(op.data) } : op)) }));
