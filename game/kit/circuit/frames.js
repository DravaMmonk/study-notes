// Frames: cards that hold other cards (a proof's assumption box). A frame part names its regions
// (parts.frames(node) → [{ name, label, opens }]); a card inside one says where it is:
//
//   node.in   '<frame id>/<region>'   absent on the board itself; x, y then count from the region's corner
//   node.fold true                    a frame shown folded, its regions hidden
//
// A region that `opens` gives a value of its own, read inside it from the frame's output `<frame>#<region>` (the
// assumption it makes), and what is made inside a region comes back out through the frame's input named after it.
// So a value is seen where it is made and in every region inside that: a wire may run inward, never outward.

// Any game can use frames: a domain makes a frame part with framePart (its eval gets the region's name as `key` for
// what that region opens, and null for the frame's own result), the editors (CanvasEditor, SlotBoard) draw and edit
// the regions, model.js keeps wires in scope, and engine/circuit.js reads each output from the ports it says
// (`reads`). Labels for the regions come from the game's parts description (parts.frames(node) → [{ …, label }]).

/**
 * A frame part for a domain's registry (../engine/circuit.js): its `own` inputs, then one input per region (what was
 * made inside it, closing the region); its outputs are its result, then the value each opening region gives, which
 * reads the frame's own inputs alone, so a frame can read back what was made from it.
 * regions: [{ name, opens }]; the part's eval(inputs, node, ctx, key) gets key = a region's name for that value.
 */
export const framePart = (own, regions) => ({
  inputs: [...own, ...regions.map((r) => r.name)],
  frames: () => regions,
  outputs: () => [null, ...regions.filter((r) => r.opens).map((r) => r.name)],
  reads: (_node, key) => (key ? own : undefined),
})

/** Whether every card that sits in a region sits in one its frame still has (a saved board still fits the game). */
export function regionsFit(graph, parts) {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  return graph.nodes.every((n) => {
    if (!n.in) return true
    const [id, name] = n.in.split('/')
    return byId.has(id) && regionsOf(parts, byId.get(id)).some((r) => r.name === name)
  })
}

const nodeOf = (src) => String(src).split('#')[0]
const keyOf = (src) => (String(src).includes('#') ? String(src).slice(String(src).indexOf('#') + 1) : null)
const T = (zh, en) => ({ zh, en })

/** The regions a node is inside, outermost first ('<frame>/<region>' each). */
export function scopeOf(graph, id) {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  const out = []
  for (let n = byId.get(id); n?.in; n = byId.get(n.in.split('/')[0])) out.unshift(n.in)
  return out
}

const regionsOf = (parts, node) => (node && parts.frames?.(node)) ?? []
const opens = (parts, node, key) => regionsOf(parts, node).some((r) => r.name === key && r.opens)
const isRegion = (parts, node, port) => regionsOf(parts, node).some((r) => r.name === port)

/** Where a wire's source is seen from: the regions around its node, and the region it opens, if it is one. */
const sourceScope = (graph, parts, src) => {
  const id = nodeOf(src)
  const node = graph.nodes.find((n) => n.id === id)
  return opens(parts, node, keyOf(src)) ? [...scopeOf(graph, id), `${id}/${keyOf(src)}`] : scopeOf(graph, id)
}
/** Where an input reads from: the regions around its node, and the region it closes, for a region's input. */
const portScope = (graph, parts, to, port) => {
  const node = graph.nodes.find((n) => n.id === to)
  return isRegion(parts, node, port) ? [...scopeOf(graph, to), `${to}/${port}`] : scopeOf(graph, to)
}

/**
 * The edges for loop checks on a board with frames: a region's own output stands apart from its frame (a node of
 * its own, `<frame>#<region>`), fed by the frame's other inputs only, so a frame may read back what its region made.
 */
export function frameEdges(graph, parts) {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  const from = (src) => (opens(parts, byId.get(nodeOf(src)), keyOf(src)) ? String(src) : nodeOf(src))
  const edges = graph.wires.map((w) => [from(w.from), w.to])
  for (const node of graph.nodes) {
    for (const r of regionsOf(parts, node).filter((x) => x.opens)) {
      for (const w of graph.wires.filter((x) => x.to === node.id && !isRegion(parts, node, x.port))) edges.push([from(w.from), `${node.id}#${r.name}`])
    }
  }
  return { edges, from }
}

/** Why a wire may not run here on a board with frames, or null. */
export function scopeRefusal(graph, parts, from, to, port) {
  const [seen, at] = [sourceScope(graph, parts, from), portScope(graph, parts, to, port)]
  if (seen.length <= at.length && seen.every((r, k) => r === at[k])) return null
  return T('这里看不到它：框里得出的东西只能在框里用，要带出框，得接到框的结论上。', 'It cannot be seen from here: what is made inside a box is for use inside it; to take it out, wire it to the box’s conclusion.')
}

/** Every node inside the frame `id`, at any depth. */
export function within(graph, id) {
  const out = new Set()
  let grew = true
  while (grew) {
    grew = false
    for (const n of graph.nodes) {
      const host = n.in?.split('/')[0]
      if (host && (host === id || out.has(host)) && !out.has(n.id)) { out.add(n.id); grew = true }
    }
  }
  return out
}

/** The board without node `id`, and without everything inside it when it is a frame, with their wires. */
export function removeFramed(graph, id) {
  const gone = new Set([id, ...within(graph, id)])
  return { ...graph, nodes: graph.nodes.filter((n) => !gone.has(n.id)), wires: graph.wires.filter((w) => !gone.has(nodeOf(w.from)) && !gone.has(w.to)) }
}

/**
 * Node `id` moved into `region` ('<frame>/<name>', or null for the board itself) at x, y there; the wires it can no
 * longer keep go. A frame never goes inside itself: then nothing changes.
 */
export function moveInto(graph, parts, id, region, x, y) {
  if (region && (region.split('/')[0] === id || within(graph, id).has(region.split('/')[0]))) return graph
  const nodes = graph.nodes.map((n) => {
    if (n.id !== id) return n
    const { in: _, ...rest } = n
    return { ...rest, ...(region ? { in: region } : {}), x, y }
  })
  const moved = { ...graph, nodes }
  return { ...moved, wires: moved.wires.filter((w) => !scopeRefusal(moved, parts, w.from, w.to, w.port)) }
}
