// The boards the player passed the building levels with (the shell's progress.built), by task id (the read task's
// `taskId`). A part the player built (a machine part, machine.js builtParts; a gate, gates.js builtGates; a lemma, the
// proof of each of its shapes, course.js lemmaProofs) runs the board of its task kept here, or that task's reference
// board when there is none (a level opened by "unlock all"). Each course read keeps its own (course.js logicCourse):
// two games never share them.

/** A store of kept boards: { sync(built) — every screen that runs built parts hands it progress.built first —, board(key) → the board or null }. */
export function keptBoards() {
  const own = new Map()
  return {
    sync: (built = {}) => {
      own.clear()
      for (const [key, b] of Object.entries(built)) if (b?.nodes) own.set(key, b)
    },
    board: (key) => own.get(key) ?? null,
  }
}
