import { useLayoutEffect, useRef } from 'react'
import { Plus } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'
import Glyph from './Glyph.jsx'
import { feeding, inPort, layout, outPort, placement } from './model.js'

// The phone circuit board, the same in every game: the sources on top, parts in a two-column grid of slots that
// keep their place, the sinks at the bottom. A block's inputs are dots on its top edge and its output a dot on its
// bottom edge; wires run between the dots. What a block shows (its value, a picture) is the game's (`thumb`).

/** Wires from each output dot down (or round) to the input dot it feeds; `live` is a wire being dragged. */
export function drawWires(el, graph, parts, live) {
  const svg = el.querySelector('.pb-wires')
  if (!svg) return
  const origin = el.getBoundingClientRect()
  const at = (p) => {
    const dot = el.querySelector(`[data-p="${CSS.escape(p)}"]`)
    if (!dot) return null
    const box = dot.getBoundingClientRect()
    return [box.left + box.width / 2 - origin.left, box.top + box.height / 2 - origin.top]
  }
  const middle = el.clientWidth / 2
  const curve = ([ax, ay], [bx, by]) => {
    const drop = Math.max(28, Math.abs(by - ay) / 2)
    // A wire that has to climb loops out sideways instead of cutting through the blocks.
    if (by < ay + 10) {
      const side = (bx >= ax ? 1 : -1) * 70
      return `M${ax.toFixed(1)},${ay.toFixed(1)} C${(ax + side).toFixed(1)},${(ay + drop).toFixed(1)} ${(bx + side).toFixed(1)},${(by - drop).toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)}`
    }
    // A wire that runs down past a whole row turns toward the middle of the board at once, so it is clear of the
    // short wire to the block just below and never reads as passing through that block's input.
    if (by - ay > 150) {
      const side = (ax < middle ? 1 : -1) * 96
      const back = Math.abs(bx - ax) < 30 ? side : 0
      return `M${ax.toFixed(1)},${ay.toFixed(1)} C${(ax + side).toFixed(1)},${(ay + 30).toFixed(1)} ${(bx + back).toFixed(1)},${(by - drop).toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)}`
    }
    return `M${ax.toFixed(1)},${ay.toFixed(1)} C${ax.toFixed(1)},${(ay + drop).toFixed(1)} ${bx.toFixed(1)},${(by - drop).toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)}`
  }
  const family = (id) => parts.family(graph.nodes.find((n) => n.id === id) ?? {})
  // A game may colour a wire itself (by its source, say) instead of by family.
  const style = (w) => Object.entries(parts.wireStyle?.(w, graph) ?? {}).map(([k, v]) => `${k}:${v}`).join(';')
  let markup = ''
  for (const w of graph.wires) {
    const a = at(outPort(w.from))
    const b = at(inPort(w.to, w.port))
    if (a && b) markup += `<path class="pb-casing" d="${curve(a, b)}"/><path class="pb-wire" data-family="${family(w.from)}" style="${style(w)}" d="${curve(a, b)}"/>`
  }
  if (live) {
    const a = at(live.from)
    if (a) {
      const b = [live.x - origin.left, live.y - origin.top]
      markup += `<path class="pb-wire is-live" d="${live.from.startsWith('o|') ? curve(a, b) : curve(b, a)}"/>`
    }
  }
  svg.setAttribute('width', el.scrollWidth)
  svg.setAttribute('height', el.scrollHeight)
  svg.innerHTML = markup
}

/**
 * @param graph, parts                     the circuit and the game's description of its nodes (model.js)
 * @param nameOf(node)                     a block's name (with its number, for parts)
 * @param thumb(node, size)                what a block shows; sinkBody(node) what a sink shows; tileExtra(node) a line
 *                                         under a part's name (a setting); sinkClass(node) a sink's state
 * @param picking, canLand(p), onPort(p), onNode(id), onSlot(at)    from useSlotEditing
 */
