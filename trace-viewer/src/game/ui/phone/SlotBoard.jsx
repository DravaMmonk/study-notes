import { createElement, useLayoutEffect, useRef } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { NODE_TYPES, inputsOf } from '../../engine/nodes.js'
import { familyOf, iconOf } from '../catalog.js'
import { L, tr } from '../../i18n.js'
import ValueView from '../views/ValueView.jsx'
import { kindOf, nodeView } from '../views/views.js'
import { feeding, layout, placement } from './ops.js'
import { ParamChip } from './parts.jsx'
import { PORT_TAGS, drawWires, inPort, outPort } from './wires.js'

const THUMB = 84

// The circuit as a board: the level's inputs on top, parts in a two-column grid of slots that keep
// their place, the outputs at the bottom. Each block shows its result on the current test; its inputs
// are dots on its top edge and its output a dot on its bottom edge, and wires run between the dots.
export default function SlotBoard({ graph, values, errors, checks, expected, views, theme, nameOf, picking, canLand, onPort, onNode, onSlot, live }) {
  const board = useRef(null)
  const { sources, outputs } = layout(graph)
  const { cell, size } = placement(graph)
  const bySlot = new Map([...cell].map(([id, at]) => [at, graph.nodes.find((n) => n.id === id)]))

  // Wires are drawn after layout from where the dots really are, and again while a wire is dragged.
  useLayoutEffect(() => {
    const el = board.current
    if (!el) return undefined
    const draw = () => drawWires(el, graph, live)
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
  const thumbOf = (node, size = THUMB) => {
    const value = values?.get(node.id)
    const open = node.type !== 'input' && inputsOf(node.type).some((port) => !feeding(graph, node.id, port))
    if (open) return <i className="pb-empty" style={{ width: size, height: size }}>{tr('待接线', 'unwired')}</i>
    if (errors?.get(node.id)) return <i className="pb-error" style={{ width: size, height: size }}>!</i>
    if (!value) return <i className="pb-empty" style={{ width: size, height: size }} />
    return <ValueView img={value} view={nodeView(node, views)} size={kindOf(value) === 'signal' ? size * 1.6 : size} theme={theme} />
  }
  const inputs = (node) =>
    inputsOf(node.type).map((port) => {
      const from = graph.nodes.find((n) => n.id === feeding(graph, node.id, port))
      const tag = inputsOf(node.type).length > 1 ? L(PORT_TAGS[port]) ?? port : ''
      // Beside a wired input, where it reads from: a part's number, or the input's name. A wire between two
      // parts stacked in one column is short, so this says what it connects even where the wire is hard to see.
      const source = from && (from.type === 'input' ? nameOf(from) : nameOf(from).split(' ')[0])
      return (
        <span key={port} className="pb-in">
          {dot(inPort(node.id, port), tr(`${nameOf(node)} 的输入${tag ? ` ${tag}` : ''}${from ? `（读 ${nameOf(from)}，点一下拆掉）` : ''}`, `${nameOf(node)} input${tag ? ` ${tag}` : ''}${from ? ` (reads ${nameOf(from)}; tap to unplug)` : ''}`), from ? 'is-in is-wired' : 'is-in is-open')}
          {tag && <em>{tag}</em>}
          {source && <b className="pb-src" data-family={familyOf(from.type)}>{source}</b>}
        </span>
      )
    })

  return (
    <div className="pb-board" ref={board}>
      <svg className="pb-wires" aria-hidden="true" />
      <div className="pb-terms is-sources">
        {sources.map((node) => (
          <div key={node.id} className="pb-term" role="button" tabIndex={0} onClick={() => onNode(node.id)}>
            <span className="pb-thumb">{thumbOf(node, 64)}</span>
            <span className="pb-name">{nameOf(node)}</span>
            <span className="pb-out">{dot(outPort(node.id), tr(`${nameOf(node)} 的输出`, `${nameOf(node)} output`), 'is-out')}</span>
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
          const spec = NODE_TYPES[node.type]
          const param = (spec.params ?? [])[0]
          return (
            <div key={node.id} className="pb-cell" data-slot={at}>
              <div className="pb-tile" data-piece={node.id} data-drag data-family={familyOf(node.type)} role="button" tabIndex={0} onClick={() => onNode(node.id)} aria-label={nameOf(node)}>
                <span className="pb-ins">{inputs(node)}</span>
                <span className="pb-thumb">{thumbOf(node)}</span>
                <span className="pb-name">{createElement(iconOf(node.type), { size: 12, strokeWidth: 2 })}{nameOf(node)}</span>
                {param && <span className="pb-param"><ParamChip param={param} value={node.params[param.key]} /></span>}
                <span className="pb-out">{dot(outPort(node.id), tr(`${nameOf(node)} 的输出`, `${nameOf(node)} output`), 'is-out')}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="pb-terms is-outputs">
        {outputs.map((node) => {
          const check = checks?.find((c) => c.name === node.params.name)
          const want = expected?.[node.params.name]
          const got = values?.get(node.id)
          const view = nodeView(node, views)
          const big = kindOf(want) === 'signal' ? 96 : 64
          return (
            <div key={node.id} className={`pb-term is-output ${check && check.pass !== null ? (check.pass ? 'is-pass' : 'is-fail') : ''}`} role="button" tabIndex={0} onClick={() => onNode(node.id)}>
              <span className="pb-ins">{inputs(node)}</span>
              <span className="pb-compare">
                <figure>{want && <ValueView img={want} view={view} size={big} theme={theme} />}<figcaption>{tr('期望', 'Expected')}</figcaption></figure>
                <figure>{got ? <ValueView img={got} view={view} size={big} theme={theme} /> : <i className="pb-empty" style={{ width: big, height: 64 }} />}<figcaption>{tr('你的', 'Yours')}</figcaption></figure>
              </span>
              <span className="pb-name">{check?.pass === null || !check ? null : check.pass ? <Check size={13} /> : <X size={13} />}{nameOf(node)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
