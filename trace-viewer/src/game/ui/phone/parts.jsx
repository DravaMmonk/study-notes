import { createElement, useRef } from 'react'
import { Check, ChevronRight, X } from 'lucide-react'
import { evaluate } from '../../engine/graph.js'
import { NODE_TYPES, inputsOf } from '../../engine/nodes.js'
import { FAMILIES, describe, familyOf, iconOf } from '../catalog.js'
import CurveView from '../views/CurveView.jsx'
import ValueView from '../views/ValueView.jsx'
import { formatNumber, kindOf } from '../views/views.js'
import { feeding, insertAfter } from './ops.js'
import Sheet from './Sheet.jsx'

// Pieces the phone circuit screen shares: the chip that shows a setting, the sheet for adding a
// part (each previewed where it would go), the list for choosing a source, and the test cards.

const PORT_TAGS = { a: 'a', b: 'b', left: '左', right: '右', c0: 'd0', c1: 'd1', c2: 'd2', c3: 'd3' }

export function ParamChip({ param, value }) {
  if (param.kind === 'select') return <>{param.options.find(([v]) => v === value)?.[1] ?? value}</>
  if (param.kind === 'kernel') {
    return (
      <span className="ph-mini-kernel" aria-label={param.learnable ? '训练出的 3×3 核' : '3×3 核'}>
        {value.map((w, i) => <i key={i} style={{ '--w': Math.max(-1, Math.min(1, w)) }} />)}
      </span>
    )
  }
  return <><i>{param.label}</i>{formatNumber(value ?? 0)}</>
}

// Every part, grouped by family, each previewed as if added here, on the current test.
export function AddSheet({ level, graph, anchor, next, test, anchorName, theme, onAdd, onClose }) {
  const groups = Object.entries(FAMILIES).map(([key, family]) => [family, level.palette.filter((type) => familyOf(type) === key)]).filter(([, types]) => types.length)
  const previewOf = (type) => {
    const { graph: trial, id } = insertAfter(graph, anchor, type, next)
    const { values, errors } = evaluate(trial, test.inputs)
    return errors.get(id) ? null : values.get(id)
  }
  return (
    <Sheet title={anchorName ? `接在「${anchorName}」后面` : '添加元件'} onClose={onClose}>
      {groups.map(([family, types]) => (
        <section key={family.label} className="ph-group">
          <h3>{family.label}</h3>
          <div className="ph-parts">
            {types.map((type) => {
              const value = previewOf(type)
              return (
                <button key={type} className="ph-part" data-family={familyOf(type)} onClick={() => onAdd(type)}>
                  <span className="ph-part-preview">
                    {value ? <ValueView img={value} size={kindOf(value) === 'signal' ? 92 : 64} theme={theme} /> : <span className="ph-part-need">{inputsOf(type).length > 1 ? `${inputsOf(type).length} 个输入` : '加上看看'}</span>}
                  </span>
                  <span className="ph-part-text">
                    <b><i className="family-chip">{createElement(iconOf(type), { size: 12, strokeWidth: 1.8 })}</i>{NODE_TYPES[type].label}</b>
                    <small>{describe(type)}</small>
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </Sheet>
  )
}

export function SourceSheet({ graph, node, port, options, nameOf, thumb, onPick, onClose }) {
  const current = feeding(graph, node.id, port)
  return (
    <Sheet title={`「${nameOf(node)}」${inputsOf(node.type).length > 1 ? ` 的输入 ${PORT_TAGS[port] ?? port}` : ' 读哪个结果'}`} onClose={onClose}>
      <div className="ph-sources">
        {options.map((n) => (
          <button key={n.id} className={`ph-source ${n.id === current ? 'is-on' : ''}`} onClick={() => onPick(n.id)}>
            {thumb(n, 56)}
            <span>{nameOf(n)}</span>
            {n.id === current ? <Check size={18} /> : <ChevronRight size={16} />}
          </button>
        ))}
        {current && <button className="ph-source is-clear" onClick={() => onPick(null)}><X size={18} /><span>断开</span></button>}
      </div>
    </Sheet>
  )
}

// The tests as cards to swipe through; the card in the middle is the test every thumbnail shows.
export function TestCarousel({ level, run, testIndex, onTestIndex, theme, views }) {
  const strip = useRef(null)
  const frame = useRef(0)
  const onScroll = () => {
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      const el = strip.current
      if (!el) return
      const card = el.firstElementChild?.getBoundingClientRect().width ?? 1
      const index = Math.max(0, Math.min(level.tests.length - 1, Math.round(el.scrollLeft / (card + 10))))
      if (index !== testIndex) onTestIndex(index)
    })
  }
  const go = (index) => {
    const el = strip.current
    const card = el?.children[index]
    if (card) el.scrollTo({ left: card.offsetLeft - el.offsetLeft - 12, behavior: 'smooth' })
    onTestIndex(index)
  }
  return (
    <section className="ph-tests" aria-label="测试">
      <div className="ph-tests-strip" ref={strip} onScroll={onScroll}>
        {level.tests.map((test, index) => {
          const result = run?.results[index]
          const [name, expected] = Object.entries(test.expected)[0]
          const actual = result?.outputs[name]
          const fits = actual?.w === expected.w && actual?.h === expected.h
          const kind = kindOf(expected)
          const tolerance = (test.check ?? level.check)?.tolerance ?? 0.02
          return (
            <article key={test.label} className={`ph-test ${index === testIndex ? 'is-active' : ''} ${result?.pass ? 'is-pass' : 'is-fail'}`} onClick={() => go(index)}>
              <header>{result?.pass ? <Check size={13} /> : <X size={13} />}<b>{test.label}</b><small>{index + 1}/{level.tests.length}</small></header>
              <div className="ph-test-row">
                <figure><ValueView img={Object.values(test.inputs)[0]} view={views.in} size={kindOf(Object.values(test.inputs)[0]) === 'image' ? 52 : 92} theme={theme} /><figcaption>输入</figcaption></figure>
                {kind === 'signal' ? (
                  <figure className="is-wide"><CurveView img={fits ? actual : null} expected={expected} tolerance={tolerance} width={120} height={52} /><figcaption>期望和你的</figcaption></figure>
                ) : kind === 'number' ? (
                  <figure className="is-wide ph-test-numbers"><span><b>{formatNumber(expected.data[0])}</b>期望</span><span><b className={result?.pass ? 'is-pass' : 'is-fail'}>{fits ? formatNumber(actual.data[0]) : '—'}</b>你的</span></figure>
                ) : (
                  <>
                    <figure><ValueView img={expected} view={views.out} size={52} theme={theme} /><figcaption>期望</figcaption></figure>
                    <figure><ValueView img={fits ? actual : null} view={views.out} size={52} theme={theme} label="—" /><figcaption>你的</figcaption></figure>
                  </>
                )}
              </div>
            </article>
          )
        })}
      </div>
      <div className="ph-dots" aria-hidden="true">
        {level.tests.map((t, index) => <i key={t.label} className={`${index === testIndex ? 'is-active' : ''} ${run?.results[index]?.pass ? 'is-pass' : ''}`} />)}
      </div>
    </section>
  )
}
