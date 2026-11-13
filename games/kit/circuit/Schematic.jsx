import { useLayoutEffect, useMemo, useRef } from 'react'
import { L } from '../shell/i18n.js'
import Glyph from './Glyph.jsx'
import { schematic } from './schematic.js'
import { inPort, outPort, outputsOf, srcNode, srcOf } from './model.js'

// A board to read, the same on a desktop and a phone: small chips in rows from top to bottom (schematic.js), each a
// part's name over what it holds, thin wires between their edges. Nothing on it is edited: no ports to press, no
// slots, no tools. A frame is a box around its regions, each a board of its own.

// Where an element sits in `root`, by its offsets: a window still animating in does not skew it.
function spot(el, root) {
  let [x, y] = [0, 0]
  for (let at = el; at && at !== root; at = at.offsetParent) {
    x += at.offsetLeft
    y += at.offsetTop
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight }
}

// A part's settings as one line: their values alone, in the order the part lists them.
const settingsOf = (node) => Object.values(node.params ?? {}).filter((v) => ['string', 'number'].includes(typeof v) && v !== '').join(' · ')

const f = (n) => n.toFixed(1)
// Between two points one above the other: leaving and arriving straight down.
const fall = ([ax, ay], [bx, by]) => `C${f(ax)},${f((ay + by) / 2)} ${f(bx)},${f((ay + by) / 2)} ${f(bx)},${f(by)}`
// A wire that climbs (a loop) swings out to the side of the chips it joins.
const climb = ([ax, ay], [bx, by]) => {
  const side = (bx >= ax ? 1 : -1) * 44
  return `C${f(ax + side)},${f(ay + 28)} ${f(bx + side)},${f(by - 28)} ${f(bx)},${f(by)}`
}

function draw(root, graph, parts, paths) {
  const svg = root.querySelector(':scope > .sk-wires')
  const find = (attr, value) => root.querySelector(`[${attr}="${CSS.escape(value)}"]`)
  const family = (id) => parts.family(graph.nodes.find((n) => n.id === id) ?? {})
  let markup = ''
  for (const { wire, vias, back } of paths) {
    const [from, to] = [find('data-p', outPort(wire.from)), find('data-p', inPort(wire.to, wire.port))]
    if (!from || !to) continue
    const [a, b] = [spot(from, root), spot(to, root)]
    let last = [a.x, a.y]
    let d = `M${f(a.x)},${f(a.y)}`
    for (const via of back ? [] : vias) {
      const el = find('data-via', via)
      if (!el) continue
      const v = spot(el, root)
      d += `${fall(last, [v.x + v.w / 2, v.y])} V${f(v.y + v.h)}`
      last = [v.x + v.w / 2, v.y + v.h]
    }
    d += (back ? climb : fall)(last, [b.x, b.y])
    const style = Object.entries(parts.wireStyle?.(wire, graph) ?? {}).map(([k, v]) => `${k}:${v}`).join(';')
    const kind = parts.wireKind ? ` kind-${parts.wireKind(wire, graph)}` : ''
    markup += `<path class="pb-wire${kind}" data-family="${family(srcNode(wire.from))}" style="${style}" d="${d}"/>`
  }
  svg.setAttribute('width', root.offsetWidth)
  svg.setAttribute('height', root.offsetHeight)
  svg.innerHTML = markup
}

/**
 * @param graph, parts              the circuit and the game's description of its nodes (model.js)
 * @param value(node)               what a part holds (nothing: the chip is its name alone)
 * @param param(node)               a line under its name; without it, the part's settings (node.params) as they are
 * @param outNote(node, key)        what each of several outputs carries
 * @param regionNote, resultNote    (node, region) in a frame's region: what it opens, and what the frame gives
 * @param lit                       the id of the part the current step is in
 * @param onOpen(id)                for a packed part (parts.packed): pressed, it opens the board inside it
 */
