// The boards the player passed the building levels with (the shell's progress.built), by level id. A part the player
// built (a machine part, machine.js builtParts; a gate, gates.js builtGates) runs the board of its level kept here, or
// that level's reference board when there is none (a level opened by "unlock all", or a save from before it was kept).
const OWN = new Map()

/** Every screen that runs built parts puts the shell's progress.built here first. */
export const syncOwn = (built = {}) => {
  OWN.clear()
  for (const [id, board] of Object.entries(built)) if (board?.nodes) OWN.set(id, board)
}

/** The board kept for level `id`, or null. */
export const ownBoard = (id) => OWN.get(id) ?? null
