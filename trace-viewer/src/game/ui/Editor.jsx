import { createElement, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowRightFromLine, ArrowRightToLine, Check, Maximize, Minus, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import { enableDrag } from '../../../../games/kit/drag.js'
import { curve as kitCurve, pointIn } from '../../../../games/kit/wires.js'
import { wouldCycle } from '../engine/graph.js'
import { NODE_TYPES, inputsOf } from '../engine/nodes.js'
import { L, tr } from '../../../../games/kit/shell/i18n.js'
import { familyOf, iconOf } from './catalog.js'
import ParamControl from './ParamControl.jsx'
import ValueView from './views/ValueView.jsx'
import { IMAGE_VIEWS, KIND_NAMES, kindOf, nodeView } from './views/views.js'

// The board: parts are cards, wires run from a card's output (right) to another card's input (left).
// Every card shows what it outputs for the selected test, so the player watches the image flow.
// Moving cards and pulling wires is the shared circuit kit (games/kit/drag.js), also used by 状态之图: cards are
// [data-piece] with their header as the [data-drag] handle, ports are [data-p] ('<node>' for an output,
// '<node>|<port>' for an input). Panning and zooming the board stay here.

const NODE_W = 140
const HEADER = 30
const ROW = 20
const portY = (index) => HEADER + 10 + index * ROW

// `shift` is how far a card being dragged has moved, so its wires follow it before the move is committed.
const portPosition = (node, port, shift) => {
  const [sx, sy] = shift?.id === node.id ? [shift.dx, shift.dy] : [0, 0]
  if (port === 'out') return [node.x + sx + NODE_W, node.y + sy + portY(0)]
  const index = Math.max(0, inputsOf(node.type).indexOf(port))
  return [node.x + sx, node.y + sy + portY(index)]
}

const curve = (a, b) => kitCurve(a, b, 'x', 48)

const PORT_LABELS = { a: 'a', b: 'b', in: '', left: { zh: '左', en: 'left' }, right: { zh: '右', en: 'right' }, c0: 'd=0', c1: 'd=1', c2: 'd=2', c3: 'd=3' }
const clampZoom = (z) => Math.min(1.5, Math.max(0.35, Math.round(z * 100) / 100))

export default function Editor({ graph, onChange, run, testIndex, flags, inputLabels, outputLabels, views, ioKinds, scan, onScan, theme, touch, hasPalette }) {
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 })
  const [selected, setSelected] = useState(null)
  const [drag, setDrag] = useState(null)
  const [shift, setShift] = useState(null)
  const [peek, setPeek] = useState(null)
  const [menu, setMenu] = useState(null) // id of the card whose view menu is open
  const surface = useRef(null)
  const layer = useRef(null)
  const pointers = useRef(new Map())
  const values = run?.results[testIndex]?.values
  const errors = run?.results[testIndex]?.errors
  const placed = graph.nodes.filter((n) => !NODE_TYPES[n.type].fixed).length

  // Fit the whole circuit into the board.
  const fit = () => {
    const box = surface.current?.getBoundingClientRect()
    if (!box || !box.width || !graph.nodes.length) return
    const xs = graph.nodes.flatMap((n) => [n.x, n.x + NODE_W])
    const ys = graph.nodes.flatMap((n) => [n.y, n.y + 230])
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
    const pad = 36
    const whole = Math.min(1.1, (box.width - pad * 2) / (x1 - x0), (box.height - pad * 2 - (touch ? 70 : 0)) / (y1 - y0))
    // On a phone keep cards large enough to touch; the rest of the circuit is a swipe away.
    const zoom = clampZoom(touch ? Math.max(whole, 0.62) : whole)
    const wide = (x1 - x0) * zoom > box.width - pad * 2
    setView({ zoom, x: wide ? pad / 2 - x0 * zoom : (box.width - (x1 - x0) * zoom) / 2 - x0 * zoom, y: pad - y0 * zoom })
  }
  // Fit once the board first has a real size (on phones it may start in a hidden tab).
  const fitted = useRef(false)
  const fitRef = useRef(fit)
  useLayoutEffect(() => {
    fitRef.current = fit
  })
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      if (fitted.current || !entry.contentRect.width) return
      fitted.current = true
      fitRef.current()
    })
    observer.observe(surface.current)
    return () => observer.disconnect()
  }, [])

  const removeSelected = () => {
    if (!selected) return
    if (selected.wire) {
      onChange({ ...graph, wires: graph.wires.filter((w) => !(w.to === selected.wire.to && w.port === selected.wire.port)) })
    } else if (selected.node && !NODE_TYPES[graph.nodes.find((n) => n.id === selected.node)?.type]?.fixed) {
      onChange({ nodes: graph.nodes.filter((n) => n.id !== selected.node), wires: graph.wires.filter((w) => w.from !== selected.node && w.to !== selected.node) })
    }
    setSelected(null)
  }

  useEffect(() => {
    const onKey = (event) => {
      if (!selected || /input|select|textarea/i.test(document.activeElement?.tagName)) return
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
  const beginPan = (event) => {
    if (event.target !== event.currentTarget && !event.target.classList.contains('board-grid')) return
    setSelected(null)
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

  // Dropping a wire on an input port uses that port; dropping it on a card uses the card's first free input.
  const connectTo = (from, over) => {
    let to = null
    let port = null
    if (over?.dataset.p?.includes('|')) [to, port] = over.dataset.p.split('|')
    else if (over?.dataset.piece) {
      to = over.dataset.piece
      const ports = inputsOf(graph.nodes.find((n) => n.id === to)?.type ?? 'output')
      port = ports.find((p) => !graph.wires.some((w) => w.to === to && w.port === p)) ?? ports[0]
    }
    if (!to || !port || !graph.nodes.some((n) => n.id === to) || wouldCycle(graph, from, to)) return
    onChange({ ...graph, wires: [...graph.wires.filter((w) => !(w.to === to && w.port === port)), { from, to, port }] })
  }

  // Wires are pulled from outputs only; a drag that starts on an input does nothing.
  const handlers = useRef(null)
  useLayoutEffect(() => {
    handlers.current = {
      start(g) {
        if (g.kind === 'piece') setSelected({ node: g.id })
      },
      move(g) {
        if (g.kind === 'piece') setShift({ id: g.id, dx: g.dx, dy: g.dy })
        if (g.kind === 'port' && !g.id.includes('|')) {
          const [x, y] = pointIn(layer.current, g.x, g.y)
          setDrag({ from: g.id, x, y })
        }
      },
      drop(g) {
        setShift(null)
        setDrag(null)
        if (g.kind === 'piece') {
          onChange({ ...graph, nodes: graph.nodes.map((n) => (n.id === g.id ? { ...n, x: Math.round(n.x + g.dx), y: Math.round(n.y + g.dy) } : n)) })
        }
        if (g.kind === 'port' && !g.id.includes('|')) connectTo(g.id, g.over)
      },
      end() {
        setShift(null)
        setDrag(null)
      },
    }
  })
  useEffect(() => enableDrag(surface.current, () => handlers.current), [])

  // How a card draws a 2-D value is the card's own choice, starting from the level's default for
  // its role. Switching view changes nothing in the circuit, so it is not saved as a move.
  // How a card draws a 2-D value is the card's own choice, starting from the level's default for
  // its role. Choosing a view changes nothing in the circuit: it is saved, but tests do not re-run.
  const viewOf = (node) => nodeView(node, views)
  const showAs = (ids, shown) => onChange({ ...graph, nodes: graph.nodes.map((n) => (ids.includes(n.id) ? { ...n, view: shown } : n)) }, { keep: true })
  const imageCards = graph.nodes.filter((n) => kindOf(values?.get(n.id)) === 'image')
  const shared = imageCards.length && imageCards.every((n) => viewOf(n) === viewOf(imageCards[0])) ? viewOf(imageCards[0]) : null
  const customised = graph.nodes.some((n) => n.view)
  const resetViews = () => {
    const nodes = graph.nodes.map((n) => {
      const next = { ...n }
      delete next.view
      return next
    })
    onChange({ ...graph, nodes }, { keep: true })
  }
  // The fixed cards are titled 输入 / 输出 (or by name when a level has several), and say under the
  // title what they carry, so a long label never pushes the pass badge off the card.
  const titleOf = (node, spec) => {
    if (!spec.fixed) return L(spec.label)
    const custom = node.type === 'input' ? inputLabels?.[node.params.name] : outputLabels?.[node.params.name]
    return L(custom) ?? (node.type === 'input' ? tr('输入', 'Input') : tr('输出', 'Output'))
  }
  const carriesOf = (node) => {
    const kind = L(KIND_NAMES[ioKinds?.[node.params.name]])
    const custom = node.type === 'input' ? inputLabels?.[node.params.name] : outputLabels?.[node.params.name]
    return [custom ? (node.type === 'input' ? tr('输入', 'input') : tr('输出', 'output')) : null, kind].filter(Boolean).join(' · ')
  }

  useEffect(() => {
    if (!menu) return
    const close = (event) => {
      if (event.type === 'keydown' && event.key !== 'Escape') return
      if (event.target.closest?.('.view-menu, .node-view')) return
      setMenu(null)
    }
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', close)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', close)
    }
  }, [menu])

  const setParam = (node, key, value) => onChange({ ...graph, nodes: graph.nodes.map((n) => (n.id === node.id ? { ...n, params: { ...n.params, [key]: value } } : n)) })
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  const centre = () => {
    const box = surface.current.getBoundingClientRect()
    return [box.width / 2, box.height / 2]
  }
  const selectedNode = selected?.node ? byId.get(selected.node) : null
  const canDelete = Boolean(selected?.wire) || Boolean(selectedNode && !NODE_TYPES[selectedNode.type].fixed)

  return (
    <div className={`board ${touch ? 'is-touch' : ''}`} ref={surface} onPointerDown={beginPan}>
      <div className="board-grid" style={{ backgroundPosition: `${view.x}px ${view.y}px`, backgroundSize: `${20 * view.zoom}px ${20 * view.zoom}px` }} />
      {!placed && hasPalette && (
        <p className="board-empty">{touch ? tr('点右下角的 ＋ 放一个元件上来，再从卡片右侧的圆点拖线连接。', 'Tap ＋ at the bottom right to place a part, then drag a wire from the dot on the right of a card.') : tr('从左边选一个元件放上来，再从卡片右侧的圆点拖线连接。', 'Pick a part on the left to place it, then drag a wire from the dot on the right of a card.')}</p>
      )}
      <div className="board-layer" ref={layer} style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`, transformOrigin: '0 0' }}>
        <svg className="board-wires" width="4000" height="3000">
          {graph.wires.map((wire) => {
            const from = byId.get(wire.from)
            const to = byId.get(wire.to)
            if (!from || !to) return null
            const d = curve(portPosition(from, 'out', shift), portPosition(to, wire.port, shift))
            const active = selected?.wire?.to === wire.to && selected?.wire?.port === wire.port
            const live = Boolean(values?.get(wire.from))
            return (
              <g
                key={`${wire.to}.${wire.port}`}
                className={`kw ${active ? 'is-selected' : ''} ${live ? 'is-live' : 'is-dead'}`}
                data-family={familyOf(from.type)}
                onPointerDown={(e) => { e.stopPropagation(); setSelected({ wire }) }}
              >
                <path className="kw-halo" d={d} />
                <path className="kw-line" d={d} />
                {live && <path className="kw-flow" d={d} />}
                <path className="kw-hit" d={d} />
              </g>
            )
          })}
          {drag && <path className="kw-draft" d={curve(portPosition(byId.get(drag.from), 'out'), [drag.x, drag.y])} />}
        </svg>
        {graph.nodes.map((node) => {
          const spec = NODE_TYPES[node.type]
          const value = values?.get(node.id)
          const error = errors?.get(node.id)
          const ports = inputsOf(node.type)
          const title = titleOf(node, spec)
          const shown = viewOf(node)
          const outputCheck = node.type === 'output' ? run?.results[testIndex]?.checks.find((c) => c.name === node.params.name) : null
          return (
            <div
              key={node.id}
              data-node={node.id}
              data-piece={node.id}
              data-family={familyOf(node.type)}
              className={`node node-${node.type} ${menu === node.id ? 'has-menu' : ''} ${selected?.node === node.id ? 'is-selected' : ''} ${outputCheck && outputCheck.pass !== null ? (outputCheck.pass ? 'is-pass' : 'is-fail') : ''}`}
              style={{ left: node.x, top: node.y, width: NODE_W }}
            >
              <div className="node-head" data-drag onPointerDown={() => setSelected({ node: node.id })}>
                <i className="family-chip">{createElement(node.type === 'input' ? ArrowRightFromLine : node.type === 'output' ? ArrowRightToLine : iconOf(node.type), { size: 12, strokeWidth: 1.8 })}</i>
                <span className="node-title">{title}</span>
                {outputCheck && outputCheck.pass !== null && <em className="node-verdict" title={outputCheck.pass ? tr('这组测试通过', 'This test passes') : L(outputCheck.reason)}>{outputCheck.pass ? tr('通过', 'Pass') : tr('未通过', 'Fail')}</em>}
                {!spec.fixed && (
                  <button className="node-delete" aria-label={tr('删除卡片', 'Delete card')} onPointerDown={(e) => e.stopPropagation()} onClick={() => onChange({ nodes: graph.nodes.filter((n) => n.id !== node.id), wires: graph.wires.filter((w) => w.from !== node.id && w.to !== node.id) })}>
                    <X size={12} />
                  </button>
                )}
              </div>
              <div className="node-ports" style={{ minHeight: Math.max(1, ports.length) * ROW }}>
                {spec.fixed && <span className={`node-carries ${node.type === 'input' ? 'is-input' : ''}`}>{carriesOf(node)}</span>}
                {ports.map((port, index) => (
                  <span key={port} className="node-port-label" style={{ top: index * ROW }}>
                    <i className={`port port-in ${graph.wires.some((w) => w.to === node.id && w.port === port) ? 'is-wired' : ''}`} data-p={`${node.id}|${port}`} />
                    {L(PORT_LABELS[port]) ?? port}
                  </span>
                ))}
                {node.type !== 'output' && <i className={`port port-out ${graph.wires.some((w) => w.from === node.id) ? 'is-wired' : ''}`} data-p={node.id} title={tr('拖到另一张卡片的输入', 'Drag to an input of another card')} />}
              </div>
              {(spec.params ?? []).filter((p) => !p.unlock || flags.has(p.unlock)).map((param) => (
                <ParamControl key={param.key} param={param} value={node.params[param.key]} onChange={(v) => setParam(node, param.key, v)} />
              ))}
              <div className="node-preview">
                {error ? <span className="node-error">{L(error)}</span> : <ValueView img={value} view={shown} size={NODE_W - 22} theme={theme} label={tr('未连接', 'Not connected')} grid scan={scan} onScan={onScan} onHover={(p) => setPeek(p ? { ...p, id: node.id } : null)} />}
                {!error && kindOf(value) === 'image' && (
                  <button className={`node-view ${menu === node.id ? 'is-open' : ''}`} aria-haspopup="menu" aria-expanded={menu === node.id} aria-label={tr(`显示方式：${L(IMAGE_VIEWS[shown].label)}`, `Display: ${L(IMAGE_VIEWS[shown].label)}`)} title={tr('换一种画法', 'Draw it another way')} onPointerDown={(e) => e.stopPropagation()} onClick={() => setMenu(menu === node.id ? null : node.id)}>
                    {createElement(IMAGE_VIEWS[shown].icon, { size: 12, strokeWidth: 1.8 })}
                    <span>{L(IMAGE_VIEWS[shown].label)}</span>
                  </button>
                )}
                {menu === node.id && (
                  <div className="view-menu" role="menu" aria-label={tr('显示方式', 'Display')} onPointerDown={(e) => e.stopPropagation()}>
                    {Object.entries(IMAGE_VIEWS).map(([key, option]) => (
                      <button key={key} role="menuitemradio" aria-checked={shown === key} onClick={() => { showAs([node.id], key); setMenu(null) }}>
                        {createElement(option.icon, { size: 14, strokeWidth: 1.7 })}
                        <span><b>{L(option.label)}</b><small>{L(option.hint)}</small></span>
                        {shown === key && <Check size={13} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {peek?.id === node.id && <p className="node-peek">{peek.frequency ? tr('频率 ', 'frequency ') : ''}({peek.x}, {peek.y}) = {peek.value.toFixed(3)}</p>}
            </div>
          )
        })}
      </div>

      {canDelete && (
        <button className="board-delete" onPointerDown={(e) => e.stopPropagation()} onClick={removeSelected}>
          <Trash2 size={14} /> {selected.wire ? tr('删除连线', 'Delete wire') : tr('删除卡片', 'Delete card')}
        </button>
      )}
      {imageCards.length > 0 && (
        <div className="board-views" role="group" aria-label={tr('所有图像卡片的显示方式', 'Display of every image card')} onPointerDown={(e) => e.stopPropagation()}>
          <span className="board-views-label">{tr('全部画成', 'Draw all as')}</span>
          {Object.entries(IMAGE_VIEWS).map(([key, option]) => (
            <button key={key} aria-pressed={shared === key} title={tr(`${L(option.label)}：${L(option.hint)}`, `${L(option.label)}: ${L(option.hint)}`)} onClick={() => showAs(imageCards.map((n) => n.id), key)}>
              {createElement(option.icon, { size: 14, strokeWidth: 1.7 })}
              <span>{L(option.label)}</span>
            </button>
          ))}
          {customised && <button className="board-views-reset" title={tr('恢复这一关的默认画法', "Restore this level's default views")} aria-label={tr('恢复默认画法', 'Restore default views')} onClick={resetViews}><RotateCcw size={13} /></button>}
        </div>
      )}
      <div className="board-zoom" onPointerDown={(e) => e.stopPropagation()}>
        <button onClick={() => zoomAt(0.85, ...centre())} aria-label={tr('缩小', 'Zoom out')}><Minus size={14} /></button>
        <output>{Math.round(view.zoom * 100)}%</output>
        <button onClick={() => zoomAt(1 / 0.85, ...centre())} aria-label={tr('放大', 'Zoom in')}><Plus size={14} /></button>
        <button onClick={fit} aria-label={tr('适配画布', 'Fit to view')}><Maximize size={13} /></button>
      </div>
    </div>
  )
}
