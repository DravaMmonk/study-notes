// The boards the player passed the building levels with (the shell's progress.built), by level id: a level's board, or
// for a level of tasks the list of its tasks' boards. A part the player built (a machine part, machine.js builtParts;
// a gate, gates.js builtGates; a lemma, the proof of each of its shapes, course.js lemmaProofs) runs the board of its
// level or task kept here, or that level's or task's reference board when there is none (a level opened by "unlock
// all").
const OWN = new Map()

/** Every screen that runs built parts puts the shell's progress.built here first. */
export const syncOwn = (built = {}) => {
  OWN.clear()
  for (const [id, kept] of Object.entries(built)) if (kept?.nodes || Array.isArray(kept)) OWN.set(id, kept)
}

/** The board kept for level `id` (for its task `task`, in a level of tasks), or null. */
export const ownBoard = (id, task) => {
  const kept = OWN.get(id)
  const board = task === undefined ? kept : Array.isArray(kept) ? kept[task] : null
  return board?.nodes ? board : null
}
