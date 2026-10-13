import { createElement, useEffect, useRef, useState } from 'react'
import { ArrowDownToLine, Check, ChevronRight, List, Plus, Trash2, Undo2, X } from 'lucide-react'
import { wouldCycle } from '../../engine/graph.js'
import { NODE_TYPES, inputsOf } from '../../engine/nodes.js'
import { describe, familyOf, iconOf } from '../catalog.js'
import ValueView from '../views/ValueView.jsx'
import ViewSwitch from '../views/ViewSwitch.jsx'
import { KIND_NAMES, kindOf, nodeView } from '../views/views.js'
import CircuitMap from './CircuitMap.jsx'
import { ChoiceEditor, KernelEditor, NumberEditor } from './Editors.jsx'
import { NUMBERS, connect, feeding, insertAfter, layout, setParam, skip, tailOf } from './ops.js'
import { AddSheet, ParamChip, SourceSheet, TestCarousel } from './parts.jsx'
import Sheet from './Sheet.jsx'
import './phone.css'

const buzz = (pattern = 8) => navigator.vibrate?.(pattern)
const PORT_TAGS = { a: 'a', b: 'b', left: '左', right: '右', c0: 'd0', c1: 'd1', c2: 'd2', c3: 'd3' }
const DOCK = { s: 30, m: 46, l: 74 } // dock heights, in % of the screen

