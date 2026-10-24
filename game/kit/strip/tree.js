// A tree with holes, for a strip that builds one (a formula, a proof term): a node's children each take some kind of
// thing, and an empty child (null) is a hole. A game says what a node's children are and how to replace one; this
// gives the rest. A path is the child indices from the root: [] is the root, [1, 0] the first child of its second.
//
//   holeTree({ kids(node) → [{ kind, value }], withKid(node, k, value) → node, root: kind of the root })
//     → { nodeAt, setAt, holesOf, kindAt, complete }

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
  return { nodeAt, setAt, holesOf, kindAt, complete }
}
