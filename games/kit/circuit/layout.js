import { srcKey, srcNode, wireEdges } from '../engine/wire-source.js'
import { curve } from '../wires.js'
import { dependencyOrder, indexEdges } from '../graph.js'
import { spaceNodes } from './spacing.js'

/** The fields that position or fold a card without changing what it computes. */
export const cardPosition = (node) => Object.fromEntries(['x', 'y', 'slot', 'span', 'fold'].filter((key) => node?.[key] !== undefined).map((key) => [key, node[key]]))

// The same depth calculation is used for imported cards and headless drawings. A feedback edge contributes a
// finite depth from the first revisit, so an import or preview can still place every card.
function columnDepths(ids, before) {
  const own = new Set(ids)
  const depth = new Map()
  const visit = (id, seen) => {
    if (depth.has(id)) return depth.get(id)
    if (seen.has(id)) return 0
    seen.add(id)
    const upstream = before(id).filter((parent) => own.has(parent))
    const value = Math.max(0, ...upstream.map((parent) => visit(parent, seen) + 1))
    depth.set(id, value)
    return value
  }
  for (const id of ids) visit(id, new Set())
  return depth
}

export function flowLayout(nodes, wires, { sizeOf, gapX = 44, gapY = 14 } = {}) {
  const depth = columnDepths(nodes.map((node) => node.id), indexEdges(wireEdges(wires)).before)
  const columns = []
  for (const node of nodes) (columns[depth.get(node.id)] ??= []).push(node)
  const positions = new Map()
  let x = 0, h = 0
  for (const column of columns.filter(Boolean)) {
    let y = 0, w = 0
    for (const node of column) {
      const size = sizeOf(node)
      positions.set(node.id, { ...size, x, y })
      y += size.h + gapY
      w = Math.max(w, size.w)
    }
    h = Math.max(h, y - gapY)
    x += w + gapX
  }
  return { positions, w: Math.max(0, x - gapX), h }
}


const sourceId = (wire) => srcNode(wire.from)
const mean = (values) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
const HIDDEN_BLOCK_WIDTH = 320

/** Stable layout order, including the cycles formed by grouping a larger acyclic circuit. */
export function layoutOrder(nodes, wires) {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const { ordered } = dependencyOrder([...byId.keys()], indexEdges(wireEdges(wires)), { breakCycles: true })
  return ordered.map((id) => byId.get(id))
}

/** Dependency columns use upstream barycentres and actual port offsets instead of card centres. */
export function alignedLayout(nodes, wires, { sizeOf, portY = () => 48, gapX = 24, gapY = 16 }) {
  const own = new Set(nodes.map((n) => n.id)), positions = new Map(), depths = new Map()
  const ordered = layoutOrder(nodes, wires)
  for (const n of ordered) depths.set(n.id, Math.max(0, ...wires.filter((w) => w.to === n.id && own.has(sourceId(w))).map((w) => (depths.get(sourceId(w)) ?? -1) + 1)))
  const columns = new Map()
  for (const n of ordered) { const d = depths.get(n.id); columns.set(d, [...(columns.get(d) ?? []), n]) }
  let x = 0
  for (const column of columns.values()) {
    const desired = (n) => mean(wires.filter((w) => w.to === n.id && positions.has(sourceId(w))).map((w) => positions.get(sourceId(w)).y + portY(sourceId(w), srcKey(w.from), 'out') - portY(n.id, w.port, 'in')))
    column.sort((a, b) => desired(a) - desired(b))
    let bottom = -Infinity
    for (const n of column) {
      const size = sizeOf(n), y = Math.max(Number.isFinite(bottom) ? bottom + gapY : -Infinity, desired(n))
      positions.set(n.id, { ...size, x, y }); bottom = y + size.h
    }
    x += Math.max(...column.map((n) => sizeOf(n).w)) + gapX
  }
  const top = Math.min(0, ...[...positions.values()].map((p) => p.y))
  for (const p of positions.values()) p.y -= top
  return { positions, w: Math.max(0, x - gapX), h: Math.max(0, ...[...positions.values()].map((p) => p.y + p.h)) }
}

