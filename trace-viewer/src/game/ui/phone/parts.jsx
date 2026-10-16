import { createElement, useRef } from 'react'
import { Check, ChevronRight, Circle, X } from 'lucide-react'
import { evaluate } from '../../engine/graph.js'
import { NODE_TYPES, inputsOf } from '../../engine/nodes.js'
import { FAMILIES, describe, familyOf, iconOf } from '../catalog.js'
import { L, keyOf, tr } from '../../i18n.js'
import CurveView from '../views/CurveView.jsx'
import ValueView from '../views/ValueView.jsx'
import { formatNumber, kindOf } from '../views/views.js'
import { feeding, insertAfter } from './ops.js'
import Sheet from './Sheet.jsx'
import { PORT_TAGS } from './wires.js'

// Pieces the phone circuit screen shares: the chip that shows a setting, the sheet for adding a
// part (each previewed where it would go), the list for choosing a source, and the test cards.


export function ParamChip({ param, value }) {
  if (param.kind === 'select') return <>{L(param.options.find(([v]) => v === value)?.[1]) ?? value}</>
  if (param.kind === 'kernel') {
    return (
      <span className="ph-mini-kernel" aria-label={param.learnable ? tr('训练出的 3×3 核', 'Trained 3×3 kernel') : tr('3×3 核', '3×3 kernel')}>
        {value.map((w, i) => <i key={i} style={{ '--w': Math.max(-1, Math.min(1, w)) }} />)}
      </span>
    )
  }
  return <><i>{L(param.label)}</i>{formatNumber(value ?? 0)}</>
}

// Every part, grouped by family, each previewed reading `previewFrom` on the current test.
export function AddSheet({ level, graph, previewFrom, test, title, theme, onAdd, onClose }) {
  const groups = Object.entries(FAMILIES).map(([key, family]) => [family, level.palette.filter((type) => familyOf(type) === key)]).filter(([, types]) => types.length)
  const previewOf = (type) => {
    const { graph: trial, id } = insertAfter(graph, previewFrom, type, null)
    const { values, errors } = evaluate(trial, test.inputs)
    return errors.get(id) ? null : values.get(id)
  }
  return (
    <Sheet title={title} onClose={onClose}>
      {groups.map(([family, types]) => (
        <section key={keyOf(family.label)} className="ph-group">
          <h3>{L(family.label)}</h3>
          <div className="ph-parts">
            {types.map((type) => {
              const value = previewOf(type)
              return (
                <button key={type} className="ph-part" data-family={familyOf(type)} onClick={() => onAdd(type)}>
                  <span className="ph-part-preview">
                    {value ? <ValueView img={value} size={kindOf(value) === 'signal' ? 92 : 64} theme={theme} /> : <span className="ph-part-need">{inputsOf(type).length > 1 ? tr(`${inputsOf(type).length} 个输入`, `${inputsOf(type).length} inputs`) : tr('加上看看', 'Add to see')}</span>}
                  </span>
                  <span className="ph-part-text">
                    <b><i className="family-chip">{createElement(iconOf(type), { size: 12, strokeWidth: 1.8 })}</i>{L(NODE_TYPES[type].label)}</b>
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
    <Sheet title={inputsOf(node.type).length > 1 ? tr(`「${nameOf(node)}」 的输入 ${L(PORT_TAGS[port]) ?? port}`, `"${nameOf(node)}" input ${L(PORT_TAGS[port]) ?? port}`) : tr(`「${nameOf(node)}」 读哪个结果`, `Which result "${nameOf(node)}" reads`)} onClose={onClose}>
      <div className="ph-sources">
        {options.map((n) => (
          <button key={n.id} className={`ph-source ${n.id === current ? 'is-on' : ''}`} onClick={() => onPick(n.id)}>
            {thumb(n, 56)}
            <span>{nameOf(n)}</span>
            {n.id === current ? <Check size={18} /> : <ChevronRight size={16} />}
          </button>
        ))}
        {current && <button className="ph-source is-clear" onClick={() => onPick(null)}><X size={18} /><span>{tr('断开', 'Disconnect')}</span></button>}
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
    <section className="ph-tests" aria-label={tr('测试', 'Tests')}>
      <div className="ph-tests-strip" ref={strip} onScroll={onScroll}>
        {level.tests.map((test, index) => {
          const result = run?.results[index]
          const verdict = result?.pass === null ? '' : result?.pass ? 'is-pass' : 'is-fail'
          const [name, expected] = Object.entries(test.expected)[0]
          const actual = result?.outputs[name]
          const fits = actual?.w === expected.w && actual?.h === expected.h
          const kind = kindOf(expected)
          const tolerance = (test.check ?? level.check)?.tolerance ?? 0.02
          return (
            <article key={keyOf(test.label)} className={`ph-test ${index === testIndex ? 'is-active' : ''} ${verdict}`} onClick={() => go(index)}>
              <header>{verdict === '' ? <Circle size={11} /> : result?.pass ? <Check size={13} /> : <X size={13} />}<b>{L(test.label)}</b>{test.hidden && <em className="hidden-tag">{tr('隐藏', 'hidden')}</em>}<small>{index + 1}/{level.tests.length}</small></header>
              <div className="ph-test-row">
                <figure><ValueView img={Object.values(test.inputs)[0]} view={views.in} size={kindOf(Object.values(test.inputs)[0]) === 'image' ? 64 : 104} theme={theme} /><figcaption>{tr('输入', 'Input')}</figcaption></figure>
                {kind === 'signal' ? (
                  <figure className="is-wide"><CurveView img={fits ? actual : null} expected={expected} tolerance={tolerance} width={150} height={64} /><figcaption>{tr('期望和你的', 'Expected and yours')}</figcaption></figure>
                ) : kind === 'number' ? (
                  <figure className="is-wide ph-test-numbers"><span><b>{formatNumber(expected.data[0])}</b>{tr('期望', 'expected')}</span><span><b className={verdict}>{fits ? formatNumber(actual.data[0]) : '—'}</b>{tr('你的', 'yours')}</span></figure>
                ) : (
                  <>
                    <figure><ValueView img={expected} view={views.out} size={64} theme={theme} /><figcaption>{tr('期望', 'Expected')}</figcaption></figure>
                    <figure><ValueView img={fits ? actual : null} view={views.out} size={64} theme={theme} label="—" /><figcaption>{tr('你的', 'Yours')}</figcaption></figure>
                  </>
                )}
              </div>
            </article>
          )
        })}
      </div>
      <div className="ph-dots" aria-hidden="true">
        {level.tests.map((t, index) => <i key={keyOf(t.label)} className={`${index === testIndex ? 'is-active' : ''} ${run?.results[index]?.pass ? 'is-pass' : ''}`} />)}
      </div>
    </section>
  )
}
