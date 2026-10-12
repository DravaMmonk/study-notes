import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { wouldCycle } from '../engine/graph.js'
import { NODE_TYPES, inputsOf } from '../engine/nodes.js'
import ImageView from './ImageView.jsx'

// The board: nodes are cards, wires run from a card's output (right) to another card's input (left).
// Every card shows what it outputs for the selected test, so the player can see the image flow.

const NODE_W = 136
const HEADER = 28
const ROW = 20
const portY = (index) => HEADER + 10 + index * ROW

const portPosition = (node, port) => {
  if (port === 'out') return [node.x + NODE_W, node.y + portY(0)]
  const index = Math.max(0, inputsOf(node.type).indexOf(port))
  return [node.x, node.y + portY(index)]
}

const curve = ([x1, y1], [x2, y2]) => {
  const bend = Math.max(40, Math.abs(x2 - x1) / 2)
  return `M${x1} ${y1} C${x1 + bend} ${y1} ${x2 - bend} ${y2} ${x2} ${y2}`
}

const PORT_LABELS = { a: 'a', b: 'b', in: '', left: '左', right: '右', c0: 'd=0', c1: 'd=1', c2: 'd=2', c3: 'd=3' }

export default function Editor({ graph, onChange, run, testIndex, flags, inputLabels, theme }) {
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [selected, setSelected] = useState(null)
  const [drag, setDrag] = useState(null)
  const surface = useRef(null)
  const values = run?.results[testIndex]?.values
  const errors = run?.results[testIndex]?.errors

  useEffect(() => {
    const onKey = (event) => {
      if (!selected || /input|select|textarea/i.test(document.activeElement?.tagName)) return
      if (event.key !== 'Delete' && event.key !== 'Backspace') return
      event.preventDefault()
      if (selected.wire) {
        onChange({ ...graph, wires: graph.wires.filter((w) => !(w.to === selected.wire.to && w.port === selected.wire.port)) })
      } else if (selected.node && !NODE_TYPES[graph.nodes.find((n) => n.id === selected.node)?.type]?.fixed) {
        onChange({ nodes: graph.nodes.filter((n) => n.id !== selected.node), wires: graph.wires.filter((w) => w.from !== selected.node && w.to !== selected.node) })
      }
      setSelected(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, graph, onChange])

  const local = (event) => {
    const box = surface.current.getBoundingClientRect()
    return [(event.clientX - box.left - pan.x) / zoom, (event.clientY - box.top - pan.y) / zoom]
  }

  const beginPan = (event) => {
    if (event.target !== event.currentTarget && !event.target.classList.contains('board-grid')) return
    setSelected(null)
    const start = { x: event.clientX - pan.x, y: event.clientY - pan.y }
    const move = (e) => setPan({ x: e.clientX - start.x, y: e.clientY - start.y })
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const beginMove = (event, node) => {
    if (event.button !== 0) return
    event.stopPropagation()
    setSelected({ node: node.id })
    const [sx, sy] = local(event)
    const origin = { x: node.x, y: node.y }
    let latest = graph
    const move = (e) => {
      const [x, y] = local(e)
      latest = { ...latest, nodes: latest.nodes.map((n) => (n.id === node.id ? { ...n, x: Math.round(origin.x + x - sx), y: Math.round(origin.y + y - sy) } : n)) }
      onChange(latest, { quiet: true })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      onChange(latest)
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

  const zoomBy = (factor) => setZoom((z) => Math.min(1.4, Math.max(0.4, Math.round(z * factor * 100) / 100)))
  const onWheel = (event) => {
    if (!event.ctrlKey && !event.metaKey) return
    event.preventDefault()
    zoomBy(event.deltaY > 0 ? 0.9 : 1.1)
  }
  useEffect(() => {
    const node = surface.current
    node.addEventListener('wheel', onWheel, { passive: false })
    return () => node.removeEventListener('wheel', onWheel)
  })

  const setParam = (node, key, value) => onChange({ ...graph, nodes: graph.nodes.map((n) => (n.id === node.id ? { ...n, params: { ...n.params, [key]: value } } : n)) })
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))

  return (
    <div className="board" ref={surface} onPointerDown={beginPan}>
      <div className="board-grid" style={{ backgroundPosition: `${pan.x}px ${pan.y}px` }} />
      <div className="board-zoom" onPointerDown={(e) => e.stopPropagation()}>
        <button onClick={() => zoomBy(0.85)} aria-label="缩小">−</button>
        <output>{Math.round(zoom * 100)}%</output>
        <button onClick={() => zoomBy(1 / 0.85)} aria-label="放大">+</button>
      </div>
      <div className="board-layer" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
        <svg className="board-wires" width="4000" height="3000">
          {graph.wires.map((wire) => {
            const from = byId.get(wire.from)
            const to = byId.get(wire.to)
            if (!from || !to) return null
            const d = curve(portPosition(from, 'out'), portPosition(to, wire.port))
            const active = selected?.wire?.to === wire.to && selected?.wire?.port === wire.port
            return (
              <g key={`${wire.to}.${wire.port}`} className={`wire ${active ? 'is-selected' : ''} ${values?.get(wire.from) ? '' : 'is-dead'}`} onPointerDown={(e) => { e.stopPropagation(); setSelected({ wire }) }}>
                <path className="wire-hit" d={d} />
                <path className="wire-line" d={d} />
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
              className={`node node-${node.type} ${selected?.node === node.id ? 'is-selected' : ''} ${outputCheck ? (outputCheck.pass ? 'is-pass' : 'is-fail') : ''}`}
              style={{ left: node.x, top: node.y, width: NODE_W }}
            >
              <div className="node-head" onPointerDown={(e) => beginMove(e, node)}>
                <span>{title}</span>
                {!spec.fixed && (
                  <button className="node-delete" aria-label="删除节点" onPointerDown={(e) => e.stopPropagation()} onClick={() => onChange({ nodes: graph.nodes.filter((n) => n.id !== node.id), wires: graph.wires.filter((w) => w.from !== node.id && w.to !== node.id) })}>
                    <X size={12} />
                  </button>
                )}
              </div>
              <div className="node-ports" style={{ minHeight: Math.max(1, ports.length) * ROW }}>
                {ports.map((port, index) => (
                  <span key={port} className="node-port-label" style={{ top: index * ROW }}>
                    <i className="port port-in" data-port={port} data-port-node={node.id} />
                    {PORT_LABELS[port] ?? port}
                  </span>
                ))}
                {node.type !== 'output' && <i className="port port-out" onPointerDown={(e) => beginWire(e, node)} title="拖到另一个节点的输入" />}
              </div>
              {(spec.params ?? []).filter((p) => !p.unlock || flags.has(p.unlock)).map((param) => (
                <ParamControl key={param.key} param={param} value={node.params[param.key]} onChange={(v) => setParam(node, param.key, v)} />
              ))}
              <div className="node-preview">
                {error ? <span className="node-error">{error}</span> : <ImageView img={value} size={NODE_W - 22} theme={theme} label="未连接" />}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ParamControl({ param, value, onChange }) {
  if (param.kind === 'select') {
    return (
      <label className="param">
        <span>{param.label}</span>
        <select value={value} onChange={(e) => onChange(typeof param.options[0][0] === 'number' ? Number(e.target.value) : e.target.value)} onPointerDown={(e) => e.stopPropagation()}>
          {param.options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
        </select>
      </label>
    )
  }
  if (param.kind === 'kernel') {
    return (
      <div className={`param-kernel ${param.learnable ? 'is-learned' : ''}`} onPointerDown={(e) => e.stopPropagation()}>
        {value.map((w, i) =>
          param.learnable ? (
            <output key={i}>{w.toFixed(2)}</output>
          ) : (
            <input key={i} type="number" step="any" value={Number(w.toFixed(4))} onChange={(e) => onChange(value.map((x, j) => (j === i ? Number(e.target.value) || 0 : x)))} aria-label={`权重 ${Math.floor(i / 3) + 1} 行 ${(i % 3) + 1} 列`} />
          ),
        )}
      </div>
    )
  }
  return (
    <label className="param">
      <span>{param.label}</span>
      <input type="number" step="any" value={value} onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))} onPointerDown={(e) => e.stopPropagation()} />
    </label>
  )
}