/**
 * A board laid out along its wires, so that every wire shows: the level's cards on the left in a column of their own,
 * then the parts a column a depth (a block of them one unit, laid out inside by alignedLayout), then the level's
 * cards on the right. Nothing stands between a card and what it feeds in the same row:
 *
 *   a unit stands one column right of the deepest unit feeding it; one nothing feeds (a constant) one column left of
 *     the first it feeds, beside its other feeders, not a board's width away
 *   down a column, each unit where its wires come in straight (the ports they leave and reach, as drawn), the units
 *     a gap apart; the cards on the left by the middle of what they feed, those on the right of what feeds them
 *   columns stand a `gutter` apart, room for a wire to bend in
 *   a wire from a card to one more than a column on passes the columns between: the cards there stand clear of
 *     where it runs, above it or below
 *
 * `width` and `height` are the board's as it is drawn. The columns go on to the right, or start again from the left
 * in a band below, whichever way the view shows the circuit largest when it fits the whole of it (a wide low board
 * takes a long row, a tall one more bands), and never wider than `most`.
 * The lane between the two columns of the level's cards is as wide as its content, and at least `lane` where the
 * board has the room.
 */
export function pipelineLayout(graph, blocks, { sizeOf, roleOf, portY = () => 48, width = 1100, height = Infinity, most = 1920, lane = 320, gapX = 24, gapY = 16, pad = 12, title = 28, head = 40 }) {
  const roots = graph.nodes.filter((n) => !n.in), byId = new Map(roots.map((n) => [n.id, n]))
  const owner = new Map(), units = []
  for (const block of blocks) {
    const nodes = block.nodes.map((id) => byId.get(id)).filter((n) => n && roleOf(n) === 'part' && !owner.has(n.id))
    if (!nodes.length) continue
    const unit = { id: `block:${block.id}`, block: block.id, view: block.view ?? 'ports', members: nodes }
    nodes.forEach((n) => owner.set(n.id, unit.id)); units.push(unit)
  }
  for (const n of roots.filter((n) => roleOf(n) === 'part' && !owner.has(n.id))) { units.push({ id: n.id, members: [n] }); owner.set(n.id, n.id) }
  for (const u of units) {
    u.inner = alignedLayout(u.members, graph.wires, { sizeOf, portY, gapX, gapY })
    u.w = u.view === 'hidden' ? HIDDEN_BLOCK_WIDTH : u.inner.w + (u.block ? pad * 2 : 0)
    u.h = u.view === 'hidden' ? head + pad : u.inner.h + (u.block ? head + pad * 2 : 0)
  }
  const links = graph.wires.flatMap((w) => {
    const from = owner.get(sourceId(w)), to = owner.get(w.to)
    return from && to && from !== to ? [{ from, to }] : []
  })
  // A column a depth; a unit nothing feeds, one left of the first it feeds.
  const depth = new Map()
  for (const u of layoutOrder(units, links)) depth.set(u.id, Math.max(0, ...links.filter((l) => l.to === u.id && depth.has(l.from)).map((l) => depth.get(l.from) + 1)))
  for (const u of units) {
    const fed = links.filter((l) => l.from === u.id).map((l) => depth.get(l.to))
    if (fed.length && !links.some((l) => l.to === u.id)) depth.set(u.id, Math.max(0, Math.min(...fed) - 1))
  }
  const columns = []
  for (const u of units) (columns[depth.get(u.id)] ??= []).push(u)
  const sources = roots.filter((n) => roleOf(n) === 'source'), sinks = roots.filter((n) => roleOf(n) === 'sink')
  const gutter = Math.max(gapX, 56)
  // With no input cards, their column is kept empty (as wide as the outputs'): the outputs stay on the right.
  const left = Math.max(0, ...(sources.length ? sources : sinks).map((n) => sizeOf(n).w)) + (sources.length || sinks.length ? gutter : gapX)
  const right = Math.max(0, ...sinks.map((n) => sizeOf(n).w)) + (sinks.length ? gutter : gapX)
  const widest = Math.max(...units.map((u) => u.w), 1)
  const rough = new Map()
  sources.reduce((y, n) => { rough.set(n.id, y); return y + sizeOf(n).h + gapY }, title)
  const inside = (u, id) => { const p = u.inner.positions.get(id); return { x: p.x + (u.block ? pad : 0), y: p.y + (u.block ? head + pad : 0) } }
  const out = (w) => portY(sourceId(w), srcKey(w.from), 'out')
  const into = (w) => portY(w.to, w.port, 'in')
  // Where a wire runs between two columns it does not touch: the heights it passes at, from the plan before (its
  // ends as they stood), as the canvas draws it (wires.js curve, level out of a card and level into one).
  const passing = (before, x0, x1) => (before ? graph.wires : []).flatMap((w) => {
    const [a, b] = [before.nodes.get(sourceId(w)), before.nodes.get(w.to)]
    if (!a || !b) return []
    const [ax, ay, bx, by] = [a.x + sizeOf(byId.get(sourceId(w))).w, a.y + out(w), b.x, b.y + into(w)]
    if (!(ax < x0 && bx > x1)) return []
    const k = Math.max(24, (bx - ax) / 2), ys = []
    for (let t = 0; t <= 1; t += 1 / 32) {
      const x = (1 - t) ** 3 * ax + 3 * (1 - t) ** 2 * t * (ax + k) + 3 * (1 - t) * t ** 2 * (bx - k) + t ** 3 * bx
      if (x >= x0 - gutter / 2 && x <= x1 + gutter / 2) ys.push((1 - t) ** 3 * ay + 3 * (1 - t) ** 2 * t * ay + 3 * (1 - t) * t ** 2 * by + t ** 3 * by)
    }
    return ys.length ? [[Math.min(...ys) - gapY, Math.max(...ys) + gapY]] : []
  })
  /** The first top at or under `y` where a card `h` tall stands clear of every wire passing (`bars`: [from, to]). */
  const clear = (y, h, bars) => {
    for (let tries = 0; tries < 40; tries++) {
      const bar = bars.find(([from, to]) => y < to && from < y + h)
      if (!bar) break
      y = bar[1]
    }
    return y
  }
  /** The parts laid out with their columns wrapping past `available`: { nodes, placed, span, bottom }. With a plan
   * `before`, the level's cards on the left stay where it put them and every part stands clear of the wires that
   * pass its column: a wire from a card already placed, taken to run level from it, and the wires of the plan before
   * as they ran. */
  const lay = (available, before) => {
    const nodes = new Map(before ? sources.map((n) => [n.id, before.nodes.get(n.id)]) : []), placed = [], barred = new Map()
    // A wire out of a card placed, to a card in a column further on: it leaves level.
    const leaving = (x0, column) => (before ? graph.wires : []).flatMap((w) => {
      const at = nodes.get(sourceId(w))
      if (!at || nodes.has(w.to) || column.some((u) => u.inner.positions.has(w.to)) || at.x + sizeOf(byId.get(sourceId(w))).w >= x0) return []
      return [[at.y + out(w) - gapY, at.y + out(w) + gapY]]
    })
    // The top a unit would take for the wires reaching it to run level, from what is placed (or, for the level's cards
    // on the left, where they stood before, or roughly down their column).
    const wanted = (u) => {
      const tops = graph.wires.flatMap((w) => {
        const src = sourceId(w)
        if (!u.inner.positions.has(w.to) || u.inner.positions.has(src)) return []
        const at = nodes.get(src)?.y ?? rough.get(src)
        return at === undefined ? [] : [at + out(w) - inside(u, w.to).y - into(w)]
      })
      return tops.length ? mean(tops) : null
    }
    let x = left, top = title, bottom = title
    for (const column of columns.filter(Boolean)) {
      const w = Math.max(...column.map((u) => u.w))
      if (x > left && x + w > left + available) { x = left; top = bottom + gapY + title }
      const bars = [...leaving(x, column), ...passing(before, x, x + w)]
      const tops = new Map(column.map((u) => [u.id, wanted(u)]))
      let y = top - gapY
      for (const u of [...column].sort((a, b) => (tops.get(a.id) ?? Infinity) - (tops.get(b.id) ?? Infinity))) {
        const at = { id: u.id, unit: u, x, y: clear(Math.max(y + gapY, top, tops.get(u.id) ?? top), u.h, bars), w: u.w, h: u.h }
        y = at.y + u.h
        placed.push(at); barred.set(u.id, bars)
        for (const id of u.inner.positions.keys()) nodes.set(id, { x: at.x + inside(u, id).x, y: at.y + inside(u, id).y })
      }
      bottom = Math.max(bottom, y)
      x += w + gutter
    }
    // A unit nothing feeds was stacked under its column: beside what it feeds instead, where that leaves it clear.
    for (const at of placed.filter((p) => !links.some((l) => l.to === p.id))) {
      const u = at.unit
      const fed = graph.wires.filter((w) => u.inner.positions.has(sourceId(w)) && nodes.has(w.to) && !u.inner.positions.has(w.to)).map((w) => nodes.get(w.to).y + into(w) - out(w))
      if (!fed.length) continue
      const y = Math.max(title, mean(fed))
      if (clear(y, at.h, barred.get(u.id)) !== y || placed.some((o) => o !== at && o.x === at.x && y < o.y + o.h + gapY && o.y < y + at.h + gapY)) continue
      for (const id of u.inner.positions.keys()) nodes.set(id, { ...nodes.get(id), y: nodes.get(id).y + y - at.y })
      at.y = y
    }
    const reach = Math.max(0, ...placed.map((p) => p.x + p.w - left))
    const span = Math.max(Math.min(Math.max(Math.min(width, most) - left - right, 1), lane), reach)
    // The level's cards: each by the middle of what it feeds (on the right, of what feeds it), as the wires meet
    // their ports; one wired to no part, under the rest.
    const middle = (n, sink) => {
      const ys = graph.wires.filter((w) => (sink ? w.to === n.id : sourceId(w) === n.id)).flatMap((w) => {
        const other = sink ? sourceId(w) : w.to
        if (!nodes.has(other) || roleOf(byId.get(other)) !== 'part') return []
        return [sink ? nodes.get(other).y + out(w) - into(w) : nodes.get(other).y + into(w) - out(w)]
      })
      return ys.length ? mean(ys) : Infinity
    }
    const ends = new Map()
    const stack = (list, at, sink) => { let low = title - gapY; for (const n of [...list].sort((a, b) => middle(a, sink) - middle(b, sink))) {
      const y = Math.max(low + gapY, Number.isFinite(middle(n, sink)) ? middle(n, sink) : title)
      ends.set(n.id, { x: at, y }); low = y + sizeOf(n).h
    } }
    if (!before) stack(sources, 0, false)
    stack(sinks, left + span + (sinks.length ? gutter : gapX), true)
    for (const [id, at] of ends) nodes.set(id, at)
    // From the top: making room for a wire only ever moves a card down.
    const up = Math.min(...[...nodes.values()].map((at) => at.y)) - title
    for (const at of [...nodes.values(), ...placed]) at.y -= up
    return { nodes, placed, span, bottom: Math.max(...[...nodes].map(([id, at]) => at.y + sizeOf(byId.get(id)).h)) }
  }
  // Laid out; then, the level's cards on the left kept where that put them, with each part clear of the wires that
  // pass its column; then once more against those wires as they came to run.
  const settled = (available) => [0, 1].reduce((plan) => lay(available, plan), lay(available, null))
  // Every width the columns could wrap at, up to the most: the one the board's view shows largest, a wider one of two
  // that show alike (fewer bands, fewer wires running back).
  const widths = columns.filter(Boolean).map((c) => Math.max(...c.map((u) => u.w)))
  const ends = widths.map((_, k) => widths.slice(0, k + 1).reduce((a, w) => a + w, 0) + k * gutter).filter((w) => w <= Math.max(most - left - right, widest))
  const shown = (plan) => Math.min(1, width / (left + plan.span + right), height / Math.max(plan.bottom, 1))
  const { nodes, placed, span } = (ends.length ? ends : [widest]).map(settled).reduce((best, plan) => (shown(plan) >= shown(best) ? plan : best))
  return { nodes, units: placed.map(({ unit: { id, block, view, members }, x, y, w, h }) => ({ id, block, view, nodes: members.map((n) => n.id), x, y, w, h })), width: left + span + right }
}

