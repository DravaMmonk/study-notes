import { createElement, useEffect, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import { NODE_TYPES, inputsOf } from '../../engine/nodes.js'
import { familyOf, iconOf } from '../catalog.js'
import ValueView from '../views/ValueView.jsx'
import { kindOf, nodeView } from '../views/views.js'
import { mapLayout } from './ops.js'

const TILE_W = 92
const TILE_H = 74
const COL = 106
const ROW = 96
const PORT_TAGS = { a: 'a', b: 'b', left: '左', right: '右', c0: 'd0', c1: 'd1', c2: 'd2', c3: 'd3' }

// The whole circuit at a glance, laid out by data flow (no dragging, no zooming): each block is a
// tile with its live result, wires curve from a block's bottom to the inputs on the next block's
// top. Tapping a tile selects it; while an input is being chosen, the tiles that can feed it light
// up and the rest dim.
export default function CircuitMap({ graph, values, errors, checks, views, theme, selected, picking, canFeed, nameOf, onTap }) {
  const pane = useRef(null)
  const [paneWidth, setPaneWidth] = useState(360)
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setPaneWidth(entry.contentRect.width))
    observer.observe(pane.current)
    return () => observer.disconnect()
  }, [])
  // Keep the selected block in view (a part added at the bottom would otherwise be off the map).
  useEffect(() => {
    if (!selected) return
    const tile = pane.current?.querySelector(`[data-id="${CSS.escape(selected)}"]`)
    tile?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  }, [selected, graph.nodes.length])

  const { rank, lane, rows, lanes } = mapLayout(graph)
  const width = Math.max(lanes * COL, COL) + 24
  const height = rows * ROW + 8
  const scale = Math.max(0.68, Math.min(1, (paneWidth - 8) / width))
  const pos = (id) => ({ x: width / 2 + lane.get(id) * COL, y: 8 + rank.get(id) * ROW })
  const portX = (node, port) => {
    const ports = inputsOf(node.type)
    const i = Math.max(0, ports.indexOf(port))
    return pos(node.id).x - TILE_W / 2 + (TILE_W * (i + 1)) / (ports.length + 1)
  }
  const touches = (w) => selected && (w.from === selected || w.to === selected)
  const pending = graph.nodes.flatMap((node) => (node.type === 'input' ? [] : inputsOf(node.type).filter((port) => !graph.wires.some((w) => w.to === node.id && w.port === port)).map((port) => ({ node, port }))))

  return (
    <div className="cm-pane" ref={pane}>
      <div className="cm-canvas" style={{ width: width * scale, height: height * scale }}>
        <div className="cm-board" style={{ width, height, transform: `scale(${scale})` }}>
          <svg className="cm-wires" width={width} height={height} aria-hidden="true">
            {graph.wires.map((w) => {
              const from = graph.nodes.find((n) => n.id === w.from)
              const to = graph.nodes.find((n) => n.id === w.to)
              if (!from || !to || !rank.has(from.id) || !rank.has(to.id)) return null
              const a = { x: pos(from.id).x, y: pos(from.id).y + TILE_H }
              const b = { x: portX(to, w.port), y: pos(to.id).y }
              const bend = Math.max(24, (b.y - a.y) / 2)
              // A wire that skips rows bows out to the side, so it does not run through the blocks between.
              const skips = rank.get(to.id) - rank.get(from.id) > 1
              const side = skips ? (b.x >= a.x ? 1 : -1) * (TILE_W * 0.75) : 0
              return (
                <g key={`${w.to}.${w.port}`} className={`cm-wire ${touches(w) ? 'is-hot' : ''}`} data-family={familyOf(from.type)}>
                  <path d={`M${a.x},${a.y} C${a.x + side},${a.y + bend} ${b.x + side},${b.y - bend} ${b.x},${b.y}`} />
                  {inputsOf(to.type).length > 1 && <text x={b.x + 4} y={b.y - 5}>{PORT_TAGS[w.port] ?? w.port}</text>}
                </g>
              )
            })}
            {pending.map(({ node, port }) => {
              const x = portX(node, port)
              const y = pos(node.id).y
              return (
                <g key={`${node.id}.${port}`} className={`cm-stub ${picking?.node === node.id && picking.port === port ? 'is-picking' : ''}`}>
                  <line x1={x} x2={x} y1={y - 16} y2={y} />
                  <circle cx={x} cy={y - 18} r={7} />
                  <text x={x} y={y - 14.5}>{inputsOf(node.type).length > 1 ? PORT_TAGS[port] ?? port : '?'}</text>
                </g>
              )
            })}
          </svg>
          {graph.nodes.map((node) => {
            if (!rank.has(node.id)) return null
            const { x, y } = pos(node.id)
            const value = values?.get(node.id)
            const error = errors?.get(node.id)
            const check = node.type === 'output' ? checks?.find((c) => c.name === node.params.name) : null
            const feeds = picking ? canFeed(node.id) : true
            const isPicking = picking?.node === node.id
            return (
              <button
                key={node.id}
                className={`cm-tile ${selected === node.id ? 'is-selected' : ''} ${picking ? (feeds ? 'is-candidate' : 'is-dim') : ''} ${isPicking ? 'is-target' : ''} ${check ? (check.pass ? 'is-pass' : 'is-fail') : ''}`}
                data-family={familyOf(node.type)}
                data-id={node.id}
                style={{ left: x - TILE_W / 2, top: y, width: TILE_W, height: TILE_H }}
                onClick={() => onTap(node.id)}
                disabled={Boolean(picking) && !feeds && !isPicking}
                aria-label={nameOf(node)}
              >
                <span className="cm-thumb">
                  {error ? <i className="cm-error">!</i> : value ? <ValueView img={value} view={nodeView(node, views)} size={kindOf(value) === 'signal' ? 64 : 40} theme={theme} /> : <i className="cm-empty" />}
                </span>
                <span className="cm-name">
                  {node.type === 'output' && check ? (check.pass ? <Check size={11} /> : <X size={11} />) : createElement(iconOf(node.type), { size: 11, strokeWidth: 2 })}
                  {nameOf(node)}
                </span>
                {NODE_TYPES[node.type].fixed || <span className="cm-chip" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
