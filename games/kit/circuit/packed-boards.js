import { workView } from './workshop-view.js'
import { openPackedPart } from '../engine/board-view.js'
import { solutionStamp, workSignature } from '../engine/stamp.js'

/** Resolve packed parts and open their boards with the workshop versions captured on the work. */
export function packedBoards(course, draw) {
  const inTask = (at) => course.forTask(at.level)
  const drawOpened = (opened) => opened ? draw(opened, workView(opened.circuit, inTask(opened))) : null
  return {
    root: (type) => drawOpened(course.BUILT[type]?.opens?.()),
    open: (node, at) => drawOpened(openPackedPart(inTask(at), node)),
    builder: (node, at) => inTask(at).builtBy(node.type, node.params),
  }
}

/** Find boards by their packed-part path, resolving each parent at most once. */
export function lookupBoard(top, open) {
  const boards = new Map()
  function at(path) {
    if (!path.length) return top
    const key = JSON.stringify(path)
    if (!boards.has(key)) {
      const outer = at(path.slice(0, -1))
      const node = outer?.circuit.nodes.find((part) => part.id === path.at(-1))
      boards.set(key, node ? open(node, outer) ?? null : null)
    }
    return boards.get(key)
  }
  return at
}

/** Identify the circuit and the work it runs through packed parts or domain references. */
export function circuitWorkStamp(top, open, references) {
  const entry = (at, key) => ({ key, work: workSignature(at.circuit), at })
  return solutionStamp(entry(top, top.level.taskId), ({ at }) => [
    ...(at.circuit?.nodes ?? []).flatMap((node) => {
      const child = open(node, at)
      return child?.circuit ? [entry(child, `${node.type}:${child.level.taskId}`)] : []
    }),
    ...(references?.(at.level, at.circuit) ?? []).map(({ key, task, work }) =>
      entry({ level: task, circuit: work, parts: at.parts }, key)),
  ]).stamp
}
