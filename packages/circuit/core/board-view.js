// A course read as the circuit screen plays it (../shell/CircuitScreen.jsx `course`), for a domain that reads its course
// its own way: what circuitWorks (./board-works.js) gives a circuit-base game, made of the domain's reading.
//
//   boardView({ board, parts(task), built?(task), builder?(type, task), defined?(task), offerIn, holdsIn, syncOwn, tasksAt?, opening? })
//       board    its circuitBoard (./board-cards.js)
//       parts    the parts a task's board holds, by type; built(task) those it holds that a level builds (packed parts,
//                each with its `name`, `desc` and `opens()`: the view's `parts`), and builder(type, task) the task that
//                builds one
//       defined  the parts a task's board holds that are defined as data (shell/parts/faces.jsx: { of, defaults, ops }),
//                where they are the task's own (its rule parts…) and not the game's alone
//       offerIn, holdsIn, syncOwn   the course's (../course.js offer, holds; the boards the player passed with)
//       tasksAt(level)   the tasks to find a preceding task when the new board carries one forward
//       opening(task, progress, viewOf)   override how the board opens using the active views
//     → { BUILT, builtBy, parts, forTask(task) → the task's view }: BUILT, builtBy and parts outside any task

import { inheritedBoard } from './progress.js'



/** A task's declared circuit predecessor, in this level or at the end of another level. */
export function previousCircuitTask(task, tasksAt) {
  if (task.carries && task.task > 0) return tasksAt(task.id)?.[task.task - 1]
  return task.carry ? tasksAt(task.carry)?.at(-1) : undefined
}

/** Check a board against the ports and parts in the view that will run it. */
export function fitsCircuit(graph, task, view) {
  return view.board.fits(graph, task, view, view.board.wiring(task, view))
}

/** Open saved work that still fits the task, or prepare the course's opening board. */
export function openCircuit(view, task, progress, saved, prepare = (board) => board) {
  if (fitsCircuit(saved, task, view)) {
    const board = prepare(saved)
    if (board === saved || fitsCircuit(board, task, view)) return board
  }
  return prepare(view.opening(task, progress))
}

export function boardView({ board, parts, built = () => ({}), builder = () => null, defined = null, offerIn, holdsIn, syncOwn, runtime, tasksAt, opening }) {
  const builtBy = (task) => (type, params) => (built(task)[type] ? builder(type, task, params) : null)
  const views = new WeakMap()
  const open = (task, progress, viewOf) => {
    const previous = tasksAt && previousCircuitTask(task, tasksAt)
    const kept = previous && previous.kind === task.kind && progress && inheritedBoard(progress, previous)
    if (kept && fitsCircuit(kept, previous, viewOf(previous))) {
      const circuit = viewOf(task)
      const carried = board.carriedOnto(task, kept, circuit.board.wiring(task, circuit))
      if (fitsCircuit(carried, task, circuit)) return carried
    }
    return board.startBoard(task)
  }
  const view = (task) => {
    const has = holdsIn?.(task, new Set())
    const specialized = new Map()
    const partOf = type => {
      const part = parts(task)[type]
      const definition = has?.definition?.(type)
      if (!part?.specialize || !definition?.op || definition.inside) return part
      if (!specialized.has(type)) specialized.set(type, part.specialize(definition))
      return specialized.get(type)
    }
    return {
      board,
      BUILT: built(task),
      parts: built(task),
      builtBy: builtBy(task),
      partOf: (type) => {
        if (Object.hasOwn(board.FIXED_PARTS, type)) return board.FIXED_PARTS[type]
        return partOf(type)
      },
      syncOwn,
      ...(runtime && { runtime }),
      offerIn: (task, flags) => {
        const { shown, folded, types } = offerIn(task, flags)
        const available = parts(task)
        const supported = (type) => Object.hasOwn(available, type)
        return { shown: shown.filter(supported), folded: folded.filter(supported), types: types.filter(supported) }
      },
      holdsIn,
      opening: (task, progress, project) => (opening ?? open)(task, progress, (t) => {
        const scope = forTask(t)
        return project ? project(scope) : scope
      }),
      stageChain: () => [],
      ...(defined ? { defined: defined(task) } : {}),
    }
  }
  // One view a task, so a screen's memos hold.
  const forTask = (task) => {
    if (!views.has(task)) views.set(task, view(task))
    return views.get(task)
  }
  return { BUILT: built(null), builtBy: builtBy(null), parts: built(null), forTask }
}