/** Bound each layout unit at its actual card positions, with the chrome of its displayed mode. */
export function layoutAt(plan, positions, sizeOf, { pad = 12, head = 40 } = {}) {
  const units = plan.units.map((unit) => {
    const cards = unit.nodes.filter((id) => positions.has(id)).map((id) => ({ ...positions.get(id), ...sizeOf(id) }))
    if (!cards.length) return unit
    const inset = unit.block ? pad : 0
    const x = Math.min(...cards.map((card) => card.x)) - inset
    const y = Math.min(...cards.map((card) => card.y)) - (unit.block ? head + inset : 0)
    if (unit.view === 'hidden') return { ...unit, x, y, w: HIDDEN_BLOCK_WIDTH, h: head + pad }
    const w = Math.max(...cards.map((card) => card.x + card.w)) - x + inset
    const h = Math.max(...cards.map((card) => card.y + card.h)) - y + inset
    return { ...unit, x, y, w, h }
  })
  return { ...plan, nodes: positions, units }
}

/** Keep the resized block at its anchor and clear overlaps using the units' on-screen positions. */
export function reflowLayout(plan, changed, gaps = { gapX: 24, gapY: 16 }) {
  const sizes = Object.fromEntries(plan.units.map((unit) => [unit.id, [unit.w, unit.h]]))
  const spaced = spaceNodes({ nodes: plan.units }, sizes, { ...gaps, moves: (unit) => !changed || unit.block !== changed })
  const nodes = new Map(plan.nodes)
  for (const [k, unit] of spaced.nodes.entries()) {
    const delta = unit.y - plan.units[k].y
    if (!delta) continue
    for (const id of unit.nodes) {
      const at = nodes.get(id)
      if (at) nodes.set(id, { x: at.x, y: at.y + delta })
    }
  }
  return { ...plan, nodes, units: spaced.nodes }
}

