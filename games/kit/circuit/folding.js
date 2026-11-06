// Folding changes card bodies only. Nested components inherit their enclosing frame's block view.
export function foldedPartsOf(graph, blocks, view = 'ports') {
  const folded = new Set(blocks.filter((s) => s.view === view).flatMap((s) => s.nodes))
  let added = true
  while (added) {
    added = false
    for (const n of graph.nodes) if (n.in && folded.has(n.in.split('/')[0]) && !folded.has(n.id)) { folded.add(n.id); added = true }
  }
  return folded
}
