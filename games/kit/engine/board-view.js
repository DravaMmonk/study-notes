// A course read as the circuit screen plays it (../shell/CircuitScreen.jsx `course`), for a domain that reads its course
// its own way: what circuitCourse (./board-course.js) gives a circuit-base game, made of the domain's reading.
//
//   boardView({ board, parts(task), built?(task), builder?(type, task), defined?(task), offerIn, holdsIn, syncOwn, opening? })
//       board    its circuitBoard (./board-cards.js)
//       parts    the parts a task's board holds, by type; built(task) those it holds that a level builds (packed parts,
//                each with its `name`, `desc` and `opens()`: the view's `pieces`), and builder(type, task) the task that
//                builds one
//       defined  the parts a task's board holds that are defined as data (shell/parts/faces.jsx: { of, defaults, ops }),
//                where they are the task's own (its rule parts…) and not the game's alone
//       offerIn, holdsIn, syncOwn   the course's (../course.js offer, holds; the boards the player passed with)
//       opening(task, kept)   the board a task opens on (by default its start)
//     → { BUILT, builtBy, pieces, forTask(task) → the task's view }: BUILT, builtBy and pieces outside any task

export function boardView({ board, parts, built = () => ({}), builder = () => null, defined = null, offerIn, holdsIn, syncOwn, opening = (task) => board.startBoard(task) }) {
  const builtBy = (task) => (type) => (built(task)[type] ? builder(type, task) : null)
  const views = new WeakMap()
  const view = (task) => ({
    board,
    BUILT: built(task),
    pieces: built(task),
    builtBy: builtBy(task),
    partOf: (type) => board.FIXED_PARTS[type] ?? parts(task)[type],
    syncOwn,
    offerIn,
    holdsIn,
    opening,
    stageChain: () => [],
    ...(defined ? { defined: defined(task) } : {}),
  })
  // One view a task, so a screen's memos hold.
  const forTask = (task) => {
    if (!views.has(task)) views.set(task, view(task))
    return views.get(task)
  }
  return { BUILT: built(null), builtBy: builtBy(null), pieces: built(null), forTask }
}