function sampleCurve(a,b) {
  const [x0,y0,x1,y1,x2,y2,x3,y3]=curve(a,b,'x',48).match(/-?\d+(?:\.\d+)?/g).map(Number)
  return Array.from({length:33},(_,k)=>{
    const t=k/32,u=1-t
    return [u*u*u*x0+3*u*u*t*x1+3*u*t*t*x2+t*t*t*x3,u*u*u*y0+3*u*u*t*y1+3*u*t*t*y2+t*t*t*y3]
  })
}

/** Geometry measurements use every wire, including connections displayed as labels. */
export function layoutMetrics(graph, plan, { sizeOf, portY = () => 48 }) {
  const byId = new Map(graph.nodes.map((n)=>[n.id,n]))
  const boxes = [...plan.nodes].map(([id,p])=>({...p,...sizeOf(byId.get(id))}))
  const routes = graph.wires.flatMap((w)=>{
    const a=plan.nodes.get(sourceId(w)),b=plan.nodes.get(w.to)
    if(!a||!b)return []
    return [sampleCurve([a.x+sizeOf(byId.get(sourceId(w))).w,a.y+portY(sourceId(w),srcKey(w.from),'out')],[b.x,b.y+portY(w.to,w.port,'in')])]
  })
  const lengths=routes.map((r)=>r.slice(1).reduce((sum,p,k)=>sum+Math.hypot(p[0]-r[k][0],p[1]-r[k][1]),0))
  let crossings=0
  const segments=routes.map((r)=>r.slice(1).map((p,k)=>[r[k],p]))
  for(let i=0;i<segments.length;i++)for(let j=i+1;j<segments.length;j++)for(const [a,b] of segments[i])for(const [c,d] of segments[j]) {
    const cross=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0])
    if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)crossings++
  }
  return {area:Math.round((Math.max(...boxes.map(p=>p.x+p.w))-Math.min(...boxes.map(p=>p.x)))*(Math.max(...boxes.map(p=>p.y+p.h))-Math.min(...boxes.map(p=>p.y)))),longest:Math.round(Math.max(0,...lengths)),crossings,total:Math.round(lengths.reduce((a,b)=>a+b,0))}
}

