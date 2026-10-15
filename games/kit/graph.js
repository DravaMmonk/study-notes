// Circuit kit: graph checks shared by 状态之图 and Vision Complete. Each app maps its own wires to plain edges.

/**
 * Would an edge from → to close a loop? `edges` is a list of [from, to] piece ids (a piece feeding another).
 * It would if `to` is `from`, or if `from` can already be reached from `to`.
 */
export function wouldCycle(edges, from, to) {
  if (from === to) return true;
  const next = new Map();
  for (const [a, b] of edges) next.set(a, [...(next.get(a) || []), b]);
  const seen = new Set(), stack = [to];
  while (stack.length) {
    const id = stack.pop();
    if (id === from) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...(next.get(id) || []));
  }
  return false;
}