export default function SlotBoard({ graph, parts, nameOf, thumb, tileExtra, sinkBody, sinkClass, picking, canLand, onPort, onNode, onSlot }) {
  const board = useRef(null)
  const { sources, sinks } = layout(graph, parts)
  const { cell, size } = placement(graph, parts)
  const bySlot = new Map([...cell].map(([id, at]) => [at, graph.nodes.find((n) => n.id === id)]))

  // Wires are drawn after layout from where the dots really are, and again while a wire is dragged.
  useLayoutEffect(() => {
    const el = board.current
    if (!el) return undefined
    const draw = () => drawWires(el, graph, parts)
    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(el)
    return () => observer.disconnect()
  })

  const dotClass = (p, extra = '') => {
    if (!picking) return extra
    if (p === picking) return `${extra} is-picked`
    return `${extra} ${canLand(p) ? 'is-target' : 'is-dim'}`
  }
  const dot = (p, label, extra = '') => (
    <button
      key={p}
      type="button"
      className={`pb-dot ${dotClass(p, extra)}`}
      data-p={p}
      onClick={(event) => {
        event.stopPropagation()
        onPort(p)
      }}
      aria-label={label}
    >
      <i />
    </button>
  )
  const inputs = (node) => {
    const ports = parts.inputs(node)
    return ports.map((port) => {
      const from = graph.nodes.find((n) => n.id === feeding(graph, node.id, port))
      const tag = ports.length > 1 ? L(parts.portLabel?.(node, port) ?? port) : ''
      // Beside a wired input, where it reads from: a part's number, or a source's name. A wire between two parts
      // stacked in one column is short, so this says what it connects even where the wire is hard to see.
      const source = from && (parts.role(from) === 'source' ? nameOf(from) : nameOf(from).split(' ')[0])
      return (
        <span key={port} className="pb-in">
          {dot(inPort(node.id, port), tr(`${nameOf(node)} 的输入${tag ? ` ${tag}` : ''}${from ? `（读 ${nameOf(from)}，点一下拆掉）` : ''}`, `${nameOf(node)} input${tag ? ` ${tag}` : ''}${from ? ` (reads ${nameOf(from)}; tap to unplug)` : ''}`), `${from ? 'is-in is-wired' : 'is-in is-open'} ${parts.portClass?.(node, port) ?? ''}`)}
          {tag && <em>{tag}</em>}
          {source && <b className="pb-src" data-family={parts.family(from)}>{source}</b>}
        </span>
      )
    })
  }
  const icon = (node) => {
    const i = parts.icon?.(node)
    return i ? <i className="pb-glyph"><Glyph icon={i} size={12} strokeWidth={2} /></i> : null
  }

  return (
    <div className="pb-board" ref={board}>
      <svg className="pb-wires" aria-hidden="true" />
      <div className="pb-terms is-sources">
        {sources.map((node) => (
          <div key={node.id} className="pb-term" data-family={parts.family(node)} role="button" tabIndex={0} onClick={() => onNode(node.id)}>
            <span className="pb-thumb">{thumb(node, 64)}</span>
            <span className="pb-name">{nameOf(node)}</span>
            <span className="pb-out">{dot(outPort(node.id), tr(`${nameOf(node)} 的输出`, `${nameOf(node)} output`), `is-out ${parts.portClass?.(node, null) ?? ''}`)}</span>
          </div>
        ))}
      </div>

      <div className="pb-grid">
        {Array.from({ length: size }, (_, at) => {
          const node = bySlot.get(at)
          if (!node) {
            return (
              <div key={`slot-${at}`} className="pb-cell" data-slot={at}>
                <button type="button" className="pb-slot" onClick={() => onSlot(at)} aria-label={tr(`在第 ${at + 1} 格放一个元件`, `Place a part in slot ${at + 1}`)}><Plus size={20} /></button>
              </div>
            )
          }
          const extra = tileExtra?.(node)
          return (
            <div key={node.id} className="pb-cell" data-slot={at}>
              <div className="pb-tile" data-piece={node.id} data-drag data-family={parts.family(node)} style={parts.cardStyle?.(node)} role="button" tabIndex={0} onClick={() => onNode(node.id)} aria-label={nameOf(node)}>
                <span className="pb-ins">{inputs(node)}</span>
                <span className="pb-thumb">{thumb(node, 84)}</span>
                <span className="pb-name">{icon(node)}{nameOf(node)}</span>
                {extra && <span className="pb-param">{extra}</span>}
                <span className="pb-out">{dot(outPort(node.id), tr(`${nameOf(node)} 的输出`, `${nameOf(node)} output`), `is-out ${parts.portClass?.(node, null) ?? ''}`)}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="pb-terms is-outputs">
        {sinks.map((node) => (
          <div key={node.id} className={`pb-term is-output ${sinkClass?.(node) ?? ''}`} data-family={parts.family(node)} role="button" tabIndex={0} onClick={() => onNode(node.id)}>
            <span className="pb-ins">{inputs(node)}</span>
            {sinkBody ? sinkBody(node) : <span className="pb-thumb">{thumb(node, 64)}</span>}
            <span className="pb-name">{nameOf(node)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
