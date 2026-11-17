import { frameTree } from "./regions.js"

// Folding changes card bodies only. Nested components inherit their enclosing frame's block view.
export function foldedPartsOf(graph, blocks, view = 'ports') {
  return frameTree(graph.nodes).included(blocks.filter((block) => block.view === view).flatMap((block) => block.nodes))
}
