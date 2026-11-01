// The save migrations content names (vocabulary.js migration): game.json's saves write { rename: item } or
// { data: item } where the shared migrations (../../../shell/saves.js) take a function, of every level's id or of every
// level's kept state; this resolves each item into that function.

import { callOf } from '../../../engine/schema.js'

const MIGRATIONS = {
  /** Nothing carries over: every level id, or every level's kept state, becomes nothing. */
  none: () => () => null,
}

/** A migration item as the function the shared migrations run. */
export function migration(call) {
  const [name, params] = callOf(call)
  return MIGRATIONS[name](params)
}

/** game.json's saves with every op that names an item a function. */
export const savesOf = (saves) => saves.map((step) => ({
  ...step,
  ops: step.ops.map((op) => ('data' in op ? { data: migration(op.data) } : typeof op.rename === 'string' ? { rename: migration(op.rename) } : op)),
}))
