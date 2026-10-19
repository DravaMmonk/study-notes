import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Maximize, Minus, Plus, Redo2, Trash2, Undo2, X } from 'lucide-react'
import { enableDrag } from '../drag.js'
import { curve as kitCurve, pointIn } from '../wires.js'
import { L, tr } from '../shell/i18n.js'
import Glyph from './Glyph.jsx'
import { baseRefusal, connect, ends, inPort, outPort, outputsOf, parsePort, removeNode, removeWire, srcKey, srcNode, srcOf } from './model.js'
import { useHistory } from './useHistory.js'

// The desktop circuit board, the same in every game: parts are cards, wires run from a card's output (a dot on its
// right) to another card's input (a dot on its left). Drag a card by its header to move it; drag from an output dot
// to an input dot, or onto a card, to wire it, or click one dot and then another (or the card), as on the phone;
// click a card or a wire to select it and press Delete (or the × on a card) to remove it. Drag the background to pan, pinch or ⌘/Ctrl-scroll to zoom, and the corner buttons zoom or fit;
// every edit can be undone and redone there too, or with ⌘/Ctrl-Z, ⇧⌘/Ctrl-Z and Ctrl-Y.
//
// The game says what its cards are (`parts`, see model.js) and what a card shows under its ports (`body`); the
// board does the rest. Moving cards goes through the kit's drag.js: cards are [data-piece] with their header as the
// [data-drag] handle, ports are [data-p] (model.js port ids).

