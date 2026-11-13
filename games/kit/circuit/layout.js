import { curve } from '../wires.js'
// Data-flow columns shared by compact circuit placement and headless SVGs. Cycles keep a
// finite depth; sources outside the supplied nodes do not add a column.
export function flowLayout(nodes, wires, { sizeOf, gapX = 44, gapY = 14 } = {}) {
  const ids = new Set(nodes.map((n) => n.id))
  const depth = new Map()
  const depthOf = (id, seen = new Set()) => {
    if (depth.has(id)) return depth.get(id)
    if (seen.has(id)) return 0
    seen.add(id)
    const inputs = wires.filter((w) => w.to === id).map((w) => w.from.split('#')[0]).filter((src) => ids.has(src))
    const d = inputs.length ? 1 + Math.max(...inputs.map((src) => depthOf(src, seen))) : 0
    depth.set(id, d)
    return d
  }
  const columns = []
  for (const node of nodes) (columns[depthOf(node.id)] ??= []).push(node)
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


const sourceId = (wire) => wire.from.split('#')[0]
const mean = (values) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0

/** Stable dependency order, including the cycles formed by grouping a larger acyclic circuit. */
export function dependencyOrder(nodes, wires) {
  const pending = new Map(nodes.map((n) => [n.id, n]))
  const result = []
  while (pending.size) {
    const ready = [...pending.values()].filter((n) => wires.every((w) => w.to !== n.id || !pending.has(sourceId(w))))
    for (const n of ready.length ? ready : [pending.values().next().value]) { result.push(n); pending.delete(n.id) }
  }
  return result
}

/** Dependency columns use upstream barycentres and actual port offsets instead of card centres. */
export function alignedLayout(nodes, wires, { sizeOf, portY = () => 48, gapX = 24, gapY = 16 }) {
  const own = new Set(nodes.map((n) => n.id)), positions = new Map(), depths = new Map()
  const ordered = dependencyOrder(nodes, wires)
  for (const n of ordered) depths.set(n.id, Math.max(0, ...wires.filter((w) => w.to === n.id && own.has(sourceId(w))).map((w) => (depths.get(sourceId(w)) ?? -1) + 1)))
  const columns = new Map()
  for (const n of ordered) { const d = depths.get(n.id); columns.set(d, [...(columns.get(d) ?? []), n]) }
  let x = 0
  for (const column of columns.values()) {
    const desired = (n) => mean(wires.filter((w) => w.to === n.id && positions.has(sourceId(w))).map((w) => positions.get(sourceId(w)).y + portY(sourceId(w), w.from.split('#')[1] ?? null, 'out') - portY(n.id, w.port, 'in')))
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
export function pipelineLayout(graph, blocks, { sizeOf, roleOf, portY = () => 48, width = 1100, height = Infinity, most = 1920, lane = 320, gapX = 24, gapY = 16, pad = 12, title = 28 }) {
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
    u.w = u.view === 'hidden' ? 320 : u.inner.w + (u.block ? pad * 2 : 0)
    u.h = u.view === 'hidden' ? 40 : u.inner.h + (u.block ? title + pad * 2 : 0)
  }
  const links = graph.wires.flatMap((w) => {
    const from = owner.get(sourceId(w)), to = owner.get(w.to)
    return from && to && from !== to ? [{ from, to }] : []
  })
  // A column a depth; a unit nothing feeds, one left of the first it feeds.
  const depth = new Map()
  for (const u of dependencyOrder(units, links)) depth.set(u.id, Math.max(0, ...links.filter((l) => l.to === u.id && depth.has(l.from)).map((l) => depth.get(l.from) + 1)))
  for (const u of units) {
    const fed = links.filter((l) => l.from === u.id).map((l) => depth.get(l.to))
    if (fed.length && !links.some((l) => l.to === u.id)) depth.set(u.id, Math.max(0, Math.min(...fed) - 1))
  }
  const columns = []
  for (const u of units) (columns[depth.get(u.id)] ??= []).push(u)
  const sources = roots.filter((n) => roleOf(n) === 'source'), sinks = roots.filter((n) => roleOf(n) === 'sink')
  const gutter = Math.max(gapX, 56)
  const left = Math.max(0, ...sources.map((n) => sizeOf(n).w)) + (sources.length ? gutter : gapX)
  const right = Math.max(0, ...sinks.map((n) => sizeOf(n).w)) + (sinks.length ? gutter : gapX)
  const widest = Math.max(...units.map((u) => u.w), 1)
  const rough = new Map()
  sources.reduce((y, n) => { rough.set(n.id, y); return y + sizeOf(n).h + gapY }, title)
  const inside = (u, id) => { const p = u.inner.positions.get(id); return { x: p.x + (u.block ? pad : 0), y: p.y + (u.block ? title + pad : 0) } }
  const out = (w) => portY(sourceId(w), w.from.split('#')[1] ?? null, 'out')
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

export function reflowLayout(before, after, changed, { gapX = 24, gapY = 16 } = {}) {
  const nodes = new Map(before.nodes), units = before.units.map((u) => ({...u}))
  const at = units.findIndex((u) => u.block === changed)
  if (at < 0) return after
  const old = units[at], next = after.units.find((u) => u.id === old.id)
  if (!next) return after
  units[at] = {...old,w:next.w,h:next.h,view:next.view}
  for (let k = at + 1; k < units.length; k++) {
    const u = units[k], prior = {...u}
    if (u.x >= old.x + old.w - 1 && Math.abs(u.y-old.y)<old.h) u.x += next.w-old.w
    if (u.y >= old.y + old.h - 1) u.y += next.h-old.h
    for (const p of units.slice(0,k)) if (u.x<p.x+p.w+gapX && u.x+u.w+gapX>p.x && u.y<p.y+p.h+gapY && u.y+u.h+gapY>p.y) u.y=p.y+p.h+gapY
    for (const id of u.nodes) if (nodes.has(id)) { const p=nodes.get(id);nodes.set(id,{x:p.x+u.x-prior.x,y:p.y+u.y-prior.y}) }
  }
  return {...before,nodes,units}
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
    return [sampleCurve([a.x+sizeOf(byId.get(sourceId(w))).w,a.y+portY(sourceId(w),w.from.split('#')[1]??null,'out')],[b.x,b.y+portY(w.to,w.port,'in')])]
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
export function flowSpots(graph, fresh, { x0 = 240, y0 = 40, dx = 200, dy = 150 } = {}) {
  if (!fresh.length) return
  const mine = new Set(fresh.map((n) => n.id))
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  const into = (id) => graph.wires.filter((w) => w.to === id).map(sourceId)
  const outOf = (id) => graph.wires.filter((w) => sourceId(w) === id).map((w) => w.to)
  const depth = new Map()
  const depthOf = (id, seen = new Set()) => {
    if (depth.has(id)) return depth.get(id)
    if (seen.has(id)) return 0
    seen.add(id)
    const d = Math.max(0, ...into(id).filter((src) => mine.has(src)).map((src) => depthOf(src, seen) + 1))
    depth.set(id, d)
    return d
  }
  for (const n of fresh) depthOf(n.id)
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
  // Clear of a card that was there before, a row down at a time.
  const rest = graph.nodes.filter((n) => !mine.has(n.id) && !n.in && Number.isFinite(n.x))
  for (const n of fresh) while (rest.some((o) => Math.abs(o.x - n.x) < dx - 30 && Math.abs(o.y - n.y) < dy - 40)) n.y += dy
  const reach = x0 + columns.length * dx
  for (const n of rest) if (n.x < reach && n.x > x0 && into(n.id).some((src) => mine.has(src)) && !outOf(n.id).length) n.x = reach
}
