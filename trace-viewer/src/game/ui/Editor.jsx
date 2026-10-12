import { createElement, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Maximize, Minus, Plus, Trash2, X } from 'lucide-react'
import { wouldCycle } from '../engine/graph.js'
import { NODE_TYPES, inputsOf } from '../engine/nodes.js'
import { familyOf, iconOf } from './catalog.js'
import ImageView from './ImageView.jsx'

// The board: parts are cards, wires run from a card's output (right) to another card's input (left).
// Every card shows what it outputs for the selected test, so the player watches the image flow.

const NODE_W = 140
const HEADER = 30
const ROW = 20
const portY = (index) => HEADER + 10 + index * ROW

const portPosition = (node, port) => {
  if (port === 'out') return [node.x + NODE_W, node.y + portY(0)]
  const index = Math.max(0, inputsOf(node.type).indexOf(port))
  return [node.x, node.y + portY(index)]
}

const curve = ([x1, y1], [x2, y2]) => {
  const bend = Math.max(48, Math.abs(x2 - x1) / 2)
  return `M${x1} ${y1} C${x1 + bend} ${y1} ${x2 - bend} ${y2} ${x2} ${y2}`
}

const PORT_LABELS = { a: 'a', b: 'b', in: '', left: '左', right: '右', c0: 'd=0', c1: 'd=1', c2: 'd=2', c3: 'd=3' }
const clampZoom = (z) => Math.min(1.5, Math.max(0.35, Math.round(z * 100) / 100))