export default function Schematic({ graph, parts, value, param, outNote, regionNote, resultNote, lit = null, onOpen }) {
  const root = useRef(null)
  const made = useMemo(() => schematic(graph, parts), [graph, parts])
  useLayoutEffect(() => {
    const el = root.current
    const paint = () => draw(el, graph, parts, made.paths)
    paint()
    const observer = new ResizeObserver(paint)
    observer.observe(el)
    return () => observer.disconnect()
  })

  const byId = (id) => graph.nodes.find((n) => n.id === id)
  const regionsOf = (node) => parts.frames?.(node) ?? []
  const anchor = (p) => <i className="sk-pin" data-p={p} />
  const icon = (node) => {
    const i = parts.icon?.(node)
    return i ? <i className={`pb-glyph ${parts.packed?.(node) ? 'family-chip' : ''}`}><Glyph icon={i} size={11} strokeWidth={2} /></i> : null
  }
  // Inputs along the top edge in the part's own order, named only where the game names them.
  const ins = (node) => {
    const own = new Set(regionsOf(node).map((r) => r.name))
    const ports = parts.inputs(node).filter((p) => !own.has(p))
    if (!ports.length) return null
    const named = ports.length > 1 && ports.some((p) => parts.portLabel?.(node, p))
    return <span className={`sk-ins ${named ? 'is-named' : ''}`}>{ports.map((p) => <span key={p}>{anchor(inPort(node.id, p))}{named && L(parts.portLabel?.(node, p) ?? '')}</span>)}</span>
  }
  // Outputs along the bottom edge: one in the middle, or each under its name and what it carries.
  const outs = (node) => {
    const own = new Set(regionsOf(node).map((r) => r.name))
    const list = outputsOf(parts, node).filter((o) => !own.has(o.key))
    if (parts.role(node) === 'sink' || !list.length) return null
    if (list.length === 1 && list[0].key === null) return <span className="sk-outs">{anchor(outPort(node.id))}</span>
    return (
      <span className="sk-outs is-named">
        {list.map((o) => (
          <span key={o.key}>
            {o.glyph ? <em dangerouslySetInnerHTML={{ __html: o.glyph }} /> : <em>{L(o.short ?? o.label)}</em>}
            {outNote?.(node, o.key)}
            {anchor(outPort(srcOf(node, o.key)))}
          </span>
        ))}
      </span>
    )
  }
  const face = (node) => ({
    'data-piece': node.id,
    'data-family': parts.family(node),
    style: parts.cardStyle?.(node),
    ...(onOpen && parts.packed?.(node) ? { role: 'button', tabIndex: 0, onClick: () => onOpen(node.id) } : {}),
  })
  const name = (node) => <span className="sk-name">{icon(node)}{L(parts.label(node))}</span>

  function chip(node) {
    const role = parts.role(node)
    if (role !== 'part') return <div key={node.id} className={`sk-end ${role === 'sink' ? 'is-out' : ''}`} {...face(node)}>{ins(node)}{name(node)}{outs(node)}</div>
    const [held, setting] = [value?.(node), param ? param(node) : settingsOf(node)]
    return (
      <div key={node.id} className={`sk-chip ${parts.packed?.(node) ? 'is-packed' : ''} ${node.id === lit ? 'is-step' : ''}`} {...face(node)}>
        {ins(node)}
        {name(node)}
        {setting && <span className="pb-param">{setting}</span>}
        {held && <span className="pb-thumb sk-value">{held}</span>}
        {outs(node)}
      </div>
    )
  }

  function frame(node) {
    return (
      <div key={node.id} className={`sk-frame ${node.id === lit ? 'is-step' : ''}`} {...face(node)}>
        {ins(node)}
        {name(node)}
        {regionsOf(node).map((r) => (
          <section key={r.name} className="sk-region">
            <header>
              {regionsOf(node).length > 1 && <b>{L(r.label)}</b>}
              {r.opens && <em>{L(outputsOf(parts, node).find((o) => o.key === r.name)?.label ?? '')}</em>}
              {regionNote?.(node, r.name)}
              {r.opens && anchor(outPort(srcOf(node, r.name)))}
            </header>
            {rows(`${node.id}/${r.name}`)}
            <footer>
              {anchor(inPort(node.id, r.name))}
              <em>{L(parts.portLabel?.(node, r.name) ?? '')}</em>
              {resultNote?.(node, r.name)}
            </footer>
          </section>
        ))}
        {outs(node)}
      </div>
    )
  }

  function rows(scope) {
    return (
      <div className="sk-rows">
        {made.rows(scope).map((row, k) => (
          <div key={k} className="sk-row">
            {row.map((item) => {
              if (item.via) return <i key={item.via} className="sk-via" data-via={item.via} />
              const node = byId(item.id)
              return regionsOf(node).length ? frame(node) : chip(node)
            })}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="sk-board" ref={root}>
      {rows(null)}
      <svg className="sk-wires" aria-hidden="true" />
    </div>
  )
}
