// A tree with holes, for a strip that builds one (a formula, a proof term): a node's children each take some kind of
// thing, and an empty child (null) is a hole. A game says what a node's children are and how to replace one; this
// gives the rest. A path is the child indices from the root: [] is the root, [1, 0] the first child of its second.
//
//   holeTree({ kids(node) → [{ kind, value }], withKid(node, k, value) → node, root: kind of the root })
//     → { nodeAt, setAt, holesOf, kindAt, complete, trailing, outward }

export function holeTree({ kids, withKid, root = 'any' }) {
  const nodeAt = (tree, path) => path.reduce((node, k) => (node ? kids(node)[k]?.value ?? null : null), tree)
  const setAt = (tree, path, value) => {
    if (!path.length) return value
    const [k, ...rest] = path
    return withKid(tree, k, setAt(kids(tree)[k].value, rest, value))
  }
  // Every empty hole, in reading order, with the kind it takes.
  const holesOf = (tree, path = [], kind = root) => (tree ? kids(tree).flatMap((kid, k) => holesOf(kid.value, [...path, k], kid.kind)) : [{ path, kind }])
  const kindAt = (tree, path) => (path.length ? kids(nodeAt(tree, path.slice(0, -1)))[path[path.length - 1]].kind : root)
  const complete = (tree) => Boolean(tree) && !holesOf(tree).length
  // The last whole thing of a kind the line ends with: down the last child each time, the deepest node of that kind,
  // if it is complete (null when the line ends with a box). A piece that needs something in front of it (→ after a
  // sentence, .1 after a term) takes this one, as a calculator's operator takes the last number.
  const trailing = (tree, kind) => {
    let found = null
    let node = tree
    let path = []
    let at = root
    while (node) {
      if (at === kind) found = path
      const list = kids(node)
      if (!list.length) break
      const last = list.length - 1
      if (!list[last].value) return null
      ;[node, path, at] = [list[last].value, [...path, last], list[last].kind]
    }
    return found && complete(nodeAt(tree, found)) ? found : null
  }
  // From a path, up through each parent `up(parent, k)` lets it climb out of (k: which child it is): how far a piece
  // joining on reaches back, by how tightly the pieces around bind (A ∧ B then → takes A ∧ B; p q then □ □ takes p q).
  const outward = (tree, path, up) => {
    let at = path
    while (at.length && up(nodeAt(tree, at.slice(0, -1)), at[at.length - 1])) at = at.slice(0, -1)
    return at
  }
  return { nodeAt, setAt, holesOf, kindAt, complete, trailing, outward }
}
