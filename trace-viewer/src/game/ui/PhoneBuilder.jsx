import { createElement } from 'react'
import { ArrowDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { order, wouldCycle } from '../engine/graph.js'
import { NODE_TYPES, inputsOf } from '../engine/nodes.js'
import { familyOf, iconOf } from './catalog.js'
import ParamControl from './ParamControl.jsx'
import CurveView from './views/CurveView.jsx'
import ValueView from './views/ValueView.jsx'
import ViewSwitch from './views/ViewSwitch.jsx'
import { KIND_NAMES, formatNumber, kindOf, nodeView } from './views/views.js'

// The phone's way of building a circuit: no board to pan and wire, but a list of steps read top to
// bottom. Each step is a part; each of its inputs is a choice of an earlier result. Adding a part
// appends it to the end of the chain, fed by whatever fed the output, and makes it the output. The
// circuit is the same graph the desktop board edits, so progress moves between the two.

const NUMBERS = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'
const PORT_NAMES = { a: '输入 a', b: '输入 b', in: '输入', left: '左图', right: '右图', c0: 'd=0', c1: 'd=1', c2: 'd=2', c3: 'd=3' }

export default function PhoneBuilder({ graph, onChange, run, testIndex, flags, inputLabels, outputLabels, ioKinds, views, theme, scan, onScan, onAdd, canAdd }) {
  const values = run?.results[testIndex]?.values
  const errors = run?.results[testIndex]?.errors
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  const ids = order(graph)
  const sources = graph.nodes.filter((n) => n.type === 'input')
  const steps = ids.map((id) => byId.get(id)).filter((n) => n && !NODE_TYPES[n.type].fixed)
  const outputs = graph.nodes.filter((n) => n.type === 'output')
  const nameOf = (node) => {
    if (node.type === 'input') return inputLabels?.[node.params.name] ?? (sources.length > 1 ? node.params.name : '输入')
    const index = steps.indexOf(node)
    return `${NUMBERS[index] ?? `#${index + 1}`} ${NODE_TYPES[node.type].label}`
  }
  const feeding = (node, port) => graph.wires.find((w) => w.to === node.id && w.port === port)?.from ?? ''
  const connect = (node, port, from) => {
    const wires = graph.wires.filter((w) => !(w.to === node.id && w.port === port))
    onChange({ ...graph, wires: from ? [...wires, { from, to: node.id, port }] : wires })
  }
  const remove = (node) => onChange({ nodes: graph.nodes.filter((n) => n.id !== node.id), wires: graph.wires.filter((w) => w.from !== node.id && w.to !== node.id) })
  const setParam = (node, key, value) => onChange({ ...graph, nodes: graph.nodes.map((n) => (n.id === node.id ? { ...n, params: { ...n.params, [key]: value } } : n)) })
  const setView = (node, shown) => onChange({ ...graph, nodes: graph.nodes.map((n) => (n.id === node.id ? { ...n, view: shown } : n)) }, { keep: true })
  // Every result that can feed this node without making a loop.
  const choices = (node) => [...sources, ...steps].filter((n) => n.id !== node.id && !wouldCycle(graph, n.id, node.id))

  const sourceSelect = (node, port) => {
    const from = feeding(node, port)
    return (
      <label key={port} className={`pb-port ${from ? '' : 'is-empty'}`}>
        <span>{inputsOf(node.type).length > 1 || node.type === 'output' ? PORT_NAMES[port] ?? port : '输入'}</span>
        <select value={from} onChange={(event) => connect(node, port, event.target.value)}>
          <option value="">未连接</option>
          {choices(node).map((n) => <option key={n.id} value={n.id}>{nameOf(n)}</option>)}
        </select>
      </label>
    )
  }
  const preview = (node) => {
    const value = values?.get(node.id)
    const error = errors?.get(node.id)
    if (error) return <p className="pb-error">{error}</p>
    const shown = nodeView(node, views)
    return (
      <div className="pb-preview">
        <ValueView img={value} view={shown} size={value && kindOf(value) === 'image' ? 132 : 260} theme={theme} label="还没有结果" grid scan={scan} onScan={onScan} />
        {kindOf(value) === 'image' && <ViewSwitch value={shown} onChange={(v) => setView(node, v)} compact />}
      </div>
    )
  }

  return (
    <section className="pb" aria-label="电路步骤">
      <div className="pb-sources">
        {sources.map((n) => (
          <details key={n.id} className="pb-source">
            <summary>
              <i className="family-chip" data-family="io">{createElement(iconOf('input'), { size: 13, strokeWidth: 1.8 })}</i>
              <span>{nameOf(n)}</span>
              <small>{KIND_NAMES[ioKinds?.[n.params.name]]}</small>
              <ChevronRight size={14} className="pb-chevron" />
            </summary>
            {preview(n)}
          </details>
        ))}
      </div>

      {steps.map((node) => {
        const spec = NODE_TYPES[node.type]
        return (
          <article key={node.id} className="pb-step" data-family={familyOf(node.type)}>
            <header>
              <i className="family-chip">{createElement(iconOf(node.type), { size: 13, strokeWidth: 1.8 })}</i>
              <h3>{nameOf(node)}</h3>
              <button className="pb-delete" onClick={() => remove(node)} aria-label={`删除 ${nameOf(node)}`}><Trash2 size={15} /></button>
            </header>
            {inputsOf(node.type).map((port) => sourceSelect(node, port))}
            {(spec.params ?? []).filter((p) => !p.unlock || flags.has(p.unlock)).map((param) => (
              <ParamControl key={param.key} param={param} value={node.params[param.key]} onChange={(v) => setParam(node, param.key, v)} roomy />
            ))}
            {preview(node)}
          </article>
        )
      })}

      {canAdd && (
        <button className="pb-add" onClick={onAdd}><Plus size={17} /> 加一步</button>
      )}

      {outputs.map((node) => {
        const check = run?.results[testIndex]?.checks.find((c) => c.name === node.params.name)
        return (
          <article key={node.id} className={`pb-step pb-output ${check ? (check.pass ? 'is-pass' : 'is-fail') : ''}`} data-family="io">
            <header>
              <i className="family-chip"><ArrowDown size={13} strokeWidth={1.8} /></i>
              <h3>{outputLabels?.[node.params.name] ?? '输出'} · {KIND_NAMES[ioKinds?.[node.params.name]]}</h3>
              {check && <em className="pb-verdict">{check.pass ? '这组通过' : '未通过'}</em>}
            </header>
            {sourceSelect(node, 'in')}
          </article>
        )
      })}
    </section>
  )
}

// The tests, pinned above the steps: one chip per test, and the chosen test as input → expected →
// yours, small. "详情" opens the full test panel.
export function PhoneTests({ level, run, testIndex, onSelect, onDetails, theme, inView, outView }) {
  const test = level.tests[testIndex]
  const result = run?.results[testIndex]
  const passed = run?.results.filter((r) => r.pass).length ?? 0
  const [name, expected] = Object.entries(test.expected)[0]
  const actual = result?.outputs[name]
  const fits = actual?.w === expected.w && actual?.h === expected.h
  const kind = kindOf(expected)
  const mini = (img, view) => <ValueView img={img} view={view} size={kindOf(img) === 'image' || !img ? 64 : 110} theme={theme} label="—" />
  const tolerance = (test.check ?? level.check)?.tolerance ?? 0.02
  return (
    <section className={`pt ${run?.pass ? 'is-pass' : ''}`} aria-label="测试">
      <div className="pt-chips">
        {level.tests.map((t, index) => (
          <button key={t.label} className={`pt-chip ${index === testIndex ? 'is-active' : ''} ${run?.results[index]?.pass ? 'is-pass' : 'is-fail'}`} onClick={() => onSelect(index)} aria-pressed={index === testIndex}>{t.label}</button>
        ))}
        <span className="pt-meter">{passed}/{level.tests.length}</span>
      </div>
      <div className="pt-row">
        <figure>{mini(Object.values(test.inputs)[0], inView)}<figcaption>输入</figcaption></figure>
        {kind === 'signal' ? (
          <figure className="pt-wide"><CurveView img={fits ? actual : null} expected={expected} tolerance={tolerance} width={150} height={64} /><figcaption>期望（虚线）和你的</figcaption></figure>
        ) : kind === 'number' ? (
          <figure className="pt-wide pt-numbers"><b>{formatNumber(expected.data[0])}</b><span>期望</span><b className={result?.pass ? 'is-pass' : 'is-fail'}>{fits ? formatNumber(actual.data[0]) : '—'}</b><span>你的</span></figure>
        ) : (
          <>
            <figure>{mini(expected, outView)}<figcaption>期望</figcaption></figure>
            <figure>{mini(fits ? actual : null, outView)}<figcaption>你的</figcaption></figure>
          </>
        )}
        <button className="pt-details" onClick={onDetails}>{result?.pass ? '这组通过' : result?.checks[0]?.reason || '未通过'}<ChevronRight size={14} /></button>
      </div>
    </section>
  )
}