/**
 * Where the cards a blueprint brings to the desktop board go (text.js): by the flow of its wires, left to right, in
 * place of the next free cell a card dropped by hand takes. `fresh` are the cards to place (given x and y here);
 * the rest of `graph` stays where it is and is read: a card feeds from what stands left of it.
 *
 *   a column a depth: a card stands one column right of the deepest new card feeding it, and a card nothing new
 *     feeds (a constant, a card wired to the level's own) one column left of the first card it feeds
 *   down a column, each card as near as it can come to the middle of what feeds it (for a card fed by nothing, of
 *     what it feeds), the cards a row apart
 *   a card of the board that only takes from the new ones (the level's cards on the right) moves right where the
 *     columns reach it
 *
 * Cells are those of a card dropped by hand (model.js spotIn): the canvas spaces cards by what it measures after.
 */
export function flowSpots(graph, fresh, roleOf, { x0 = 240, y0 = 40, dx = 200, dy = 150 } = {}) {
  if (!fresh.length) return
  const mine = new Set(fresh.map((n) => n.id))
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  const { before: into, after: outOf } = indexEdges(wireEdges(graph.wires))
  const depth = columnDepths([...mine], into)
  // A card nothing new feeds stands just left of what it feeds, not a board's width away from it.
  for (const n of fresh) {
    const fed = outOf(n.id).filter((id) => mine.has(id)).map((id) => depth.get(id))
    if (!into(n.id).some((src) => mine.has(src)) && fed.length) depth.set(n.id, Math.max(0, Math.min(...fed) - 1))
  }
  const columns = []
  for (const n of fresh) (columns[depth.get(n.id)] ??= []).push(n)
  const middle = (ids) => { const ys = ids.map((id) => byId.get(id)).filter((n) => Number.isFinite(n?.y)).map((n) => n.y); return ys.length ? mean(ys) : null }
  // Twice down the columns: the first settles what is fed, the second brings each card fed by nothing beside what it feeds.
  for (const _round of [0, 1]) {
    for (const [d, column] of columns.entries()) {
      if (!column) continue
      const wanted = new Map(column.map((n, k) => [n.id, middle(into(n.id)) ?? middle(outOf(n.id)) ?? y0 + k * dy]))
      let y = -Infinity
      for (const n of [...column].sort((a, b) => wanted.get(a.id) - wanted.get(b.id))) {
        y = Math.max(y0, y + dy, Math.round(wanted.get(n.id) / 10) * 10)
        Object.assign(n, { x: x0 + d * dx, y })
      }
    }
  }
  // Move outputs before reserving the space taken by the cards already on the board.
  const rest = graph.nodes.filter((n) => !mine.has(n.id) && !n.in && Number.isFinite(n.x))
  const reach = x0 + columns.length * dx
  for (const n of rest) {
    if (roleOf(n) === 'sink' && n.x < reach && n.x > x0 && into(n.id).some((src) => mine.has(src))) n.x = reach
  }
  const sizes = Object.fromEntries([...rest, ...fresh].map(({ id }) => [id, [dx - 30, dy - 40]]))
  const clear = spaceNodes(graph, sizes, { gapX: 0, gapY: 0, moves: (node) => mine.has(node.id) })
  for (const node of clear.nodes) {
    if (mine.has(node.id)) byId.get(node.id).y = node.y
  }
}
