// The boards the player passed the building levels with (the shell's progress.built), by task key: a level's board
// under its id, a task's under its id (the read level's or task's `key`). A part the player built (a machine part,
// machine.js builtParts; a gate, gates.js builtGates; a lemma, the proof of each of its shapes, course.js lemmaProofs)
// runs the board of its level or task kept here, or that level's or task's reference board when there is none (a level
// opened by "unlock all").
const OWN = new Map()

/** Every screen that runs built parts puts the shell's progress.built here first. */
export const syncOwn = (built = {}) => {
  OWN.clear()
  for (const [key, board] of Object.entries(built)) if (board?.nodes) OWN.set(key, board)
}

/** The board kept under task key `key` (a level's id, or a task's), or null. */
export const ownBoard = (key) => OWN.get(key) ?? null
