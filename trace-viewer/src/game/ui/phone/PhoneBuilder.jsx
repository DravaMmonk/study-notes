import { createElement, useEffect, useRef, useState } from 'react'
import { Check, ChevronRight, Plus, Trash2, Undo2, X } from 'lucide-react'
import { evaluate, wouldCycle } from '../../engine/graph.js'
import { NODE_TYPES, inputsOf } from '../../engine/nodes.js'
import { FAMILIES, describe, familyOf, iconOf } from '../catalog.js'
import CurveView from '../views/CurveView.jsx'
import ValueView from '../views/ValueView.jsx'
import ViewSwitch from '../views/ViewSwitch.jsx'
import { KIND_NAMES, formatNumber, kindOf, nodeView } from '../views/views.js'
import { ChoiceEditor, KernelEditor, NumberEditor } from './Editors.jsx'
import { NUMBERS, connect, feeding, insertAfter, isUsed, layout, setParam, skip, tailOf } from './ops.js'
import Sheet from './Sheet.jsx'
import './phone.css'

const buzz = (pattern = 8) => navigator.vibrate?.(pattern)
const PORT_TAGS = { a: 'a', b: 'b', left: '左', right: '右', c0: 'd0', c1: 'd1', c2: 'd2', c3: 'd3' }

// The phone's circuit builder, modelled on a vertical pipeline: blocks hang on a spine in the order
// data flows, each showing what it reads (pills), its settings (chips) and what it makes (a live
// thumbnail). Every choice happens in a bottom sheet within thumb reach, with pictures: sources are
// chosen by their thumbnails, parts are previewed on the current test before they are added, and
// numbers are typed on the game's own keypad. Tests swipe along the top; undo is always one tap.
export default function PhoneBuilder({ level, graph, onChange, run, testIndex, onTestIndex, flags, inputLabels, outputLabels, ioKinds, views, theme, scan, onScan, footer, testDetails }) {
  const [sheet, setSheet] = useState(null) // { kind: 'add' | 'source' | 'param' | 'tests', ... }
  const [open, setOpen] = useState(null) // block whose preview is expanded
  const [history, setHistory] = useState([])
  const [toast, setToast] = useState(null)
  const values = run?.results[testIndex]?.values
  const errors = run?.results[testIndex]?.errors
  const { sources, steps, outputs } = layout(graph)
  const passed = run?.results.filter((r) => r.pass).length ?? 0
  const all = level.tests.length

  // Every change made here can be undone; a change of view is only remembered, not undoable.
  const edit = (next, note) => {
    setHistory((h) => [...h.slice(-49), graph])
    onChange(next)
    if (note) setToast(note)
  }
  const undo = () => {
    if (!history.length) return
    buzz()
    onChange(history.at(-1))
    setHistory((h) => h.slice(0, -1))
    setToast(null)
  }
  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])
  const wasPassing = useRef(run?.pass)
  useEffect(() => {
    if (run?.pass && !wasPassing.current) buzz([12, 60, 18])
    wasPassing.current = run?.pass
  }, [run?.pass])

  const nameOf = (node) => {
    if (!node) return ''
    if (node.type === 'input') return inputLabels?.[node.params.name] ?? (sources.length > 1 ? node.params.name : '输入')
    if (node.type === 'output') return outputLabels?.[node.params.name] ?? '输出'
    const index = steps.indexOf(node)
    return `${NUMBERS[index] ?? `#${index + 1}`} ${NODE_TYPES[node.type].label}`
  }
  const byId = (id) => graph.nodes.find((n) => n.id === id)
  const thumb = (node, size = 52) => {
    const value = values?.get(node.id)
    if (errors?.get(node.id)) return <span className="ph-thumb-error" style={{ width: size, height: size }}>!</span>
    return <ValueView img={value} view={nodeView(node, views)} size={kindOf(value) === 'signal' ? size * 1.6 : size} theme={theme} label="—" />
  }
  const nextAfter = (id) => {
    const chain = [...sources, ...steps]
    const i = chain.findIndex((n) => n.id === id)
    return chain[i + 1]?.type === 'input' ? null : chain[i + 1]?.id ?? null
  }

  const add = (type) => {
    const anchor = sheet.anchor
    let { graph: next, id } = insertAfter(graph, anchor, type, nextAfter(anchor))
    // The first part of a circuit also becomes what the output shows.
    const out = next.nodes.find((n) => n.type === 'output')
    if (out && !feeding(next, out.id, 'in') && NODE_TYPES[type].outputs?.length !== 0) next = connect(next, out.id, 'in', id)
    buzz()
    edit(next)
    setSheet(null)
    setOpen(id)
  }
  const remove = (node) => {
    buzz([6, 40, 6])
    edit(skip(graph, node.id), `已删除 ${nameOf(node)}`)
    setOpen(null)
  }

  return (
    <div className="ph">
      <TestCarousel level={level} run={run} testIndex={testIndex} onTestIndex={onTestIndex} theme={theme} views={views} graph={graph} />

      <ol className="ph-flow" aria-label="电路">
        {sources.map((node) => (
          <Block key={node.id} node={node} kind="source" title={nameOf(node)} subtitle={KIND_NAMES[ioKinds?.[node.params.name]]} thumb={thumb(node)} expanded={open === node.id} onToggle={() => setOpen(open === node.id ? null : node.id)} onInsert={() => setSheet({ kind: 'add', anchor: node.id })} preview={<Expanded node={node} value={values?.get(node.id)} error={errors?.get(node.id)} views={views} theme={theme} scan={scan} onScan={onScan} onView={(v) => onChange({ ...graph, nodes: graph.nodes.map((n) => (n.id === node.id ? { ...n, view: v } : n)) }, { keep: true })} />} />
        ))}
        {steps.map((node) => {
          const spec = NODE_TYPES[node.type]
          const params = (spec.params ?? []).filter((p) => !p.unlock || flags.has(p.unlock))
          return (
            <Block
              key={node.id}
              node={node}
              kind="step"
              title={nameOf(node)}
              unused={!isUsed(graph, node.id)}
              thumb={thumb(node)}
              expanded={open === node.id}
              onToggle={() => setOpen(open === node.id ? null : node.id)}
              onInsert={() => setSheet({ kind: 'add', anchor: node.id })}
              onSwipeDelete={() => remove(node)}
              chips={
                <>
                  {inputsOf(node.type).map((port) => {
                    const from = byId(feeding(graph, node.id, port))
                    return (
                      <button key={port} className={`ph-pill is-source ${from ? '' : 'is-empty'}`} onClick={() => setSheet({ kind: 'source', node: node.id, port })}>
                        {inputsOf(node.type).length > 1 && <i>{PORT_TAGS[port] ?? port}</i>}
                        {from ? nameOf(from) : '选输入'}
                      </button>
                    )
                  })}
                  {params.map((param) => (
                    <button key={param.key} className="ph-pill is-param" onClick={() => setSheet({ kind: 'param', node: node.id, key: param.key, before: graph })}>
                      <ParamChip param={param} value={node.params[param.key]} />
                    </button>
                  ))}
                </>
              }
              preview={
                <Expanded node={node} value={values?.get(node.id)} error={errors?.get(node.id)} views={views} theme={theme} scan={scan} onScan={onScan} onView={(v) => onChange({ ...graph, nodes: graph.nodes.map((n) => (n.id === node.id ? { ...n, view: v } : n)) }, { keep: true })} onDelete={() => remove(node)} description={describe(node.type)} />
              }
            />
          )
        })}
        {outputs.map((node) => {
          const from = byId(feeding(graph, node.id, 'in'))
          const check = run?.results[testIndex]?.checks.find((c) => c.name === node.params.name)
          return (
            <li key={node.id} className={`ph-block is-output ${check?.pass ? 'is-pass' : 'is-fail'}`}>
              <span className="ph-node">{check?.pass ? <Check size={16} /> : <X size={16} />}</span>
              <div className="ph-body">
                <div className="ph-title"><b>{nameOf(node)}</b><small>{KIND_NAMES[ioKinds?.[node.params.name]]}</small></div>
                <div className="ph-chips">
                  <button className={`ph-pill is-source ${from ? '' : 'is-empty'}`} onClick={() => setSheet({ kind: 'source', node: node.id, port: 'in' })}>{from ? nameOf(from) : '选结果'}</button>
                  <span className={`ph-verdict ${check?.pass ? 'is-pass' : ''}`}>{check?.pass ? '这组通过' : check?.reason || '未通过'}</span>
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      {footer && <div className="ph-footer">{footer}</div>}

      <nav className="ph-bar" aria-label="操作">
        <button className="ph-bar-undo" onClick={undo} disabled={!history.length} aria-label="撤销"><Undo2 size={20} /></button>
        {level.palette.length > 0 && (
          <button className="ph-bar-add" onClick={() => { buzz(); setSheet({ kind: 'add', anchor: tailOf(graph) }) }}><Plus size={20} />添加元件</button>
        )}
        <button className={`ph-bar-tests ${run?.pass ? 'is-pass' : ''}`} onClick={() => setSheet({ kind: 'tests' })} aria-label={`测试 ${passed} / ${all}，看详情`}>
          {run?.pass ? <Check size={16} /> : null}{passed}/{all}
        </button>
      </nav>

      {toast && (
        <div className="ph-toast" role="status">
          <span>{toast}</span>
          <button onClick={undo}>撤销</button>
        </div>
      )}

      {sheet?.kind === 'add' && (
        <AddSheet level={level} graph={graph} anchor={sheet.anchor} next={nextAfter(sheet.anchor)} test={level.tests[testIndex]} anchorName={nameOf(byId(sheet.anchor))} theme={theme} onAdd={add} onClose={() => setSheet(null)} />
      )}
      {sheet?.kind === 'source' && (
        <SourceSheet graph={graph} node={byId(sheet.node)} port={sheet.port} options={[...sources, ...steps].filter((n) => n.id !== sheet.node && !wouldCycle(graph, n.id, sheet.node))} nameOf={nameOf} thumb={thumb} onPick={(from) => { buzz(); edit(connect(graph, sheet.node, sheet.port, from)); setSheet(null) }} onClose={() => setSheet(null)} />
      )}
      {sheet?.kind === 'param' && (() => {
        const node = byId(sheet.node)
        const param = NODE_TYPES[node.type].params.find((p) => p.key === sheet.key)
        // A whole session in the sheet is one undo step: the graph from when it opened.
        const change = (v) => onChange(setParam(graph, node.id, param.key, v))
        const close = () => {
          if (graph !== sheet.before) setHistory((h) => [...h.slice(-49), sheet.before])
          setSheet(null)
        }
        return (
          <Sheet title={`${nameOf(node)} · ${param.label}`} onClose={close} footer={<div className="ph-live"><span>这一步现在的结果</span>{thumb(node, 64)}</div>}>
            {param.kind === 'select' ? <ChoiceEditor param={param} value={node.params[param.key]} onChange={change} /> : param.kind === 'kernel' ? <KernelEditor param={param} value={node.params[param.key]} onChange={change} /> : <NumberEditor param={param} value={node.params[param.key]} onChange={change} />}
          </Sheet>
        )
      })()}
      {sheet?.kind === 'tests' && (
        <Sheet title={`测试 ${passed} / ${all}`} onClose={() => setSheet(null)}>{testDetails}</Sheet>
      )}
    </div>
  )
}

// One block on the spine. Swipe it left to delete; tap the thumbnail to see the result large.
function Block({ node, kind, title, subtitle, chips, thumb, expanded, onToggle, onInsert, onSwipeDelete, preview, unused }) {
  const [dx, setDx] = useState(0)
  const start = useRef(null)
  const swipe = onSwipeDelete
    ? {
        onPointerDown: (event) => {
          if (event.pointerType === 'mouse' || event.target.closest('button')) return
          start.current = { x: event.clientX, y: event.clientY, locked: false }
        },
        onPointerMove: (event) => {
          if (!start.current) return
          const ddx = event.clientX - start.current.x
          const ddy = event.clientY - start.current.y
          if (!start.current.locked && Math.abs(ddy) > Math.abs(ddx)) {
            start.current = null
            return
          }
          start.current.locked = true
          setDx(Math.min(0, ddx))
        },
        onPointerUp: () => {
          if (dx < -90) onSwipeDelete()
          start.current = null
          setDx(0)
        },
        onPointerCancel: () => {
          start.current = null
          setDx(0)
        },
      }
    : {}
  return (
    <>
      <li className={`ph-block is-${kind} ${expanded ? 'is-open' : ''} ${unused ? 'is-unused' : ''}`} data-family={familyOf(node.type)}>
        {onSwipeDelete && <span className="ph-swipe-bin" style={{ opacity: Math.min(1, -dx / 90) }} aria-hidden="true"><Trash2 size={18} /></span>}
        <div className="ph-row" style={{ transform: dx ? `translateX(${dx}px)` : undefined }} {...swipe}>
          <span className="ph-node">{createElement(iconOf(node.type), { size: 15, strokeWidth: 1.8 })}</span>
          <div className="ph-body">
            <div className="ph-title">
              <b>{title}</b>
              {subtitle && <small>{subtitle}</small>}
              {unused && <small className="ph-unused">结果没用上</small>}
            </div>
            {chips && <div className="ph-chips">{chips}</div>}
          </div>
          <button className="ph-thumb" onClick={onToggle} aria-expanded={expanded} aria-label={`${title} 的结果`}>
            {thumb}
          </button>
        </div>
        {expanded && <div className="ph-expand">{preview}</div>}
      </li>
      <li className="ph-insert">
        <button onClick={onInsert} aria-label={`在 ${title} 后面插入`}><Plus size={14} /></button>
      </li>
    </>
  )
}

function Expanded({ node, value, error, views, theme, scan, onScan, onView, onDelete, description }) {
  const shown = nodeView(node, views)
  return (
    <>
      {description && <p className="ph-desc">{description}</p>}
      {error ? <p className="ph-error">{error}</p> : <ValueView img={value} view={shown} size={kindOf(value) === 'image' ? 220 : 300} theme={theme} label="还没有结果" grid scan={scan} onScan={onScan} />}
      <div className="ph-expand-actions">
        {kindOf(value) === 'image' && <ViewSwitch value={shown} onChange={onView} compact />}
        {onDelete && <button className="ph-delete" onClick={onDelete}><Trash2 size={15} />删除这一步</button>}
      </div>
    </>
  )
}

function ParamChip({ param, value }) {
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
function AddSheet({ level, graph, anchor, next, test, anchorName, theme, onAdd, onClose }) {
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

function SourceSheet({ graph, node, port, options, nameOf, thumb, onPick, onClose }) {
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
function TestCarousel({ level, run, testIndex, onTestIndex, theme, views }) {
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
