import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Maximize, Minus, Plus, Redo2, Trash2, Undo2, X } from 'lucide-react'
import { enableDrag } from '../drag.js'
import { curve as kitCurve, pointIn } from '../wires.js'
import { L, tr } from '../shell/i18n.js'
import Glyph from './Glyph.jsx'
import { moveInto } from './frames.js'
import { baseRefusal, connect, ends, inPort, outPort, outputsOf, parsePort, removeNode, removeWire, srcNode, srcOf } from './model.js'
import { useHistory } from './useHistory.js'

// The desktop circuit board, the same in every game: parts are cards, wires run from a card's output (a dot on its
// right) to another card's input (a dot on its left). Drag a card by its header to move it; drag from an output dot
// to an input dot, or onto a card, to wire it, or click one dot and then another (or the card), as on the phone;
// click a card or a wire to select it and press Delete (or the × on a card) to remove it. Drag the background to pan, pinch or ⌘/Ctrl-scroll to zoom, and the corner buttons zoom or fit;
// every edit can be undone and redone there too, or with ⌘/Ctrl-Z, ⇧⌘/Ctrl-Z and Ctrl-Y. A wire the game refuses
// (parts.refuse) is not made, and its reason shows at the top of the board for a moment.
//
// The game says what its cards are (`parts`, see model.js) and what a card shows under its ports (`body`); the
// board does the rest. Moving cards goes through the kit's drag.js: cards are [data-piece] with their header as the
// [data-drag] handle, ports are [data-p] (model.js port ids). Wires run between the dots where they are drawn,
// measured after each render.
//
// A frame (parts.frames, frames.js) is a card with regions below its body, where cards sit and are moved, wired and
// taken off like any other. A region that opens a value shows it as a dot at its left edge, and its result goes into
// a dot at its right edge. A card dragged onto a region moves into it, or out of it onto the board; clicking a region
// (or a card in it, or the frame) makes it where the next new card goes (`onTarget`). A frame folds to its card.

const ROW = 20
// A region's least size, and the room kept round the cards in it.
const REGION = { w: 240, h: 120, pad: 24 }
const clampZoom = (z) => Math.min(1.5, Math.max(0.35, Math.round(z * 100) / 100))
const curve = (a, b) => kitCurve(a, b, 'x', 48)

/**
 * @param graph, onChange(graph, { keep })   `keep`: a change to save that does not change what the circuit computes
 *   (a card moved, a view switched), so the game need not re-run it.
 * @param parts      the game's description of its nodes (model.js)
 * @param body(node) what a card shows under its ports (settings, its value…)
 * @param head(node) extra marks in a card's header (a pass/fail badge…)
 * @param caption(node) a fixed card's line under its title (what it carries)
 * @param outNote(node, key) beside each of a card's several outputs (parts.outputs), after its name: what it carries.
 *   Those outputs sit on the card's right edge over its body, which keeps that edge free (.node.has-outs)
 * @param cardClass(node), wireState(wire) → 'live' | 'dead' | null, width (a card's, unless parts.cardWidth(node) gives
 *   its own), height (for fitting), emptyNote, overlay
 * Windows floating over the board (FloatWindow, in `overlay`) are kept clear when fitting: the circuit goes between
 * them or below them, wherever it shows larger. With `refit` the circuit is fitted again whenever the board changes
 * size (a bench in the parts box, whose panel can open narrow and then grow). `regionNote(node, region)` is what a
 * region's left edge says beside its dot (the assumption it makes), `resultNote(node, region)` what its right edge
 * says beside the dot its result goes into (what the frame gives); `onTarget(region | null)` hears where a new card
 * should go. `minFit` is the smallest zoom a fit may
 * choose: a circuit too big for the board at it starts at its top left, and the rest is a pan away. `scope` names the
 * board for undo (a level's stage): a new one starts the history over.
 */