const HEADER = 30
const ROW = 20
// A port's row starts below the header and the ports' top margin (.node-ports), and its dot sits in the row's middle.
const PORTS = HEADER + 6
const portY = (index) => PORTS + 10 + index * ROW
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
 * @param cardClass(node), wireState(wire) → 'live' | 'dead' | null, width, height (for fitting), emptyNote, overlay
 * Windows floating over the board (FloatWindow, in `overlay`) are kept clear when fitting: the circuit goes between
 * them or below them, wherever it shows larger. With `refit` the circuit is fitted again whenever the board changes
 * size (a bench in the parts box, whose panel can open narrow and then grow). `minFit` is the smallest zoom a fit may
 * choose: a circuit too big for the board at it starts at its top left, and the rest is a pan away. `scope` names the
 * board for undo (a level's stage): a new one starts the history over.
 */
export default function CanvasEditor({ graph, onChange, parts, body, head, caption, outNote, cardClass, wireState, width = 140, height = 230, emptyNote, overlay, refit = false, minFit = 0, scope }) {
  const history = useHistory(graph, onChange, scope)
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 })
  // A part can be taken off the board; so can a source the game lets the player place (parts.removable).
  const removable = (node) => (parts.removable ? parts.removable(node) : parts.role(node) === 'part')
  const [selected, setSelected] = useState(null) // { node: id } or { wire }
  const [drag, setDrag] = useState(null)
  const [picking, setPicking] = useState(null) // a dot clicked, waiting for the dot (or card) its wire goes to
  const [pointer, setPointer] = useState(null) // where the pointer is on the board while a dot is picked
  const [shift, setShift] = useState(null)
  const surface = useRef(null)
  const layer = useRef(null)
  const pointers = useRef(new Map())
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  // A card with several outputs may space them out (`row`) and give each row the whole width (`wide`), its content
  // all the game's (outNote): a setting per output, say.
  const outLayout = (node) => ({ row: ROW, wide: false, ...parts.outputLayout?.(node) })
  const outY = (node, index) => PORTS + 10 + index * outLayout(node).row
  const placed = graph.nodes.filter((n) => parts.role(n) === 'part').length

  // `shift` is how far a card being dragged has moved, so its wires follow it before the move is committed. An output
  // is the card's only one, or (`key`) one of its several, each on its own row.
  const portAt = (node, port, moving, key = null) => {
    const [sx, sy] = moving?.id === node.id ? [moving.dx, moving.dy] : [0, 0]
    if (port === null) return [node.x + sx + width, node.y + sy + outY(node, Math.max(0, outputsOf(parts, node).findIndex((o) => o.key === key)))]
    const index = Math.max(0, parts.inputs(node).indexOf(port))
    return [node.x + sx, node.y + sy + portY(index)]
  }

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
    if (!box || !box.width || !graph.nodes.length) return
    const xs = graph.nodes.flatMap((n) => [n.x, n.x + width])
    const ys = graph.nodes.flatMap((n) => [n.y, n.y + height])
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
    const added = graph.nodes.filter((n) => !before.has(n.id))
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
      if (event.key === 'Escape' && picking) return setPicking(null)
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
  const beginPan = (event) => {
    if (event.button > 0 || event.target.closest('.node, .kw, button, input, select, label, .float-window, .board-zoom, .board-views')) return
    setSelected(null)
    setPicking(null)
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

  const refusal = (from, to, port) => baseRefusal(graph, from, to) ?? parts.refuse?.(graph, from, to, port) ?? null
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
    else if (over?.dataset.piece) [to, port] = [over.dataset.piece, inputFor(from, over.dataset.piece)]
    if (!to || !port || !byId.has(to) || refusal(from, to, port)) return
    onChange(connect(graph, to, port, from))
  }
  // Click to wire: the wire two dots make, if it is allowed; then clicking the first dot again drops it, and a dot on
  // the same side picks that one instead.
  const wireOf = (a, b) => {
    const e = ends(a, b)
    return e && byId.has(e.to) && byId.has(srcNode(e.from)) && !refusal(e.from, e.to, e.port) ? e : null
  }
  const clickPort = (p) => {
    if (!picking || picking === p) return setPicking(picking === p ? null : p)
    const e = wireOf(picking, p)
    if (e) {
      onChange(connect(graph, e.to, e.port, e.from))
      setPicking(null)
    } else if (parsePort(picking).side === parsePort(p).side) setPicking(p)
  }
  // With a dot picked, clicking a card wires it there: an output to the card's first free input, an input from the
  // card's (first) output.
  const clickCard = (id) => {
    const node = byId.get(id)
    const p = parsePort(picking)
    const port = p.side === 'out' ? inputFor(p.id, id) : null
    const other = p.side === 'out' ? (port ? inPort(id, port) : null) : parts.role(node) !== 'sink' ? outPort(srcOf(node, outputsOf(parts, node)[0].key)) : null
    if (other && wireOf(picking, other)) clickPort(other)
  }
  const portClass = (p) => (!picking ? '' : p === picking ? 'is-picked' : wireOf(picking, p) ? 'is-target' : '')

  // Wires are pulled from outputs; a drag that starts on an input does nothing.
  const handlers = useRef(null)
  useLayoutEffect(() => {
    handlers.current = {
      start(g) {
        if (g.kind === 'piece') setSelected({ node: g.id })
        if (g.kind === 'port') setPicking(null)
      },
      move(g) {
        if (g.kind === 'piece') setShift({ id: g.id, dx: g.dx, dy: g.dy })
        if (g.kind === 'port' && parsePort(g.id).side === 'out') {
          const [x, y] = pointIn(layer.current, g.x, g.y)
          setDrag({ from: parsePort(g.id).id, x, y })
        }
      },
      drop(g) {
        setShift(null)
        setDrag(null)
        if (g.kind === 'piece') onChange({ ...graph, nodes: graph.nodes.map((n) => (n.id === g.id ? { ...n, x: Math.round(n.x + g.dx), y: Math.round(n.y + g.dy) } : n)) }, { keep: true })
        if (g.kind === 'port' && parsePort(g.id).side === 'out') connectTo(parsePort(g.id).id, g.over)
      },
      end() {
        setShift(null)
        setDrag(null)
      },
    }
  })
  useEffect(() => enableDrag(surface.current, () => handlers.current), [])

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
      <div className="board-layer" ref={layer} style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`, transformOrigin: '0 0' }}>
        <svg className="board-wires" width="4000" height="3000">
          {graph.wires.map((wire) => {
            const from = byId.get(srcNode(wire.from))
            const to = byId.get(wire.to)
            if (!from || !to) return null
            const d = curve(portAt(from, null, shift, srcKey(wire.from)), portAt(to, wire.port, shift))
            const active = selected?.wire?.to === wire.to && selected?.wire?.port === wire.port
            const state = wireState?.(wire)
            return (
              <g
                key={`${wire.to}.${wire.port}`}
                className={`kw ${active ? 'is-selected' : ''} ${state === 'live' ? 'is-live' : state === 'dead' ? 'is-dead' : ''} ${parts.wireClass?.(wire) ?? ''}`}
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
          {drag && byId.get(srcNode(drag.from)) && <path className="kw-draft" d={curve(portAt(byId.get(srcNode(drag.from)), null, null, srcKey(drag.from)), [drag.x, drag.y])} />}
          {picking && pointer && (() => {
            const p = parsePort(picking)
            const node = byId.get(p.side === 'out' ? srcNode(p.id) : p.id)
            if (!node) return null
            return <path className="kw-draft" d={p.side === 'out' ? curve(portAt(node, null, null, srcKey(p.id)), pointer) : curve(pointer, portAt(node, p.port))} />
          })()}
        </svg>
        {graph.nodes.map((node) => {
          const role = parts.role(node)
          const ports = parts.inputs(node)
          const outs = parts.outputs?.(node) ?? null
          const lay = outLayout(node)
          const icon = parts.icon?.(node)
          return (
            <div
              key={node.id}
              data-node={node.id}
              data-piece={node.id}
              data-family={parts.family(node)}
              data-io={role === 'source' ? tr('输入', 'IN') : role === 'sink' ? tr('输出', 'OUT') : undefined}
              className={`node is-${role} ${outs ? 'has-outs' : ''} ${selected?.node === node.id ? 'is-selected' : ''} ${cardClass?.(node) ?? ''}`}
              onClick={picking ? (e) => !e.target.closest('[data-p], button, input, select, label') && clickCard(node.id) : undefined}
              style={{ left: node.x, top: node.y, width, ...parts.cardStyle?.(node) }}
            >
              <div className="node-head" data-drag onPointerDown={() => setSelected({ node: node.id })}>
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
                    <i className={`port port-in ${graph.wires.some((w) => w.to === node.id && w.port === port) ? 'is-wired' : ''} ${portClass(inPort(node.id, port))} ${parts.portClass?.(node, port) ?? ''}`} data-p={inPort(node.id, port)} onClick={() => clickPort(inPort(node.id, port))} />
                    {L(parts.portLabel?.(node, port)) ?? ''}
                  </span>
                ))}
                {role !== 'sink' && !outs && <i className={`port port-out ${graph.wires.some((w) => w.from === node.id) ? 'is-wired' : ''} ${portClass(outPort(node.id))} ${parts.portClass?.(node, null) ?? ''}`} data-p={outPort(node.id)} title={tr('点一下，再点另一张卡片的输入；也可以拖过去', 'Click, then click an input of another card; or drag there')} onClick={() => clickPort(outPort(node.id))} />}
                {role !== 'sink' && outs?.map((o, index) => {
                  const src = srcOf(node, o.key)
                  return (
                    <span key={o.key} className={`node-port-out ${lay.wide ? 'is-wide' : ''}`} style={{ top: index * lay.row }}>
                      {!lay.wide && (o.glyph ? <span className="node-out-name is-glyph" title={L(o.label)} dangerouslySetInnerHTML={{ __html: o.glyph }} /> : <span className="node-out-name" title={L(o.label)}>{L(o.short ?? o.label)}</span>)}
                      {outNote?.(node, o.key)}
                      <i className={`port port-out ${graph.wires.some((w) => w.from === src) ? 'is-wired' : ''} ${portClass(outPort(src))} ${parts.portClass?.(node, null, o.key) ?? ''}`} data-p={outPort(src)} title={tr('点一下，再点另一张卡片的输入；也可以拖过去', 'Click, then click an input of another card; or drag there')} onClick={() => clickPort(outPort(src))} />
                    </span>
                  )
                })}
              </div>
              {body?.(node)}
            </div>
          )
        })}
      </div>

      {canDelete && (
        <button className="board-delete" onPointerDown={(e) => e.stopPropagation()} onClick={removeSelected}>
          <Trash2 size={14} /> {selected.wire ? tr('删除连线', 'Delete wire') : tr('删除卡片', 'Delete card')}
        </button>
      )}
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
