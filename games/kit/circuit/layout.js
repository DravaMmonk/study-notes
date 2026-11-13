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
 * Blocks and ungrouped parts flow like a paragraph; independent branches share a column. The lane between the
 * source and sink columns is as wide as its content, and at most `lane` when the content needs less. `width` is the board's
 * as it is drawn and `fit` the smallest zoom its view fits a circuit at: a row wraps where the board could no longer
 * show it whole.
 */
export function pipelineLayout(graph, blocks, { sizeOf, roleOf, portY, width = 1100, fit = 1, lane = 320, gapX = 24, gapY = 16, pad = 12, title = 28 }) {
  const roots = graph.nodes.filter((n) => !n.in), byId = new Map(roots.map((n) => [n.id, n]))
  const owner = new Map(), units = []
  for (const block of blocks) {
    const nodes = block.nodes.map((id) => byId.get(id)).filter((n) => n && roleOf(n) === 'part' && !owner.has(n.id))
    if (!nodes.length) continue
    const unit = { id: `block:${block.id}`, block: block.id, view: block.view ?? 'ports', members: nodes }
    nodes.forEach((n) => owner.set(n.id, unit.id)); units.push(unit)
  }
  for (const n of roots.filter((n) => roleOf(n) === 'part' && !owner.has(n.id))) { units.push({ id: n.id, members: [n] }); owner.set(n.id, n.id) }
  // A private zero-input value follows its only consumer, without changing block membership.
  const attached = new Set()
  for (const unit of units.filter((u) => !u.block)) {
    const n = unit.members[0], targets = [...new Set(graph.wires.filter((w) => sourceId(w) === n.id).map((w) => w.to))]
    if (graph.wires.some((w) => w.to === n.id) || targets.length !== 1) continue
    const target = units.find((u) => u.id === owner.get(targets[0]))
    if (target && target !== unit) { target.members.unshift(n); owner.set(n.id, target.id); attached.add(unit.id) }
  }
  for (const n of roots.filter((n) => roleOf(n) === 'source')) {
    const targets = [...new Set(graph.wires.filter((w) => sourceId(w) === n.id).map((w) => w.to))]
    const target = targets.length === 1 && units.find((u) => u.id === owner.get(targets[0]))
    if (target) { target.members.unshift(n); owner.set(n.id, target.id) }
  }
  const working = units.filter((u) => !attached.has(u.id))
  for (const u of working) {
    u.inner = alignedLayout(u.members, graph.wires, { sizeOf, portY, gapX, gapY })
    u.w = u.view === 'hidden' ? 320 : u.inner.w + (u.block ? pad * 2 : 0)
    u.h = u.view === 'hidden' ? 40 : u.inner.h + (u.block ? title + pad * 2 : 0)
  }
  const links = graph.wires.flatMap((w) => {
    const from = owner.get(sourceId(w)), to = owner.get(w.to)
    return from && to && from !== to ? [{ from, to }] : []
  })
  const sources = roots.filter((n) => roleOf(n) === 'source' && !owner.has(n.id)), sinks = roots.filter((n) => roleOf(n) === 'sink')
  const left = Math.max(0, ...sources.map((n) => sizeOf(n).w)) + gapX
  const right = Math.max(0, ...sinks.map((n) => sizeOf(n).w)) + gapX
  // A row runs as far as the board can still show whole (the view fits a board by zooming out, to `fit` at the
  // least): a unit goes to a row below, back at the left with its wire running against the flow, only past that.
  const available = Math.max(width / fit - left - right, ...working.map((u) => u.w), 1)
  const ordered = dependencyOrder(working, links)
  const nodes = new Map(), placed = [], column = []
  let x = left, y = title, rowY = title, rowBottom = title
  for (const u of ordered) {
    const previous = column.at(-1)
    const independent = previous && !links.some((w) => (w.to === u.id && column.some((c) => c.id === w.from)) || (w.from === u.id && column.some((c) => c.id === w.to)))
    if (previous && !independent) { x += Math.max(...column.map((c) => c.w)) + gapX; y = rowY; column.length = 0 }
    if (x + u.w > left + available) { x = left; rowY = rowBottom + gapY + title; y = rowY; column.length = 0 }
    if (independent && column.length) y = previous.y + previous.h + gapY
    u.x = x; u.y = Math.max(y, column.length ? y : placed.filter((p) => p.x === x && p.y >= y).reduce((v, p) => Math.max(v, p.y + p.h + gapY), y))
    placed.push(u); column.push(u)
    rowBottom = Math.max(rowBottom, u.y + u.h)
    for (const [id, p] of u.inner.positions) nodes.set(id, { x: u.x + p.x + (u.block ? pad : 0), y: u.y + p.y + (u.block ? title + pad : 0) })
  }
  const stack = (list, at, sink) => { let bottom = title-gapY; for (const n of list) {
    const linked = graph.wires.filter((w) => sink ? w.to === n.id : sourceId(w) === n.id).map((w) => nodes.get(sink ? sourceId(w) : w.to)).filter(Boolean)
    const y = Math.max(bottom+gapY,linked.length?mean(linked.map(p=>p.y)):title)
    nodes.set(n.id,{x:at,y});bottom=y+sizeOf(n).h
  } }
  const span = Math.max(Math.min(available, lane), ...placed.map((u) => u.x + u.w - left))
  stack(sources, 0, false); stack(sinks, left + span + gapX, true)
  return { nodes, units: placed.map(({id,block,view,members,x,y,w,h}) => ({id,block,view,nodes:members.map((n)=>n.id),x,y,w,h})), width: left + span + right }
}

/** A mode change holds its block anchor and only makes temporary room for following units. */
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