// The phone's circuit screen, in two zones. The upper one is the circuit map: the whole circuit,
// laid out by data flow, always in view. The lower one is a dock with three tabs: the task, the
// selected block (its inputs, settings and result) and the tests. Wiring is done on the map: tap
// an input in the dock, then tap the block on the map that should feed it.
export default function PhoneCircuit({ level, graph, onChange, run, testIndex, onTestIndex, flags, inputLabels, outputLabels, ioKinds, views, theme, scan, onScan, brief, training, footer, testDetails }) {
  const [tab, setTab] = useState('task')
  const [selected, setSelected] = useState(null)
  const [picking, setPicking] = useState(null) // { node, port } while choosing a source on the map
  const [sheet, setSheet] = useState(null)
  const [history, setHistory] = useState([])
  const [toast, setToast] = useState(null)
  const [dock, setDock] = useState('m')
  const values = run?.results[testIndex]?.values
  const errors = run?.results[testIndex]?.errors
  const checks = run?.results[testIndex]?.checks
  const { sources, steps } = layout(graph)
  const passed = run?.results.filter((r) => r.pass).length ?? 0
  const all = level.tests.length
  const byId = (id) => graph.nodes.find((n) => n.id === id)
  const node = byId(selected)

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
    if (selected && !history.at(-1).nodes.some((n) => n.id === selected)) setSelected(null)
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

  const nameOf = (n) => {
    if (!n) return ''
    if (n.type === 'input') return inputLabels?.[n.params.name] ?? (sources.length > 1 ? n.params.name : '输入')
    if (n.type === 'output') return outputLabels?.[n.params.name] ?? '输出'
    const index = steps.indexOf(n)
    return `${NUMBERS[index] ?? `#${index + 1}`} ${NODE_TYPES[n.type].label}`
  }
  const thumb = (n, size = 52) => {
    const value = values?.get(n.id)
    if (errors?.get(n.id)) return <span className="ph-thumb-error" style={{ width: size, height: size }}>!</span>
    return <ValueView img={value} view={nodeView(n, views)} size={kindOf(value) === 'signal' ? size * 1.6 : size} theme={theme} label="—" />
  }
  const nextAfter = (id) => {
    const chain = [...sources, ...steps]
    const i = chain.findIndex((n) => n.id === id)
    return chain[i + 1]?.type === 'input' ? null : chain[i + 1]?.id ?? null
  }
  const canFeed = (id) => picking && id !== picking.node && byId(id)?.type !== 'output' && !wouldCycle(graph, id, picking.node)

  const tap = (id) => {
    if (picking) {
      if (id === picking.node) return setPicking(null)
      if (!canFeed(id)) return undefined
      buzz()
      edit(connect(graph, picking.node, picking.port, id))
      setPicking(null)
      return undefined
    }
    buzz(4)
    setSelected(id)
    setTab('node')
    return undefined
  }
  const add = (type) => {
    const anchor = sheet.anchor
    let { graph: next, id } = insertAfter(graph, anchor, type, nextAfter(anchor))
    // The first part of a circuit also becomes what the output shows.
    const out = next.nodes.find((n) => n.type === 'output')
    if (out && !feeding(next, out.id, 'in')) next = connect(next, out.id, 'in', id)
    buzz()
    edit(next)
    setSheet(null)
    setSelected(id)
    setTab('node')
  }
  const remove = (n) => {
    buzz([6, 40, 6])
    edit(skip(graph, n.id), `已删除 ${nameOf(n)}`)
    setSelected(null)
  }
  const startPick = (n, port) => {
    buzz(4)
    setPicking({ node: n.id, port })
    if (dock === 'l') setDock('m')
  }

  // Drag the dock's handle to make it smaller or larger; it settles on the nearest size.
  const handle = useRef(null)
  const onHandleDown = (event) => {
    handle.current = { y: event.clientY, start: DOCK[dock] }
  }
  const onHandleUp = (event) => {
    if (!handle.current) return
    const dy = event.clientY - handle.current.y
    if (Math.abs(dy) < 6) setDock(dock === 'l' ? 'm' : dock === 'm' ? 'l' : 'm')
    else {
      const target = handle.current.start - (dy / window.innerHeight) * 100
      setDock(Object.entries(DOCK).reduce((best, [key, h]) => (Math.abs(h - target) < Math.abs(DOCK[best] - target) ? key : best), 'm'))
    }
    handle.current = null
  }

  return (
    <div className="pc" style={{ '--dock': `${DOCK[dock]}%` }}>
      <section className="pc-map" aria-label="电路图">
        {picking ? (
          <div className="pc-banner is-picking">
            <span>点一块，接到「{nameOf(byId(picking.node))}」{inputsOf(byId(picking.node).type).length > 1 ? `的 ${PORT_TAGS[picking.port] ?? picking.port}` : ''}</span>
            <button onClick={() => setSheet({ kind: 'source', node: picking.node, port: picking.port })} aria-label="从列表选"><List size={16} /></button>
            <button onClick={() => setPicking(null)}>取消</button>
          </div>
        ) : (
          <button className={`pc-pass ${run?.pass ? 'is-pass' : ''}`} onClick={() => setTab('tests')}>
            {run?.pass ? <Check size={14} /> : <X size={14} />}{passed}/{all} 通过
          </button>
        )}
        <CircuitMap graph={graph} values={values} errors={errors} checks={checks} views={views} theme={theme} selected={selected} picking={picking} canFeed={canFeed} nameOf={nameOf} onTap={tap} />
      </section>

      <section className="pc-dock" aria-label="控制台">
        <div className="pc-handle" onPointerDown={onHandleDown} onPointerUp={onHandleUp} onPointerCancel={() => { handle.current = null }} role="button" aria-label="调整控制台高度"><i /></div>
        <header className="pc-dock-head">
          <div className="pc-tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'task'} onClick={() => setTab('task')}>任务</button>
            <button role="tab" aria-selected={tab === 'node'} onClick={() => setTab('node')}>{node ? nameOf(node) : '选中的块'}</button>
            <button role="tab" aria-selected={tab === 'tests'} className={run?.pass ? 'is-pass' : ''} onClick={() => setTab('tests')}>测试 {passed}/{all}</button>
          </div>
          <button className="pc-undo" onClick={undo} disabled={!history.length} aria-label="撤销"><Undo2 size={18} /></button>
          {level.palette.length > 0 && (
            <button className="pc-add" onClick={() => { buzz(); setSheet({ kind: 'add', anchor: node && node.type !== 'output' ? node.id : tailOf(graph) }) }} aria-label={node && node.type !== 'output' ? `在 ${nameOf(node)} 后面添加` : '添加元件'}><Plus size={20} /></button>
          )}
        </header>

        <div className="pc-dock-body">
          {tab === 'task' && (
            <div className="pc-task">
              {brief}
              <p className="pc-howto">上面是整个电路：从「输入」往下流到「输出」。点一块在这里调它；点「＋」加元件，会接在选中的那块后面。</p>
              {footer}
            </div>
          )}

          {tab === 'node' && !node && (
            <div className="pc-empty">
              <p>点电路图上的一块，就能在这里看它读什么、怎么设置、算出了什么。</p>
              {level.palette.length > 0 && <button className="bk-btn is-primary" onClick={() => setSheet({ kind: 'add', anchor: tailOf(graph) })}><Plus size={16} />添加第一个元件</button>}
            </div>
          )}

          {tab === 'node' && node && (
            <Inspector
              node={node}
              graph={graph}
              flags={flags}
              ioKinds={ioKinds}
              nameOf={nameOf}
              byId={byId}
              thumb={thumb}
              value={values?.get(node.id)}
              error={errors?.get(node.id)}
              check={node.type === 'output' ? checks?.find((c) => c.name === node.params.name) : null}
              expected={node.type === 'output' ? level.tests[testIndex].expected[node.params.name] : null}
              views={views}
              theme={theme}
              scan={scan}
              onScan={onScan}
              picking={picking}
              onPick={startPick}
              onParam={(key) => setSheet({ kind: 'param', node: node.id, key, before: graph })}
              onView={(v) => onChange({ ...graph, nodes: graph.nodes.map((n) => (n.id === node.id ? { ...n, view: v } : n)) }, { keep: true })}
              onInsert={level.palette.length > 0 && node.type !== 'output' ? () => setSheet({ kind: 'add', anchor: node.id }) : null}
              onDelete={NODE_TYPES[node.type].fixed ? null : () => remove(node)}
            />
          )}

          {tab === 'tests' && (
            <div className="pc-tests">
              <TestCarousel level={level} run={run} testIndex={testIndex} onTestIndex={onTestIndex} theme={theme} views={views} graph={graph} />
              <button className="bk-btn pc-detail" onClick={() => setSheet({ kind: 'tests' })}>看这组测试的详情<ChevronRight size={15} /></button>
              {training}
            </div>
          )}
        </div>
      </section>

      {toast && (
        <div className="ph-toast pc-toast" role="status">
          <span>{toast}</span>
          <button onClick={undo}>撤销</button>
        </div>
      )}

      {sheet?.kind === 'add' && (
        <AddSheet level={level} graph={graph} anchor={sheet.anchor} next={nextAfter(sheet.anchor)} test={level.tests[testIndex]} anchorName={nameOf(byId(sheet.anchor))} theme={theme} onAdd={add} onClose={() => setSheet(null)} />
      )}
      {sheet?.kind === 'source' && (
        <SourceSheet graph={graph} node={byId(sheet.node)} port={sheet.port} options={[...sources, ...steps].filter((n) => n.id !== sheet.node && !wouldCycle(graph, n.id, sheet.node))} nameOf={nameOf} thumb={thumb} onPick={(from) => { buzz(); edit(connect(graph, sheet.node, sheet.port, from)); setSheet(null); setPicking(null) }} onClose={() => setSheet(null)} />
      )}
      {sheet?.kind === 'param' && (() => {
        const target = byId(sheet.node)
        const param = NODE_TYPES[target.type].params.find((p) => p.key === sheet.key)
        // A whole session in the sheet is one undo step: the graph from when it opened.
        const change = (v) => onChange(setParam(graph, target.id, param.key, v))
        const close = () => {
          if (graph !== sheet.before) setHistory((h) => [...h.slice(-49), sheet.before])
          setSheet(null)
        }
        return (
          <Sheet title={`${nameOf(target)} · ${param.label}`} onClose={close} footer={<div className="ph-live"><span>这一步现在的结果</span>{thumb(target, 96)}</div>}>
            {param.kind === 'select' ? <ChoiceEditor param={param} value={target.params[param.key]} onChange={change} /> : param.kind === 'kernel' ? <KernelEditor param={param} value={target.params[param.key]} onChange={change} /> : <NumberEditor param={param} value={target.params[param.key]} onChange={change} />}
          </Sheet>
        )
      })()}
      {sheet?.kind === 'tests' && <Sheet title={`测试 ${passed} / ${all}`} onClose={() => setSheet(null)}>{testDetails}</Sheet>}
    </div>
  )
}

