// Frames: cards that hold other cards (a proof's assumption box). A frame part names its regions
// (parts.frames(node) → [{ name, label, opens }]); a card inside one says where it is:
//
//   node.in   '<frame id>/<region>'   absent on the board itself; x, y then count from the region's corner
//   node.fold true                    a frame shown folded, its regions hidden
//
// A region that `opens` gives a value of its own, read inside it from the frame's output `<frame>#<region>` (the
// assumption it makes), and what is made inside a region comes back out through the frame's input named after it.
// So a value is seen where it is made and in every region inside that: a wire may run inward, never outward.
import { T } from '../shell/i18n.js'
import { PartError, evaluate } from '../engine/circuit.js'

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
  return T('此处无法使用：框里得出的结果只能在框里使用；要带出框外，请接到框的结论上。')
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

const fail = (zh, en) => new PartError(T(zh, en))
/**
 * A region run on its own, as a function: a frame that runs its region again and again (a loop, a search, one item of a
 * list at a time) calls it with the value the region opens with and gets back what reaches the region's result. The
 * cards in the region run; from outside it a card may read only what the frame opens and constants: a card with no
 * frame whose every input is a constant (a card with no inputs at all), or a board input the run names constant
 * (ctx.constants, by name). ctx is the frame's (engine/circuit.js: ctx.graph the board, ctx.engine its parts).
 * Returns run(value, quiet) → the result; quiet keeps the cards' steps out of a traced run.
 */
export function runRegion(node, ctx, region) {
  const graph = ctx.graph
  const deep = within(graph, node.id)
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  // The region a card inside the frame sits in, at the frame's own level.
  const regionOf = (n) => {
    let at = n
    while (at?.in && at.in.split('/')[0] !== node.id) at = byId.get(at.in.split('/')[0])
    return at?.in?.split('/')[1]
  }
  const inside = graph.nodes.filter((n) => deep.has(n.id) && regionOf(n) === region)
  const ids = new Set(inside.map((n) => n.id))
  const back = graph.wires.find((w) => w.to === node.id && w.port === region)
  if (!back) throw fail('框里还没有接到「结果」上', 'Nothing inside is wired to the result yet')
  const parts = ctx.engine.parts
  const partOf = (type) => (typeof parts === 'function' ? parts(type) : parts[type])
  const opened = `${node.id}#${region}`
  const constants = new Set()
  const constant = (id) => {
    if (constants.has(id)) return true
    const n = byId.get(id)
    const part = n && partOf(n.type)
    if (!part || part.frames) return false
    const fixed = part.source ? Boolean(ctx.constants?.includes(n.params?.name)) : graph.wires.filter((w) => w.to === id).every((w) => constant(nodeOf(w.from)))
    if (fixed) constants.add(id)
    return fixed
  }
  for (const w of graph.wires.filter((x) => ids.has(x.to))) {
    if (!ids.has(nodeOf(w.from)) && w.from !== opened && !constant(nodeOf(w.from))) throw fail('框里只能用框开出来的东西和框外的常量', 'Inside the frame, only what the frame opens and constants from outside can be used')
  }
  const OPEN = '__open'
  const strip = ({ in: _, ...n }) => n
  const sub = {
    nodes: [{ id: OPEN, type: OPEN }, ...inside.map(strip), ...[...constants].filter((id) => !ids.has(id)).map((id) => strip(byId.get(id)))],
    wires: graph.wires.filter((w) => ids.has(w.to) || constants.has(w.to)).map((w) => (w.from === opened ? { ...w, from: OPEN } : w)),
  }
  return (value, quiet = false) => {
    const { values } = evaluate(sub, { parts: (type) => (type === OPEN ? { inputs: [], eval: () => value } : partOf(type)), ctx: quiet ? { ...ctx, trace: null } : ctx })
    // A region that only passes on what it opens with gives it back.
    const out = back.from === opened ? value : values.get(back.from)
    if (out === undefined) throw fail('框里有一个元件算不出来', 'A part inside cannot compute')
    return out
  }
}
