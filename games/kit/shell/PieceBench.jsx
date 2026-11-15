import { useState } from 'react'
import { ArrowLeft, Maximize2 } from 'lucide-react'
import CanvasEditor from '../circuit/CanvasEditor.jsx'
import SlotBoard from '../circuit/SlotBoard.jsx'
import DemoBench from '../circuit/DemoBench.jsx'
import Choice from '../circuit/Choice.jsx'
import InteractiveDrawing from './InteractiveDrawing.jsx'
import { L, tr } from './i18n.js'

const stop = (event) => event.stopPropagation()
const idle = () => {}
const cannotLand = () => false

function SignalControl({ kind, value, shown, change }) {
  if (kind === 'bool') return <span className="demo-yn" onPointerDown={stop}>
    {[[true, tr('是', 'yes')], [false, tr('否', 'no')]].map(([v, label]) => (
      <button key={label} type="button" aria-pressed={value === v} onClick={() => change(v)}>{label}</button>
    ))}
  </span>
  if (kind.endsWith('s')) {
    const text = Array.isArray(value) ? value.map((v) => (v === null ? '—' : typeof v === 'boolean' ? (v ? 'y' : 'n') : v)).join(' ') : ''
    const parse = (raw) => raw.split(/[\s,，]+/).filter(Boolean).map((x) => (x === '—' || x === '-' ? null : /^(y|是)$/i.test(x) ? true : /^(n|否)$/i.test(x) ? false : Number(x))).filter((x) => x === null || typeof x === 'boolean' || Number.isFinite(x))
    return <input className="demo-list" defaultValue={text} onPointerDown={stop} onBlur={(event) => change(parse(event.target.value))} onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()} aria-label={tr('一段数，用空格隔开')} />
  }
  const step = (d) => change(value === null || typeof value !== 'number' ? 0 : Math.round((value + d) * 100) / 100)
  return <span className="demo-num" onPointerDown={stop}>
    <button type="button" onClick={() => step(-1)} aria-label={tr('减 1')}>−</button>
    <output>{shown}</output>
    <button type="button" onClick={() => step(1)} aria-label={tr('加 1')}>+</button>
    <button type="button" className={value === null ? 'is-on' : ''} onClick={() => change(value === null ? 0 : null)} title={tr('「—」：这里什么也没有')}>—</button>
  </span>
}

function Controls({ controls, roomy }) {
  return controls.map(({ key, kind, label, options, value, change, shown }) => kind === 'choice'
    ? <div key={key} className="param is-choice">
      {!roomy && <span>{L(label)}</span>}
      <Choice options={options} value={value} onChange={change} label={L(label)} roomy={roomy} />
    </div>
    : <SignalControl key={key} {...{ kind, value, shown, change }} />)
}

function Board({ view, layout, phone, selected, onPick = idle, onMove, open }) {
  const { graph, parts, readout, wireState, outNote, height } = view
  const nodeClass = (node) => [node.id === selected && 'is-selected', readout(node).focus && 'is-focus'].filter(Boolean).join(' ')
  if (phone) return <SlotBoard fixed graph={graph} parts={parts} nameOf={(node) => (node ? L(parts.label(node)) : '')}
    thumb={(node) => {
      const value = readout(node).value
      return !readout(node).hide && <i className={`${layout.thumb} ${value && value !== '—' ? 'is-on' : ''}`}>{value || '—'}</i>
    }}
    tileExtra={(node) => L(readout(node).tag)} outNote={outNote} picking={null} canLand={cannotLand} onPort={idle} onSlot={idle} onNode={onPick} nodeClass={nodeClass}
  />
  return <div className={layout.canvas} style={{ height }}>
    <CanvasEditor readOnly={!onMove} graph={graph} parts={parts} onChange={onMove} body={(node) => {
      const shown = readout(node)
      if (shown.hide) return null
      return <div className={layout.body} title={L(shown.description) || undefined}>
        <Controls controls={shown.controls} />
        {shown.tag && !onMove && <small className={layout.tag}>{L(shown.tag)}</small>}
        {!shown.isInput && <output className={`${layout.value} ${shown.value ? 'is-on' : ''}`}>{shown.value || '—'}</output>}
      </div>
    }} head={(node) => open && readout(node).canOpen && (
      <button type="button" className="node-tool" aria-label={tr('打开')} title={tr('打开')} onPointerDown={stop} onClick={() => open(node)}><Maximize2 size={12} /></button>
    )} wireState={wireState} outNote={outNote} cardClass={nodeClass} height={120} refit />
  </div>
}

