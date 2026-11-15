// Frames: cards that hold other cards (a proof's assumption box). A frame part names its regions
// (parts.frames(node) → [{ name, label, opens }]); a card inside one says where it is:
//
//   node.in   '<frame id>/<region>'   absent on the board itself; x, y then count from the region's corner
//   node.fold true                    a frame shown folded, its regions hidden
//
// A region that `opens` gives a value of its own, read inside it from the frame's output `<frame>#<region>` (the
// assumption it makes), and what is made inside a region comes back out through the frame's input named after it.
// So a value is seen where it is made and in every region inside that: a wire may run inward, never outward.
import { sourceOf, splitSource, srcNode } from '../engine/wire-source.js'
import { T } from '../shell/i18n.js'
import { PartError, evaluate } from '../engine/circuit.js'
import { frameTree, regionAddress, regionsFit, regionsOf } from './regions.js'

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

const opens = (parts, node, key) => regionsOf(parts, node).some((r) => r.name === key && r.opens)
const isRegion = (parts, node, port) => regionsOf(parts, node).some((r) => r.name === port)

/**
 * The edges for loop checks on a board with frames: a region's own output stands apart from its frame (a node of
 * its own, `<frame>#<region>`), fed by the frame's other inputs only, so a frame may read back what its region made.
 */
export function frameEdges(graph, parts) {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  const from = (src) => {
    const [id, key] = splitSource(src)
    return opens(parts, byId.get(id), key) ? src : id
  }
  const edges = graph.wires.map((w) => [from(w.from), w.to])
  for (const node of graph.nodes) {
    for (const r of regionsOf(parts, node).filter((x) => x.opens)) {
      for (const w of graph.wires.filter((x) => x.to === node.id && !isRegion(parts, node, x.port))) edges.push([from(w.from), sourceOf(node.id, r.name)])
    }
  }
  return { edges, from }
}

/** Why a wire may not run here on a board with frames, or null. */
export function scopeRefusal(graph, parts, from, to, port, tree = frameTree(graph.nodes)) {
  const [source, key] = splitSource(from)
  const fromNode = tree.node(source)
  const toNode = tree.node(to)
  const seen = tree.ancestors(opens(parts, fromNode, key) ? regionAddress(source, key) : fromNode?.in)
  const at = tree.ancestors(isRegion(parts, toNode, port) ? regionAddress(to, port) : toNode?.in)
  if (seen && at && seen.length <= at.length && seen.every((region, i) => region === at[i])) return null
  return T('此处无法使用：框里得出的结果只能在框里使用；要带出框外，请接到框的结论上。')
}

/** Move a card into a region or onto the board, keeping only the wires still in scope. */
export function moveInto(graph, parts, id, region, x, y) {
  if (!graph.nodes.some((node) => node.id === id)) return graph
  const nodes = graph.nodes.map((node) => {
    if (node.id !== id) return node
    const { in: _, ...rest } = node
    return { ...rest, ...(region === null ? {} : { in: region }), x, y }
  })
  const moved = { ...graph, nodes }
  if (!regionsFit(moved, parts)) return graph
  const tree = frameTree(nodes)
  return { ...moved, wires: moved.wires.filter((w) => !scopeRefusal(moved, parts, w.from, w.to, w.port, tree)) }
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
  const tree = frameTree(graph.nodes)
  const scope = regionAddress(node.id, region)
  if (tree.ancestors(scope) === null) throw fail('框的区域出现循环嵌套', 'Frame regions form a containment cycle')
  const ids = tree.included(graph.nodes.filter((part) => part.in === scope).map((part) => part.id))
  const inside = graph.nodes.filter((part) => ids.has(part.id))
  const back = graph.wires.find((w) => w.to === node.id && w.port === region)
  if (!back) throw fail('框里还没有接到「结果」上', 'Nothing inside is wired to the result yet')
  const parts = ctx.engine.parts
  const partOf = (type) => (typeof parts === 'function' ? parts(type) : parts[type])
  const opened = sourceOf(node.id, region)
  const constants = new Set()
  const constant = (id) => {
    if (constants.has(id)) return true
    const n = tree.node(id)
    const part = n && partOf(n.type)
    if (!part || part.frames) return false
    const fixed = part.source ? Boolean(ctx.constants?.includes(n.params?.name)) : graph.wires.filter((w) => w.to === id).every((w) => constant(srcNode(w.from)))
    if (fixed) constants.add(id)
    return fixed
  }
  for (const w of graph.wires.filter((x) => ids.has(x.to))) {
    if (!ids.has(srcNode(w.from)) && w.from !== opened && !constant(srcNode(w.from))) throw fail('框里只能用框开出来的东西和框外的常量', 'Inside the frame, only what the frame opens and constants from outside can be used')
  }
  const OPEN = '__open'
  const strip = ({ in: _, ...n }) => n
  const sub = {
    nodes: [{ id: OPEN, type: OPEN }, ...inside.map(strip), ...[...constants].filter((id) => !ids.has(id)).map((id) => strip(tree.node(id)))],
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
