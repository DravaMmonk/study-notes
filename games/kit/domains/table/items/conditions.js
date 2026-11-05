// The conditions content writes about a board (vocabulary.js condition): a task's step-by-step guide and its
// diagnosis of a failure are lists of them with what to say.

import { callOf } from '../../../engine/schema.js';
import { isGiven } from '../model/parts.js';
import { partsOfType, readsOf, splitSrc, usesSensor } from '../model/board.js';

const CONDITIONS = {
  reads: (id, b) => readsOf(b).includes(id),
  uses: (id, b) => usesSensor(b, id),
  has: (p, b) => (typeof p === 'string' ? partsOfType(b, p).length > 0 : partsOfType(b, p.part, p.value).length > 0),
  feeds: ({ from, to }, b) => b.wires.some(w => b.nodes.some(n => n.id === splitSrc(w.from)[0] && n.type === from) && b.nodes.some(n => n.id === w.to && n.type === to)),
  placed: (_, b) => b.nodes.some(n => !isGiven(n.type)),
  wired: (_, b) => b.wires.length > 0,
  wiredOut: (_, b) => b.wires.some(w => b.nodes.some(n => n.id === w.to && n.type === 'out')),
  all: (list, b) => list.every(c => holds(c, b)),
  any: (list, b) => list.some(c => holds(c, b)),
  not: (c, b) => !holds(c, b),
};

/** Whether a condition holds of board `b`. */
export function holds(call, b) {
  const [name, params] = callOf(call);
  return CONDITIONS[name](params, b);
}

/** What a level's guide says now: the first step whose `until` does not hold yet (a step without one always speaks). */
export const guideAt = (guide, b) => guide?.find(step => !step.until || !holds(step.until, b))?.say ?? null;
/** What a level's diagnosis says of a failed board: the first entry whose `when` holds. */
export const diagnosisOf = (diagnose, b) => diagnose?.find(d => holds(d.when, b))?.say ?? null;
