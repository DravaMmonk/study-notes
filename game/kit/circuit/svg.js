import { parse } from './text.js'

// A board drawn without a browser or React: its blueprint text (text.js) as one SVG string, for whoever cannot run
// the editors (the MCP's render, the studio's previews). It draws what the text says and nothing a game alone
// knows: every part a box with its type, name and settings, each in a column after what it reads; a frame's regions
// boxes inside it, laid out the same way; the nodes the level gives (named, never declared) at the edges: those read
// from on the left, those wired into on the right. A named port is written at its pin, and an output key on its wire.
//
// The colours are the kit's tokens (../tokens.css) where the SVG sits in a page that has them, with the paper
// theme's values otherwise.

const W = { char: 6.4, pad: 10, min: 76, line: 14, head: 18, gapX: 44, gapY: 14, region: 16, margin: 16 }
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const clip = (s, n = 34) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)
const show = (v) => (typeof v === 'string' ? v : JSON.stringify(v))
const nodeOf = (from) => from.split('#')[0]
const keyOf = (from) => from.split('#')[1] ?? null

const STYLE = `.bp-node{fill:var(--paper,#fbfaf6);stroke:var(--rule,#bfb9ac)}.bp-given{fill:var(--canvas,#f3f1eb);stroke:var(--rule,#bfb9ac);stroke-dasharray:3 3}
.bp-frame{fill:none;stroke:var(--rule,#bfb9ac)}.bp-region{fill:var(--hover,rgba(45,43,38,.04));stroke:var(--line,#dedbd1)}
.bp-wire{fill:none;stroke:var(--muted,#7a7970);stroke-width:1.4}.bp-pin{fill:var(--paper,#fbfaf6);stroke:var(--muted,#7a7970)}
.bp-type{fill:var(--ink,#282824);font:600 12px var(--mono,ui-monospace,monospace)}.bp-name,.bp-port,.bp-key,.bp-label{fill:var(--muted,#7a7970);font:10.5px var(--mono,ui-monospace,monospace)}
.bp-title{fill:var(--ink,#282824);font:600 12px var(--sans,sans-serif)}`

/**
 * The board `lines` (blueprint text, a string or one string a line) as SVG. title: a line above it. Throws what
 * text.js parse throws ({ line, zh, en }) on text it cannot read.
 */
