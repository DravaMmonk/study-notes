import { workView } from './workshop-view.js'

/** Resolve packed parts and open their boards with the workshop versions captured on the work. */
export function packedBoards(course, draw) {
  const inTask = (at) => course.forTask(at.level)
  const drawOpened = (opened) => opened ? draw(opened, workView(opened.circuit, inTask(opened))) : null
  return {
    root: (type) => drawOpened(course.BUILT[type]?.opens?.()),
    open: (node, at) => drawOpened(inTask(at).BUILT[node.type]?.opens?.(node.params)),
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