export default function Editor({ graph, onChange, run, testIndex, flags, inputLabels, theme, touch, hasPalette }) {
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 })
  const [selected, setSelected] = useState(null)
  const [drag, setDrag] = useState(null)
  const [peek, setPeek] = useState(null)
  const surface = useRef(null)
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

  const local = (event) => {
    const box = surface.current.getBoundingClientRect()
    return [(event.clientX - box.left - view.x) / view.zoom, (event.clientY - box.top - view.y) / view.zoom]
  }

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

  const beginMove = (event, node) => {
    if (event.button !== 0) return
    event.stopPropagation()
    setSelected({ node: node.id })
    const [sx, sy] = local(event)
    const origin = { x: node.x, y: node.y }
    let latest = graph
    let moved = false
    const move = (e) => {
      const [x, y] = local(e)
      moved = true
      latest = { ...latest, nodes: latest.nodes.map((n) => (n.id === node.id ? { ...n, x: Math.round(origin.x + x - sx), y: Math.round(origin.y + y - sy) } : n)) }
      onChange(latest, { quiet: true })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      if (moved) onChange(latest)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const beginWire = (event, node) => {
    event.stopPropagation()
    event.preventDefault()
    const [x, y] = local(event)
    setDrag({ from: node.id, x, y })
    const move = (e) => {
      const [mx, my] = local(e)
      setDrag({ from: node.id, x: mx, y: my })
    }
    const up = (e) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setDrag(null)
      const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-port], [data-node]')
      if (!target) return
      const to = target.dataset.port ? target.dataset.portNode : target.dataset.node
      const toNode = graph.nodes.find((n) => n.id === to)
      if (!toNode) return
      const ports = inputsOf(toNode.type)
      const port = target.dataset.port ?? ports.find((p) => !graph.wires.some((w) => w.to === to && w.port === p)) ?? ports[0]
      if (!port || wouldCycle(graph, node.id, to)) return
      onChange({ ...graph, wires: [...graph.wires.filter((w) => !(w.to === to && w.port === port)), { from: node.id, to, port }] })
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

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
        <p className="board-empty">{touch ? '点右下角的 ＋ 放一个元件上来，再从卡片右侧的圆点拖线连接。' : '从左边选一个元件放上来，再从卡片右侧的圆点拖线连接。'}</p>
      )}
      <div className="board-layer" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`, transformOrigin: '0 0' }}>
        <svg className="board-wires" width="4000" height="3000">
          {graph.wires.map((wire) => {
            const from = byId.get(wire.from)
            const to = byId.get(wire.to)
            if (!from || !to) return null
            const d = curve(portPosition(from, 'out'), portPosition(to, wire.port))
            const active = selected?.wire?.to === wire.to && selected?.wire?.port === wire.port
            const live = Boolean(values?.get(wire.from))
            return (
              <g
                key={`${wire.to}.${wire.port}`}
                className={`wire ${active ? 'is-selected' : ''} ${live ? 'is-live' : 'is-dead'}`}
                data-family={familyOf(from.type)}
                onPointerDown={(e) => { e.stopPropagation(); setSelected({ wire }) }}
              >
                <path className="wire-hit" d={d} />
                <path className="wire-line" d={d} />
                {live && <path className="wire-flow" d={d} />}
              </g>
            )
          })}
          {drag && <path className="wire-line is-drafting" d={curve(portPosition(byId.get(drag.from), 'out'), [drag.x, drag.y])} />}
        </svg>
        {graph.nodes.map((node) => {
          const spec = NODE_TYPES[node.type]
          const value = values?.get(node.id)
          const error = errors?.get(node.id)
          const ports = inputsOf(node.type)
          const title = node.type === 'input' ? inputLabels?.[node.params.name] ?? '相机' : node.type === 'output' ? '显示屏' : spec.label
          const outputCheck = node.type === 'output' ? run?.results[testIndex]?.checks.find((c) => c.name === node.params.name) : null
          return (
            <div
              key={node.id}
              data-node={node.id}
              data-family={familyOf(node.type)}
              className={`node node-${node.type} ${selected?.node === node.id ? 'is-selected' : ''} ${outputCheck ? (outputCheck.pass ? 'is-pass' : 'is-fail') : ''}`}
              style={{ left: node.x, top: node.y, width: NODE_W }}
            >
              <div className="node-head" onPointerDown={(e) => beginMove(e, node)}>
                <i className="family-chip">{createElement(iconOf(node.type), { size: 12, strokeWidth: 1.8 })}</i>
                <span className="node-title">{title}</span>
                {outputCheck && <em className="node-verdict">{outputCheck.pass ? '通过' : '未通过'}</em>}
                {!spec.fixed && (
                  <button className="node-delete" aria-label="删除卡片" onPointerDown={(e) => e.stopPropagation()} onClick={() => onChange({ nodes: graph.nodes.filter((n) => n.id !== node.id), wires: graph.wires.filter((w) => w.from !== node.id && w.to !== node.id) })}>
                    <X size={12} />
                  </button>
                )}
              </div>
              <div className="node-ports" style={{ minHeight: Math.max(1, ports.length) * ROW }}>
                {ports.map((port, index) => (
                  <span key={port} className="node-port-label" style={{ top: index * ROW }}>
                    <i className={`port port-in ${graph.wires.some((w) => w.to === node.id && w.port === port) ? 'is-wired' : ''}`} data-port={port} data-port-node={node.id} />
                    {PORT_LABELS[port] ?? port}
                  </span>
                ))}
                {node.type !== 'output' && <i className={`port port-out ${graph.wires.some((w) => w.from === node.id) ? 'is-wired' : ''}`} onPointerDown={(e) => beginWire(e, node)} title="拖到另一张卡片的输入" />}
              </div>
              {(spec.params ?? []).filter((p) => !p.unlock || flags.has(p.unlock)).map((param) => (
                <ParamControl key={param.key} param={param} value={node.params[param.key]} onChange={(v) => setParam(node, param.key, v)} />
              ))}
              <div className="node-preview">
                {error ? <span className="node-error">{error}</span> : <ImageView img={value} size={NODE_W - 22} theme={theme} label="未连接" grid onHover={(p) => setPeek(p ? { ...p, id: node.id } : null)} />}
              </div>
              {peek?.id === node.id && <p className="node-peek">({peek.x}, {peek.y}) = {peek.value.toFixed(3)}</p>}
            </div>
          )
        })}
      </div>

      {canDelete && (
        <button className="board-delete" onPointerDown={(e) => e.stopPropagation()} onClick={removeSelected}>
          <Trash2 size={14} /> {selected.wire ? '删除连线' : '删除卡片'}
        </button>
      )}
      <div className="board-zoom" onPointerDown={(e) => e.stopPropagation()}>
        <button onClick={() => zoomAt(0.85, ...centre())} aria-label="缩小"><Minus size={14} /></button>
        <output>{Math.round(view.zoom * 100)}%</output>
        <button onClick={() => zoomAt(1 / 0.85, ...centre())} aria-label="放大"><Plus size={14} /></button>
        <button onClick={fit} aria-label="适配画布"><Maximize size={13} /></button>
      </div>
    </div>
  )
}

function ParamControl({ param, value, onChange }) {
  const stop = (e) => e.stopPropagation()
  if (param.kind === 'select') {
    return (
      <label className="param">
        <span>{param.label}</span>
        <select value={value} onChange={(e) => onChange(typeof param.options[0][0] === 'number' ? Number(e.target.value) : e.target.value)} onPointerDown={stop}>
          {param.options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
        </select>
      </label>
    )
  }
  if (param.kind === 'kernel') {
    return (
      <div className={`param-kernel ${param.learnable ? 'is-learned' : ''}`} onPointerDown={stop}>
        {value.map((w, i) =>
          param.learnable ? (
            <output key={i} style={{ '--w': Math.max(-1, Math.min(1, w)) }}>{w.toFixed(2)}</output>
          ) : (
            <input key={i} type="number" inputMode="decimal" step="any" value={Number(w.toFixed(4))} onChange={(e) => onChange(value.map((x, j) => (j === i ? Number(e.target.value) || 0 : x)))} aria-label={`权重 ${Math.floor(i / 3) + 1} 行 ${(i % 3) + 1} 列`} />
          ),
        )}
      </div>
    )
  }
  return (
    <label className="param">
      <span>{param.label}</span>
      <input type="number" inputMode="decimal" step="any" value={value} onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))} onPointerDown={stop} />
    </label>
  )
}