export function boardSvg(lines, { title = null } = {}) {
  const { statements, wires } = parse(Array.isArray(lines) ? lines.join('\n') : lines)
  const declared = new Map(statements.map((s) => [s.id, s]))
  const reads = (id) => wires.filter((w) => w.to === id)
  // The level's own nodes: those read from go on the left, the others (only wired into) on the right.
  const given = [...new Set(wires.flatMap((w) => [nodeOf(w.from), w.to]))].filter((id) => !declared.has(id))
  const sources = given.filter((id) => wires.some((w) => nodeOf(w.from) === id))
  const sinks = given.filter((id) => !sources.includes(id))

  // Pins: a node's plain inputs by position, then its named ports in the order they are first written.
  const pins = new Map()
  const pinOf = (id, port) => {
    if (!pins.has(id)) pins.set(id, [])
    const list = pins.get(id)
    const key = typeof port === 'number' ? `#${port}` : port
    if (!list.includes(key)) list.push(key)
    return list
  }
  const scopes = new Set(statements.map((s) => s.in).filter(Boolean))
  for (const w of wires) if (!scopes.has(`${w.to}/${w.port}`)) pinOf(w.to, w.port)
  const rank = (p) => (p[0] === '#' ? Number(p.slice(1)) : Infinity)
  for (const list of pins.values()) list.sort((a, b) => (rank(a) === rank(b) ? 0 : rank(a) - rank(b)))
  const pinCount = (id) => pins.get(id)?.length ?? 0

  const box = new Map() // id → { w, h, x, y } relative to its scope, then absolute
  const regionBox = new Map() // `${id}/${region}` → { x, y, w, h }
  const labelOf = (s) => {
    const settings = Object.entries(s.settings).map(([k, v]) => `${k}=${show(v)}`).join(' ')
    return { type: s.type ?? s.id, sub: clip([s.type ? s.id : null, settings].filter(Boolean).join(' · ')) }
  }
  const textWidth = (...texts) => Math.max(W.min, ...texts.map((t) => t.length * W.char + 2 * W.pad))

  // A scope's statements in columns, each after what it reads within the scope; returns its size.
  const layScope = (scope) => {
    const own = statements.filter((s) => s.in === scope)
    const depth = new Map()
    const depthOf = (id, seen = new Set()) => {
      if (depth.has(id)) return depth.get(id)
      if (seen.has(id)) return 0
      seen.add(id)
      const inScope = reads(id).map((w) => nodeOf(w.from)).filter((src) => declared.get(src)?.in === scope)
      const d = inScope.length ? 1 + Math.max(...inScope.map((src) => depthOf(src, seen))) : 0
      depth.set(id, d)
      return d
    }
    const columns = []
    for (const s of own) (columns[depthOf(s.id)] ??= []).push(s)
    let x = 0
    let height = 0
    for (const column of columns.filter(Boolean)) {
      let y = 0
      let width = 0
      for (const s of column) {
        const size = sizeOf(s)
        box.set(s.id, { ...size, x, y })
        y += size.h + W.gapY
        width = Math.max(width, size.w)
      }
      height = Math.max(height, y - W.gapY)
      x += width + W.gapX
    }
    return { w: Math.max(0, x - W.gapX), h: height }
  }
  const sizeOf = (s) => {
    const { type, sub } = labelOf(s)
    const ports = pinCount(s.id)
    const base = { w: textWidth(type, sub, ...(pins.get(s.id) ?? []).map((p) => `${p}  `)), h: W.head + W.line + Math.max(0, ports - 1) * W.line + W.pad }
    const regions = [...new Set(statements.filter((x) => x.in?.startsWith(`${s.id}/`)).map((x) => x.in))]
    if (!regions.length) return base
    let y = base.h
    let w = base.w
    for (const scope of regions) {
      const inner = layScope(scope)
      regionBox.set(scope, { x: W.pad, y, w: inner.w + 2 * W.pad, h: inner.h + W.region + W.pad })
      y += inner.h + W.region + W.pad + W.gapY / 2
      w = Math.max(w, inner.w + 4 * W.pad)
    }
    for (const r of regions) regionBox.get(r).w = w - 2 * W.pad
    return { w, h: y + W.pad / 2, frame: regions }
  }

  const givenBox = (id) => ({ w: textWidth(id), h: W.head + Math.max(0, pinCount(id) - 1) * W.line + W.pad })
  const top = layScope(null)
  const left = sources.map((id) => ({ id, ...givenBox(id) }))
  const right = sinks.map((id) => ({ id, ...givenBox(id) }))
  const colW = (list) => (list.length ? Math.max(...list.map((b) => b.w)) + W.gapX : 0)
  const offX = W.margin + colW(left)
  const offY = W.margin + (title ? 22 : 0)
  const stack = (list, x) => {
    let y = offY
    for (const b of list) {
      box.set(b.id, { w: b.w, h: b.h, x, y, given: true })
      y += b.h + W.gapY
    }
    return y - W.gapY
  }
  // Absolute places: the top scope at the offset, a frame's regions inside it, recursively.
  const place = (scope, dx, dy) => {
    for (const s of statements.filter((x) => x.in === scope)) {
      const b = box.get(s.id)
      b.x += dx
      b.y += dy
      for (const r of b.frame ?? []) {
        const rb = regionBox.get(r)
        rb.x += b.x
        rb.y += b.y
        place(r, rb.x + W.pad, rb.y + W.region)
      }
    }
  }
  place(null, offX, offY)
  const leftH = stack(left, W.margin)
  const rightH = stack(right, offX + top.w + (top.w ? W.gapX : 0))
  const width = offX + top.w + (right.length ? W.gapX + colW(right) - W.gapX : 0) + W.margin
  const height = Math.max(offY + top.h, leftH, rightH) + W.margin

  const pinY = (id, port) => {
    const b = box.get(id)
    const list = pins.get(id) ?? []
    const k = Math.max(0, list.indexOf(typeof port === 'number' ? `#${port}` : port))
    return b.y + W.head + 2 + k * W.line
  }
  const out = []
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" class="blueprint-svg" viewBox="0 0 ${Math.ceil(width)} ${Math.ceil(height)}" width="${Math.ceil(width)}" height="${Math.ceil(height)}"><style>${STYLE}</style>`)
  if (title) out.push(`<text class="bp-title" x="${W.margin}" y="${W.margin + 8}">${esc(title)}</text>`)
  // Frames and their regions first, under everything.
  for (const s of statements) {
    const b = box.get(s.id)
    for (const r of b.frame ?? []) {
      const rb = regionBox.get(r)
      out.push(`<rect class="bp-region" x="${rb.x}" y="${rb.y}" width="${rb.w}" height="${rb.h}" rx="5"/><text class="bp-label" x="${rb.x + 6}" y="${rb.y + 11}">${esc(r.split('/')[1])}</text>`)
    }
  }
  for (const w of wires) {
    const from = box.get(nodeOf(w.from))
    const to = box.get(w.to)
    const key = keyOf(w.from)
    const region = key && regionBox.get(`${nodeOf(w.from)}/${key}`)
    // A region's value comes from the region's own left edge; any other from the node's right.
    const [x1, y1] = region ? [region.x + 4, region.y + 6] : [from.x + from.w, from.y + W.head - 4]
    // What a region makes goes into the frame at the region's right edge.
    const into = regionBox.get(`${w.to}/${w.port}`)
    const [x2, y2] = into ? [into.x + into.w - 4, into.y + 6] : [to.x, pinY(w.to, w.port)]
    const bend = Math.max(24, Math.abs(x2 - x1) / 2)
    out.push(`<path class="bp-wire" d="M${x1} ${y1} C${x1 + bend} ${y1} ${x2 - bend} ${y2} ${x2} ${y2}"/>`)
    if (key && !region) out.push(`<text class="bp-key" x="${x2 - 6}" y="${y2 - 4}" text-anchor="end">${esc(key)}</text>`)
  }
  for (const [id, b] of box) {
    const s = declared.get(id)
    const cls = b.given ? 'bp-given' : b.frame ? 'bp-frame' : 'bp-node'
    out.push(`<g data-node="${esc(id)}"><rect class="${cls}" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="6"/>`)
    if (s) {
      const { type, sub } = labelOf(s)
      out.push(`<text class="bp-type" x="${b.x + W.pad}" y="${b.y + 15}">${esc(type)}</text>`)
      if (sub) out.push(`<text class="bp-name" x="${b.x + W.pad}" y="${b.y + 15 + W.line}">${esc(sub)}</text>`)
    } else out.push(`<text class="bp-type" x="${b.x + W.pad}" y="${b.y + 15}">${esc(id)}</text>`)
    for (const p of pins.get(id) ?? []) {
      const y = pinY(id, p[0] === '#' ? Number(p.slice(1)) : p)
      out.push(`<circle class="bp-pin" cx="${b.x}" cy="${y}" r="3"/>`)
      if (p[0] !== '#') out.push(`<text class="bp-port" x="${b.x + b.w - W.pad}" y="${y + 3}" text-anchor="end">${esc(p)}</text>`)
    }
    if (!sinks.includes(id)) out.push(`<circle class="bp-pin" cx="${b.x + b.w}" cy="${b.y + W.head - 4}" r="3"/>`)
    out.push('</g>')
  }
  out.push('</svg>')
  return out.join('')
}