export default function CanvasEditor({ graph, onChange, parts, body, head, caption, outNote, cardClass, wireState, width = 140, height = 230, emptyNote, overlay, refit = false, minFit = 0, scope, regionNote, resultNote, onTarget }) {
  const history = useHistory(graph, onChange, scope)
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 })
  // A part can be taken off the board; so can a source the game lets the player place (parts.removable).
  const removable = (node) => (parts.removable ? parts.removable(node) : parts.role(node) === 'part')
  const [selected, setSelected] = useState(null) // { node: id } or { wire }
  const [drag, setDrag] = useState(null)
  const [dropInto, setDropInto] = useState(null) // the region a dragged card would go into, lit while it hovers
  const [picking, setPicking] = useState(null) // a dot clicked, waiting for the dot (or card) its wire goes to
  const [pointer, setPointer] = useState(null) // where the pointer is on the board while a dot is picked
  // A new pick (or none) starts without a pointer, so the draft wire waits for the pointer to move instead of reaching
  // for where the last pick's pointer was.
  const pick = (dot) => {
    setPicking(dot)
    setPointer(null)
  }
  // Where the dots and cards are drawn (in the layer's own pixels), measured after each render: { ports, sizes }.
  const [geo, setGeo] = useState({ ports: {}, sizes: {} })
  const geoRef = useRef(geo)
  const [, redraw] = useReducer((n) => n + 1, 0)
  // The region the next new card goes into ('<frame>/<region>'), or null for the board itself.
  const [target, setTarget] = useState(null)
  useEffect(() => onTarget?.(target), [target])
  // Why the last wire tried was refused (parts.refuse), shown on the board for a moment, as the phone board does.
  const [refused, setRefused] = useState(null)
  useEffect(() => {
    if (!refused) return undefined
    const timer = setTimeout(() => setRefused(null), 4200)
    return () => clearTimeout(timer)
  }, [refused])
  const surface = useRef(null)
  const layer = useRef(null)
  const pointers = useRef(new Map())
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  const widthOf = (node) => parts.cardWidth?.(node) ?? width
  const placed = graph.nodes.filter((n) => parts.role(n) === 'part').length
  const regionsOf = (node) => parts.frames?.(node) ?? []
  const top = graph.nodes.filter((n) => !n.in)
  // A card's size as drawn, or as it will be before it is.
  const sizeOf = (node) => geo.sizes[node.id] ?? [widthOf(node), height]
  const at = (p) => geo.ports[p] ?? null

  // Measure every dot and card once the board is drawn; a change draws again (a card moved, a frame grown).
  useLayoutEffect(() => {
    const root = layer.current
    if (!root) return
    const ports = {}
    for (const el of root.querySelectorAll('[data-p]')) {
      const box = el.getBoundingClientRect()
      ports[el.dataset.p] = pointIn(root, box.left + box.width / 2, box.top + box.height / 2).map(Math.round)
    }
    const sizes = {}
    for (const el of root.querySelectorAll('[data-node]')) sizes[el.dataset.node] = [el.offsetWidth, el.offsetHeight]
    const next = { ports, sizes }
    if (JSON.stringify(next) === JSON.stringify(geoRef.current)) return
    geoRef.current = next
    setGeo(next)
  })

  // The part of the board the floating windows leave free: the band between the windows on the left and those on the
  // right, or the strip below them all. With no windows, the whole board.
  const rooms = (box) => {
    const wins = [...surface.current.querySelectorAll('.float-window')].map((el) => el.getBoundingClientRect())
    if (!wins.length) return [{ left: 0, right: 0, top: 0 }]
    const middle = box.left + box.width / 2
    const left = Math.max(0, ...wins.filter((b) => b.left + b.width / 2 < middle).map((b) => b.right - box.left))
    const right = Math.max(0, ...wins.filter((b) => b.left + b.width / 2 >= middle).map((b) => box.right - b.left))
    const top = Math.max(0, ...wins.map((b) => b.bottom - box.top))
    return [{ left, right, top: 0 }, { left: 0, right: 0, top }]
  }
  // Fit the whole circuit into the board, in whichever free part shows it larger (below the windows, on a tie: a
  // circuit too big for either then runs on down the board instead of under a window).
  const fit = () => {
    const box = surface.current?.getBoundingClientRect()
    if (!box || !box.width || !top.length) return
    const xs = top.flatMap((n) => [n.x, n.x + sizeOf(n)[0]])
    const ys = top.flatMap((n) => [n.y, n.y + sizeOf(n)[1]])
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
    const pad = 36
    const best = rooms(box)
      .map(({ left, right, top }) => {
        const [w, h] = [box.width - left - right, box.height - top]
        // Which room shows it larger is judged before the floor (minFit), which would make them tie.
        const raw = Math.min(1.1, (w - pad * 2) / (x1 - x0), (h - pad * 2) / (y1 - y0))
        const zoom = clampZoom(Math.max(minFit, raw))
        const spare = w - (x1 - x0) * zoom
        return { raw, zoom, x: left + (spare > pad * 2 ? spare / 2 : pad) - x0 * zoom, y: top + pad - y0 * zoom }
      })
      .reduce((a, b) => (b.raw >= a.raw ? b : a))
    setView({ x: best.x, y: best.y, zoom: best.zoom })
  }
  // Fit once the board first has a real size.
  const fitted = useRef(false)
  const fitRef = useRef(fit)
  const refitRef = useRef(refit)
  useLayoutEffect(() => {
    fitRef.current = fit
    refitRef.current = refit
  })
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      if ((fitted.current && !refitRef.current) || !entry.contentRect.width) return
      fitted.current = true
      fitRef.current()
    })
    observer.observe(surface.current)
    return () => observer.disconnect()
  }, [])

  // A card that appears outside the visible board (a new part, an input just lit) brings the whole circuit back into
  // view, so nothing the player adds is ever off-screen.
  const known = useRef(null)
  useEffect(() => {
    const ids = new Set(graph.nodes.map((n) => n.id))
    const before = known.current
    known.current = ids
    if (!before || !fitted.current) return
    const added = top.filter((n) => !before.has(n.id))
    const box = surface.current?.getBoundingClientRect()
    if (!added.length || !box) return
    // Outside, or under a floating window.
    const wins = [...surface.current.querySelectorAll('.float-window')].map((el) => el.getBoundingClientRect())
    const outside = added.some((n) => {
      const x = n.x * view.zoom + view.x
      const y = n.y * view.zoom + view.y
      const [cx, cy] = [box.left + x + (width * view.zoom) / 2, box.top + y + (30 * view.zoom)]
      return x < 0 || y < 0 || x + width * view.zoom > box.width || y + 60 * view.zoom > box.height || wins.some((b) => cx > b.left && cx < b.right && cy > b.top && cy < b.bottom)
    })
    if (outside) fitRef.current()
  })

  const removeSelected = () => {
    if (!selected) return
    if (selected.wire) onChange(removeWire(graph, selected.wire))
    else if (selected.node && removable(byId.get(selected.node) ?? {})) onChange(removeNode(graph, selected.node))
    setSelected(null)
  }
  // Delete or Backspace removes the selection; Escape drops it. ⌘/Ctrl-Z undoes, ⇧⌘/Ctrl-Z or Ctrl-Y redoes, unless
  // a dialog over another board has the keys.
  useEffect(() => {
    const onKey = (event) => {
      if (/input|select|textarea/i.test(document.activeElement?.tagName)) return
      const dialog = [...document.querySelectorAll('[role="dialog"]')].at(-1)
      if (dialog && !dialog.contains(surface.current)) return
      const key = event.key.toLowerCase()
      if ((event.metaKey || event.ctrlKey) && (key === 'z' || (key === 'y' && event.ctrlKey))) {
        event.preventDefault()
        return key === 'y' || event.shiftKey ? history.redo() : history.undo()
      }
      if (event.key === 'Escape' && picking) return pick(null)
      if (!selected) return
      if (event.key === 'Escape') return setSelected(null)
      if (event.key !== 'Delete' && event.key !== 'Backspace') return
      event.preventDefault()
      removeSelected()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const zoomAt = (factor, cx, cy) =>
    setView((v) => {
      const zoom = clampZoom(v.zoom * factor)
      const k = zoom / v.zoom
      return { zoom, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k }
    })

  // Background: one pointer pans, two pointers pinch-zoom around their midpoint.
  // Any press on the background pans: not one on a card, a wire, a control or a window floating over the board.
  // A press on a region's empty floor pans too, and makes it where new cards go.
  const beginPan = (event) => {
    const card = event.target.closest('.node')
    const field = event.target.closest('.frame-field')
    if (event.button > 0 || (card && !card.contains(field)) || event.target.closest('.kw, button, input, select, label, .float-window, .board-zoom, .board-views')) return
    setSelected(null)
    pick(null)
    setTarget(field?.dataset.region ?? null)
    const box = surface.current.getBoundingClientRect()
    pointers.current.set(event.pointerId, [event.clientX, event.clientY])
    const snapshot = () => {
      const points = [...pointers.current.values()]
      const mid = points.reduce((s, p) => [s[0] + p[0] / points.length, s[1] + p[1] / points.length], [0, 0])
      const spread = points.length > 1 ? Math.hypot(points[0][0] - points[1][0], points[0][1] - points[1][1]) : 0
      return { mid, spread, count: points.length }
    }
    let last = snapshot()
    const move = (e) => {
      if (!pointers.current.has(e.pointerId)) return
      pointers.current.set(e.pointerId, [e.clientX, e.clientY])
      const now = snapshot()
      const before = last
      last = now
      if (now.count !== before.count) return
      setView((v) => {
        let { x, y, zoom } = v
        if (now.count > 1 && before.spread > 0) {
          const next = clampZoom(zoom * (now.spread / before.spread))
          const k = next / zoom
          const cx = now.mid[0] - box.left
          const cy = now.mid[1] - box.top
          x = cx - (cx - x) * k
          y = cy - (cy - y) * k
          zoom = next
        }
        return { zoom, x: x + now.mid[0] - before.mid[0], y: y + now.mid[1] - before.mid[1] }
      })
    }
    const up = (e) => {
      pointers.current.delete(e.pointerId)
      if (pointers.current.size) {
        last = snapshot()
        return
      }
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
    if (pointers.current.size === 1) {
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
      window.addEventListener('pointercancel', up)
    }
  }

  useEffect(() => {
    const node = surface.current
    const onWheel = (event) => {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      const box = node.getBoundingClientRect()
      zoomAt(event.deltaY > 0 ? 0.92 : 1.08, event.clientX - box.left, event.clientY - box.top)
    }
    node.addEventListener('wheel', onWheel, { passive: false })
    return () => node.removeEventListener('wheel', onWheel)
  }, [])

  const refusal = (from, to, port) => baseRefusal(graph, from, to, port, parts) ?? parts.refuse?.(graph, from, to, port) ?? null
  // A card's first free input that takes a wire from `from` (or any that takes it).
  const inputFor = (from, to) => {
    const ports = parts.inputs(byId.get(to) ?? {})
    return ports.find((p) => !graph.wires.some((w) => w.to === to && w.port === p) && !refusal(from, to, p)) ?? ports.find((p) => !refusal(from, to, p))
  }
  // Dropping a wire on an input uses that input; dropping it on a card uses the card's first free input that takes it.
  const connectTo = (from, over) => {
    let to = null
    let port = null
    const target = over?.dataset.p && parsePort(over.dataset.p)
    if (target?.side === 'in') [to, port] = [target.id, target.port]
    else if (over?.dataset.piece) [to, port] = [over.dataset.piece, inputFor(from, over.dataset.piece) ?? parts.inputs(byId.get(over.dataset.piece) ?? {})[0]]
    if (!to || !port || !byId.has(to)) return
    const why = refusal(from, to, port)
    if (why) return setRefused(why)
    setRefused(null)
    onChange(connect(graph, to, port, from))
  }
  // Click to wire: the wire two dots make, if it is allowed; then clicking the first dot again drops it, and a dot on
  // the same side picks that one instead.
  const wireOf = (a, b) => {
    const e = ends(a, b)
    return e && byId.has(e.to) && byId.has(srcNode(e.from)) && !refusal(e.from, e.to, e.port) ? e : null
  }
  // A wire refused between two dots on opposite sides says why.
  const refusalOf = (a, b) => {
    const e = ends(a, b)
    return e && byId.has(e.to) && byId.has(srcNode(e.from)) ? refusal(e.from, e.to, e.port) : null
  }
  const clickPort = (p) => {
    if (!picking || picking === p) return pick(picking === p ? null : p)
    const e = wireOf(picking, p)
    if (e) {
      setRefused(null)
      onChange(connect(graph, e.to, e.port, e.from))
      pick(null)
    } else if (parsePort(picking).side === parsePort(p).side) pick(p)
    else setRefused(refusalOf(picking, p))
  }
  // With a dot picked, clicking a card wires it there: an output to the card's first free input, an input from the
  // card's (first) output.
  const clickCard = (id) => {
    const node = byId.get(id)
    const p = parsePort(picking)
    const port = p.side === 'out' ? inputFor(p.id, id) : null
    const other = p.side === 'out' ? (port ? inPort(id, port) : null) : parts.role(node) !== 'sink' ? outPort(srcOf(node, outputsOf(parts, node)[0].key)) : null
    if (other && wireOf(picking, other)) clickPort(other)
    else if (p.side === 'out') {
      const first = parts.inputs(node)[0]
      if (first) setRefused(refusalOf(picking, inPort(id, first)))
    }
  }
  const portClass = (p) => (!picking ? '' : p === picking ? 'is-picked' : wireOf(picking, p) ? 'is-target' : '')

  // Choosing a card makes its region where new cards go; choosing a frame, its first region.
  const choose = (node) => {
    setSelected({ node: node.id })
    const first = regionsOf(node)[0]
    setTarget(first && !node.fold ? `${node.id}/${first.name}` : node.in ?? null)
  }
  // The region under a dragged card's pointer that it can go into (not one of its own), or null for the board.
  const fieldAt = (g) => document.elementsFromPoint(g.x, g.y).find((el) => el.classList?.contains('frame-field') && !g.el.contains(el)) ?? null
  // A card dropped lands where it was let go: in the region under the pointer, or on the board.
  const place = (g) => {
    const root = layer.current
    const node = byId.get(g.id)
    const field = fieldAt(g)
    const box = g.el.getBoundingClientRect()
    const [x0, y0] = pointIn(root, box.left, box.top)
    const [ox, oy] = field ? pointIn(root, field.getBoundingClientRect().left, field.getBoundingClientRect().top) : [0, 0]
    const [x, y] = [Math.max(0, Math.round(x0 + g.dx - ox)), Math.max(0, Math.round(y0 + g.dy - oy))]
    const region = field?.dataset.region ?? null
    if (region === (node.in ?? null)) return onChange({ ...graph, nodes: graph.nodes.map((n) => (n.id === g.id ? { ...n, x, y } : n)) }, { keep: true })
    const next = moveInto(graph, parts, g.id, region, x, y)
    onChange(next, { keep: next.wires.length === graph.wires.length })
    setTarget(region)
  }

  // Wires are pulled from outputs; a drag that starts on an input does nothing.
  const handlers = useRef(null)
  useLayoutEffect(() => {
    handlers.current = {
      start(g) {
        if (g.kind === 'piece') choose(byId.get(g.id))
        if (g.kind === 'port') pick(null)
      },
      move(g) {
        if (g.kind === 'piece') {
          redraw()
          // A region the card would go into, if dropped here, lights up.
          const region = fieldAt(g)?.dataset.region ?? null
          setDropInto(region && region !== (byId.get(g.id).in ?? null) ? region : null)
        }
        if (g.kind === 'port' && parsePort(g.id).side === 'out') {
          const [x, y] = pointIn(layer.current, g.x, g.y)
          setDrag({ from: parsePort(g.id).id, x, y })
        }
      },
      drop(g) {
        setDrag(null)
        setDropInto(null)
        if (g.kind === 'piece') place(g)
        if (g.kind === 'port' && parsePort(g.id).side === 'out') connectTo(parsePort(g.id).id, g.over)
      },
      end() {
        setDrag(null)
        setDropInto(null)
        redraw()
      },
    }
  })
  useEffect(() => enableDrag(surface.current, () => handlers.current), [])

  // A card, and for a frame its regions with the cards inside them.
  function card(node) {
    const role = parts.role(node)
    const regions = regionsOf(node)
    const own = new Set(regions.map((r) => r.name))
    const ports = parts.inputs(node).filter((p) => !own.has(p))
    const listed = parts.outputs?.(node)?.filter((o) => !own.has(o.key)) ?? null
    // A frame keeps its own result as a plain output; several outputs of other cards run down the right edge.
    const outs = listed && !(listed.length === 1 && listed[0].key === null) ? listed : null
    const icon = parts.icon?.(node)
    const wired = (src) => graph.wires.some((w) => w.from === src)
    const outDot = (src, extra = '') => <i className={`port port-out ${wired(src) ? 'is-wired' : ''} ${portClass(outPort(src))} ${extra}`} data-p={outPort(src)} title={tr('点一下，再点另一张卡片的输入；也可以拖过去', 'Click, then click an input of another card; or drag there')} onClick={() => clickPort(outPort(src))} />
    const inDot = (port, extra = '') => <i className={`port port-in ${graph.wires.some((w) => w.to === node.id && w.port === port) ? 'is-wired' : ''} ${portClass(inPort(node.id, port))} ${extra}`} data-p={inPort(node.id, port)} onClick={() => clickPort(inPort(node.id, port))} />
    return (
      <div
        key={node.id}
        data-node={node.id}
        data-piece={node.id}
        data-family={parts.family(node)}
        data-io={role === 'source' ? tr('输入', 'IN') : role === 'sink' ? tr('输出', 'OUT') : undefined}
        className={`node is-${role} ${regions.length ? 'is-frame' : ''} ${node.fold ? 'is-folded' : ''} ${outs ? 'has-outs' : ''} ${selected?.node === node.id ? 'is-selected' : ''} ${cardClass?.(node) ?? ''}`}
        onClick={picking ? (e) => !e.target.closest('[data-p], button, input, select, label, .frame-regions') && clickCard(node.id) : undefined}
        style={{ left: node.x, top: node.y, [regions.length ? 'minWidth' : 'width']: widthOf(node), ...parts.cardStyle?.(node) }}
      >
        {regions.length > 0 && <div className="frame-back" />}
        <div className="node-head" data-drag onPointerDown={() => choose(node)}>
          {regions.length > 0 && (
            <button className="frame-fold" aria-label={node.fold ? tr('展开', 'Unfold') : tr('折叠', 'Fold')} aria-expanded={!node.fold} onPointerDown={(e) => e.stopPropagation()} onClick={() => onChange({ ...graph, nodes: graph.nodes.map((n) => (n.id === node.id ? { ...n, fold: !n.fold } : n)) }, { keep: true })}>
              {node.fold ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
            </button>
          )}
          {icon && <i className="family-chip"><Glyph icon={icon} size={12} /></i>}
          <span className="node-title">{L(parts.label(node))}</span>
          {head?.(node)}
          {removable(node) && (
            <button className="node-delete" aria-label={tr('删除卡片', 'Delete card')} onPointerDown={(e) => e.stopPropagation()} onClick={() => onChange(removeNode(graph, node.id))}>
              <X size={12} />
            </button>
          )}
        </div>
        {/* Several outputs run down the card's right edge beside its body (the game leaves that edge free), so
            they never make the card longer. */}
        <div className="node-ports" style={{ minHeight: (outs ? ports.length : Math.max(1, ports.length)) * ROW }}>
          {caption && role !== 'part' && <span className={`node-carries ${role === 'source' ? 'is-input' : ''}`}>{L(caption(node))}</span>}
          {ports.map((port, index) => (
            <span key={port} className="node-port-label" style={{ top: index * ROW }}>
              {inDot(port, parts.portClass?.(node, port) ?? '')}
              {L(parts.portLabel?.(node, port)) ?? ''}
            </span>
          ))}
          {role !== 'sink' && !outs && outDot(node.id, parts.portClass?.(node, null) ?? '')}
          {role !== 'sink' && outs?.map((o, index) => (
            <span key={o.key} className="node-port-out" style={{ top: index * ROW }}>
              {o.glyph ? <span className="node-out-name is-glyph" title={L(o.label)} dangerouslySetInnerHTML={{ __html: o.glyph }} /> : <span className="node-out-name" title={L(o.label)}>{L(o.short ?? o.label)}</span>}
              {outNote?.(node, o.key)}
              {outDot(srcOf(node, o.key), parts.portClass?.(node, null, o.key) ?? '')}
            </span>
          ))}
        </div>
        {body?.(node)}
        {regions.length > 0 && !node.fold && (
          <div className="frame-regions">
            {regions.map((r) => {
              const key = `${node.id}/${r.name}`
              const inside = graph.nodes.filter((n) => n.in === key)
              const w = Math.max(REGION.w, ...inside.map((n) => n.x + sizeOf(n)[0] + REGION.pad))
              const h = Math.max(REGION.h, ...inside.map((n) => n.y + sizeOf(n)[1] + REGION.pad))
              return (
                <section key={r.name} className={`frame-region ${target === key ? 'is-target' : ''} ${dropInto === key ? 'is-drop' : ''}`}>
                  <header className="frame-region-head">
                    {r.opens && outDot(srcOf(node, r.name), 'frame-open')}
                    <span className="frame-region-name">{L(r.label)}</span>
                    {regionNote?.(node, r.name)}
                    <span className="frame-region-result">{L(parts.portLabel?.(node, r.name)) ?? ''}{resultNote?.(node, r.name)}{inDot(r.name, 'frame-close')}</span>
                  </header>
                  <div className="frame-field" data-region={key} style={{ width: w, height: h }}>
                    {inside.map(card)}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const centre = () => {
    const box = surface.current.getBoundingClientRect()
    return [box.width / 2, box.height / 2]
  }
  const selectedNode = selected?.node ? byId.get(selected.node) : null
  const canDelete = Boolean(selected?.wire) || Boolean(selectedNode && removable(selectedNode))

  return (
    <div className={`board kit-board ${picking ? 'is-picking' : ''}`} ref={surface} onPointerDown={beginPan} onPointerMove={picking ? (e) => setPointer(pointIn(layer.current, e.clientX, e.clientY)) : undefined}>
      <div className="board-grid" style={{ backgroundPosition: `${view.x}px ${view.y}px`, backgroundSize: `${20 * view.zoom}px ${20 * view.zoom}px` }} />
      {!placed && emptyNote && <p className="board-empty">{L(emptyNote)}</p>}
      <div className="board-layer" ref={layer} onAnimationEnd={redraw} style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`, transformOrigin: '0 0' }}>
        <svg className="board-wires" width="4000" height="3000">
          {graph.wires.map((wire) => {
            const [a, b] = [at(outPort(wire.from)), at(inPort(wire.to, wire.port))]
            const from = byId.get(srcNode(wire.from))
            if (!a || !b || !from) return null
            const d = curve(a, b)
            const active = selected?.wire?.to === wire.to && selected?.wire?.port === wire.port
            const state = wireState?.(wire)
            return (
              <g
                key={`${wire.to}.${wire.port}`}
                className={`kw ${active ? 'is-selected' : ''} ${state === 'live' ? 'is-live' : state === 'dead' ? 'is-dead' : ''} ${parts.wireClass?.(wire) ?? ''} ${parts.wireKind ? `kind-${parts.wireKind(wire, graph)}` : ''}`}
                data-family={parts.family(from)}
                style={parts.wireStyle?.(wire, graph)}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  setSelected({ wire })
                }}
              >
                <path className="kw-halo" d={d} />
                <path className="kw-line" d={d} />
                {state === 'live' && <path className="kw-flow" d={d} />}
                <path className="kw-hit" d={d} />
              </g>
            )
          })}
          {drag && at(outPort(drag.from)) && <path className="kw-draft" d={curve(at(outPort(drag.from)), [drag.x, drag.y])} />}
          {picking && pointer && at(picking) && <path className="kw-draft" d={parsePort(picking).side === 'out' ? curve(at(picking), pointer) : curve(pointer, at(picking))} />}
        </svg>
        {top.map(card)}
      </div>

      {canDelete && (
        <button className="board-delete" onPointerDown={(e) => e.stopPropagation()} onClick={removeSelected}>
          <Trash2 size={14} /> {selected.wire ? tr('删除连线', 'Delete wire') : tr('删除卡片', 'Delete card')}
        </button>
      )}
      {refused && <p className="board-refusal" role="status">{L(refused)}</p>}
      {overlay}
      <div className="board-zoom" onPointerDown={(e) => e.stopPropagation()}>
        <button onClick={history.undo} disabled={!history.canUndo} aria-label={tr('撤销', 'Undo')} title={tr('撤销（⌘/Ctrl+Z）', 'Undo (⌘/Ctrl+Z)')}><Undo2 size={14} /></button>
        <button onClick={history.redo} disabled={!history.canRedo} aria-label={tr('重做', 'Redo')} title={tr('重做（⇧⌘/Ctrl+Z）', 'Redo (⇧⌘/Ctrl+Z)')}><Redo2 size={14} /></button>
        <i className="board-zoom-rule" aria-hidden="true" />
        <button onClick={() => zoomAt(0.85, ...centre())} aria-label={tr('缩小', 'Zoom out')}><Minus size={14} /></button>
        <output>{Math.round(view.zoom * 100)}%</output>
        <button onClick={() => zoomAt(1 / 0.85, ...centre())} aria-label={tr('放大', 'Zoom in')}><Plus size={14} /></button>
        <button onClick={fit} aria-label={tr('适配画布', 'Fit to view')}><Maximize size={13} /></button>
      </div>
    </div>
  )
}
