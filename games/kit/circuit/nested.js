// Boards inside boards (../engine/boards.js), for an editor: a part with boards keeps them on its node as
// node.boards[name]; the editor shows one board at a time, reached by a path from the top board,
//
//   path  [{ node: id, board: name }, …]     [] is the top board
//
// boardAt reads the board a path leads to, withBoardAt writes it back (every board on the way is copied, the rest
// shared), and trail names each step for a breadcrumb. A game opens a board when the player opens a part that has one
// (its part's `boards(node)`), and goes back up the trail.

const EMPTY = { nodes: [], wires: [] }

/** The board `path` leads to inside `circuit` (an empty one where a part has not had it yet). */
export function boardAt(circuit, path) {
  let board = circuit
  for (const { node, board: name } of path) {
    const n = board.nodes.find((x) => x.id === node)
    if (!n) return null
    board = n.boards?.[name] ?? EMPTY
  }
  return board
}

/** `circuit` with the board at `path` replaced by `inner`. */
export function withBoardAt(circuit, path, inner) {
  if (!path.length) return inner
  const [{ node, board: name }, ...rest] = path
  return {
    ...circuit,
    nodes: circuit.nodes.map((n) => (n.id === node ? { ...n, boards: { ...n.boards, [name]: withBoardAt(n.boards?.[name] ?? EMPTY, rest, inner) } } : n)),
  }
}

/** The path cut back to its first `depth` steps (0: the top board), for a breadcrumb's links. */
export const upTo = (path, depth) => path.slice(0, depth)

/** Each step of a path as { label, depth }: the part's label (labelOf(node)) and the board's name when it has several. */
export function trail(circuit, path, labelOf, boardsOf = () => []) {
  const out = []
  let board = circuit
  path.forEach(({ node, board: name }, k) => {
    const n = board.nodes.find((x) => x.id === node)
    const many = boardsOf(n).length > 1
    out.push({ label: many ? `${labelOf(n)} · ${name}` : labelOf(n), depth: k + 1 })
    board = n?.boards?.[name] ?? EMPTY
  })
  return out
}
