// Folding changes card bodies only. Nested components inherit their enclosing frame's section fold state.
export function foldedPartsOf(graph, sections) {
  const folded = new Set(sections.filter((s) => s.folded).flatMap((s) => s.nodes))
  let added = true
  while (added) {
    added = false
    for (const n of graph.nodes) if (n.in && folded.has(n.in.split('/')[0]) && !folded.has(n.id)) { folded.add(n.id); added = true }
  }
  return folded
}
