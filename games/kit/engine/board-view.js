// A course read as the circuit screen plays it (../shell/CircuitScreen.jsx `course`), for a domain that reads its course
// its own way: what circuitCourse (./board-course.js) gives a circuit-base game, made of the domain's reading.
//
//   boardView({ board, parts(task), built?(task), builder?(type, task), offerIn, holdsIn, syncOwn, opening? })
//       board    its circuitBoard (./board-cards.js)
//       parts    the parts a task's board holds, by type; built(task) those it holds that a level builds (packed parts,
//                each with its `name`, `desc` and `opens()`), and builder(type, task) the task that builds one
//       offerIn, holdsIn, syncOwn   the course's (../course.js offer, holds; the boards the player passed with)
//       opening(task, kept)   the board a task opens on (by default its start)
//     → { BUILT, builtBy, forTask(task) → the task's view }: BUILT and builtBy outside any task

export function boardView({ board, parts, built = () => ({}), builder = () => null, offerIn, holdsIn, syncOwn, opening = (task) => board.startBoard(task) }) {
  const builtBy = (task) => (type) => {
    const at = builder(type, task)
    const part = built(task)[type]
    return at && part ? { ...at, builds: { type, name: part.name, desc: part.desc } } : null
  }
  const forTask = (task) => ({
    board,
    BUILT: built(task),
    builtBy: builtBy(task),
    partOf: (type) => board.FIXED_PARTS[type] ?? parts(task)[type],
    syncOwn,
    offerIn,
    holdsIn,
    opening,
    stageChain: () => [],
  })
  return { BUILT: built(null), builtBy: builtBy(null), forTask }
}