// The selected block: where its inputs come from (tap to choose on the map), its settings, and
// what it makes on the current test.
function Inspector({ node, graph, flags, ioKinds, nameOf, byId, thumb, value, error, check, expected, views, theme, scan, onScan, picking, onPick, onParam, onView, onInsert, onDelete }) {
  const spec = NODE_TYPES[node.type]
  const ports = node.type === 'input' ? [] : inputsOf(node.type)
  const params = (spec.params ?? []).filter((p) => !p.unlock || flags.has(p.unlock))
  const shown = nodeView(node, views)
  return (
    <div className="pc-inspect" data-family={familyOf(node.type)}>
      <header className="pc-inspect-head">
        <span className="ph-node">{node.type === 'output' ? <ArrowDownToLine size={15} /> : createElement(iconOf(node.type), { size: 15, strokeWidth: 1.8 })}</span>
        <div>
          <b>{nameOf(node)}</b>
          <small>{node.type === 'input' || node.type === 'output' ? KIND_NAMES[ioKinds?.[node.params.name]] : describe(node.type)}</small>
        </div>
        {onDelete && <button className="pc-icon is-danger" onClick={onDelete} aria-label="删除这一块"><Trash2 size={17} /></button>}
      </header>

      {ports.length > 0 && (
        <div className="pc-section">
          <span className="pc-label">读哪个结果 · 点一下，再到图上点来源</span>
          <div className="pc-ports">
            {ports.map((port) => {
              const from = byId(feeding(graph, node.id, port))
              const active = picking?.node === node.id && picking.port === port
              return (
                <button key={port} className={`pc-port ${from ? '' : 'is-empty'} ${active ? 'is-active' : ''}`} onClick={() => onPick(node, port)}>
                  {ports.length > 1 && <i>{PORT_TAGS[port] ?? port}</i>}
                  {from ? thumb(from, 38) : null}
                  <span>{active ? '在图上点一块…' : from ? nameOf(from) : '还没接'}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {params.length > 0 && (
        <div className="pc-section">
          <span className="pc-label">设置</span>
          <div className="ph-chips">
            {params.map((param) => (
              <button key={param.key} className="ph-pill is-param" onClick={() => onParam(param.key)}>
                <ParamChip param={param} value={node.params[param.key]} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="pc-section pc-result">
        <span className="pc-label">{node.type === 'output' ? (check?.pass ? '这组通过' : check?.reason || '还没通过') : '算出的结果（当前这组测试）'}</span>
        {error ? (
          <p className="ph-error">{error}</p>
        ) : node.type === 'output' && expected ? (
          <div className="pc-compare">
            <figure><ValueView img={expected} view={shown} size={kindOf(expected) === 'image' ? 140 : 150} theme={theme} /><figcaption>期望</figcaption></figure>
            <figure><ValueView img={value} view={shown} size={kindOf(expected) === 'image' ? 140 : 150} theme={theme} label="未连接" /><figcaption>你的</figcaption></figure>
          </div>
        ) : (
          <ValueView img={value} view={shown} size={kindOf(value) === 'image' ? 180 : 300} theme={theme} label="还没有结果" grid scan={scan} onScan={onScan} />
        )}
        {kindOf(value ?? expected) === 'image' && <ViewSwitch value={shown} onChange={onView} compact />}
      </div>

      {onInsert && <button className="bk-btn pc-insert" onClick={onInsert}><Plus size={15} />在这块后面接一个元件</button>}
    </div>
  )
}