/** The editor runs one supplied circuit in an interactive preview. The model supplies drawings, observations and actions. */
export default function PieceBench({ spec, phone }) {
  const [test, setTest] = useState(0)
  const [state, setState] = useState(() => spec.start(0))
  const [graph, setGraph] = useState(spec.graph)
  const [report, setReport] = useState(null)
  const [stale, setStale] = useState(false)
  const [selected, setSelected] = useState(null)
  const [inside, setInside] = useState(null)
  const update = (next) => { setState(next); if (report) setStale(true) }
  const change = (id, patch) => {
    setGraph((board) => ({ ...board, nodes: board.nodes.map((node) => (node.id === id ? { ...node, ...patch } : node)) }))
    if (report) setStale(true)
  }
  const view = spec.view({ test, state, report, graph, change, update })
  const open = (node) => { setSelected(null); setInside(node.id) }
  const opened = inside && view.inside?.(inside)
  const selectTest = (k) => {
    setTest(k)
    setState(spec.start(k))
    setSelected(null)
    setReport(null)
    setStale(false)
  }
  const run = () => {
    const next = view.run()
    setState(next.state)
    setReport(next.report)
    setStale(false)
  }
  const move = (next) => {
    if (next.nodes.length !== graph.nodes.length || JSON.stringify(next.wires) !== JSON.stringify(graph.wires)) return
    const position = new Map(next.nodes.map((node) => [node.id, { x: Math.round(node.x), y: Math.round(node.y) }]))
    setGraph((board) => ({ ...board, nodes: board.nodes.map((node) => ({ ...node, ...position.get(node.id) })) }))
  }
  const node = graph.nodes.find(({ id }) => id === selected)
  const shown = node && view.readout(node)
  const panel = phone && !opened && (shown ? <>
    <div className="demo-panel-head"><b>{L(view.parts.label(node))}</b><small>{L(shown.panelTag)}</small></div>
    <Controls controls={shown.controls} roomy />
    {shown.description && <p className="panel-note">{L(shown.description)}</p>}
    {!shown.isInput && <p className="panel-note">{report ? tr(`上次运行：${shown.value || '—'}`, `Last run: ${shown.value || '—'}`) : tr('还没运行。')}</p>}
    {shown.canOpen && <button type="button" className={spec.layout.open} onClick={() => open(node)}><Maximize2 size={14} />{tr('打开')}</button>}
  </> : <p className="panel-note">{L(spec.help)}</p>)
  const pickDrawing = (token) => {
    const next = view.pick(token)
    if (!next) return
    setState(next)
    setReport(null)
    setStale(false)
  }
  return <DemoBench tests={spec.tests} test={test} onTest={selectTest} onRun={run}
    onReset={() => { selectTest(test); setGraph(spec.graph) }} state={stale ? 'stale' : report ? 'ran' : 'idle'}
    height="auto" panel={panel} note={spec.note}>
    <div className={spec.layout.scene}>{view.drawings.map(({ drawing, frame, editable }, k) => (
      <div className={frame} key={k}><InteractiveDrawing {...drawing} onPick={editable ? pickDrawing : undefined} /></div>
    ))}</div>
    {opened ? <div className={spec.layout.inside}>
      <button type="button" className={spec.layout.back} onClick={() => setInside(null)}><ArrowLeft size={14} />{L(opened.name)}</button>
      <Board view={opened} layout={spec.layout} phone={phone} />
    </div> : <Board view={view} layout={spec.layout} phone={phone} selected={selected} onPick={(id) => setSelected(id === selected ? null : id)} onMove={move} open={open} />}
  </DemoBench>
}
