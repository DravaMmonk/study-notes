import { useMemo, useState } from 'react'
import { Choice, DemoBench, SlotBoard } from '../../../circuit/index.js'
import { L, tr } from '../../../shell/i18n.js'
import Editor from './Editor.jsx'
import { describe } from '../words.js'
import { partsFor } from './parts.js'
import { levelSensors } from './sensors.js'
import { KernelEditor, NumberEditor } from './phone/Editors.jsx'
import { setParam } from './parameters.js'
import { ParamChip } from './phone/parts.jsx'
import ValueView from './views/ValueView.jsx'
import MultiOutputPreview from './MultiOutputPreview.jsx'
import { kindOf, nodeView, viewFor } from './views/views.js'
import './phone/phone.css'

// A part on a bench in the parts box (games/kit/shell/PartsBook.jsx): the part between its level's inputs and an
// output, on the game's own board, with its settings on its card. The tests are its level's pictures (or a few
// sample ones); the player changes a setting, runs it, and sees what each card makes of the picture. On a phone it
// is the phone board: tap a block, change its settings underneath.

// box: { sample, inLevel, boards } from the game's content: the level whose pictures a part from a level without tests
// is tried on, parts tried inside a level's own circuit (what feeds them is more than its inputs), and the board such a
// part is tried on where that circuit spells the part out from smaller ones.
// home: for a primitive, the level that brings it in, tried like the level that unlocks a part. kit: the course's engine
// (../engine/kit.js).
function benchFor(kit, levels, box, flag, type, home, sample = false) {
  const { types, defaultParams, runLevel } = kit
  // A setting rather than a part is tried on the part it belongs to.
  const nodeType = flag === 'edge-filter' ? 'box3' : type
  const spec = types[nodeType]
  if (!spec) return null
  // A level is tried as its last task.
  const own = levels.find((l) => l.unlocks.includes(flag) || l.id === home)
  const level = (box.inLevel[flag] ? levels.find((l) => l.id === box.inLevel[flag]) : own)?.tasks.at(-1)
  const source = !sample && level?.kind === 'graph' && level.tests?.length ? level : levels.find((l) => l.id === box.sample).tasks.at(-1)
  const tests = source.tests.slice(0, 3).map((t) => ({ label: t.label, inputs: t.inputs, expected: {} }))
  const names = Object.keys(tests[0]?.inputs ?? {})
  const ports = spec.inputs ?? []
  const params = { ...defaultParams(nodeType), ...(flag === 'edge-filter' ? { border: 'edge' } : {}) }

  // The part on its own, fed straight from the inputs; when its ports do not line up with them, its level's own
  // circuit, which has the part in it.
  const inSolution = source.solution?.nodes.some((n) => n.type === nodeType)
  let graph
  if (box.inLevel[flag] || (ports.length !== names.length && names.length > 0 && inSolution)) {
    graph = structuredClone(box.boards[flag] ?? source.solution)
  } else {
    const inputs = names.map((name, k) => ({ id: `in-${name}`, type: 'input', params: { name }, x: 40, y: 40 + k * 200 }))
    const feed = (port, k) => inputs[ports.length === names.length ? k : 0]
    const keys = typeof spec.outputs === 'function' ? spec.outputs() : [null]
    const sinks = keys.map((key, k) => ({ id: key === null ? 'out' : `out-${key}`, type: 'output', params: { name: key ?? 'out' }, x: 520, y: 40 + k * 200 }))
    graph = {
      nodes: [...inputs, { id: 'part', type: nodeType, params, x: 280, y: 40 }, ...sinks],
      wires: [...(inputs.length ? ports.map((port, k) => ({ from: feed(port, k).id, to: 'part', port })) : []), ...sinks.map((sink, k) => ({ from: keys[k] === null ? 'part' : `part#${keys[k]}`, to: sink.id, port: 'in' }))],
    }
  }
  const outputs = graph.nodes.filter((n) => n.type === 'output').map((n) => n.params.name)
  const bench = { kind: 'graph', inputs: names, outputs, tests, check: source.check, views: source.views, inputLabels: source.inputLabels, outputLabels: { ...source.outputLabels, ...spec.outputLabels } }
  const first = runLevel(bench, graph).results[0]
  // A part its level's own tests do not suit (the spectrum, met on a 1-D signal, is a 2-D part) is tried on the
  // sample pictures instead.
  const broken = !first || first.errors.size > 0 || Object.values(first.outputs).some((img) => !img || Array.from(img.data).some(Number.isNaN))
  if (broken && !sample && source.id !== box.sample && !box.inLevel[flag]) return benchFor(kit, levels, box, flag, type, home, true)
  const ioKinds = Object.fromEntries([...Object.entries(tests[0]?.inputs ?? {}), ...outputs.map((name) => [name, first?.outputs[name]])].map(([name, value]) => [name, kindOf(value)]))
  const colourOutputs = Object.entries(first?.outputs ?? {}).filter(([, value]) => value?.c === 3).map(([name]) => name)
  return { bench, graph, nodeType, ioKinds, colourOutputs, sensors: levelSensors(bench), views: { in: viewFor(source, 'in'), out: viewFor(source, 'out'), mid: viewFor(source, 'mid') } }
}

export default function PartDemo({ kit, flag, type, home, flags, phone, levels, box }) {
  const made = useMemo(() => benchFor(kit, levels, box, flag, type, home), [kit, levels, box, flag, type, home])
  const [graph, setGraph] = useState(() => made?.graph)
  const [test, setTest] = useState(0)
  const [run, setRun] = useState(null)
  const [stale, setStale] = useState(false)
  const [scan, setScan] = useState(0.5)
  const [sel, setSel] = useState(null) // the block tapped on a phone
  const parts = useMemo(() => made && partsFor(kit, { sensors: made.sensors, outputLabels: made.bench.outputLabels, colourOutputs: made.colourOutputs }), [kit, made])
  if (!made) return null
  const { types, runLevel, settingsOf } = kit

  // Cards move freely and settings change; the circuit itself stays as it is.
  const onChange = (next, { keep } = {}) => {
    const sameNodes = next.nodes.map((n) => n.id).join() === graph.nodes.map((n) => n.id).join()
    const oldWires = new Set(graph.wires.map((w) => JSON.stringify(w)))
    const added = next.wires.some((w) => !oldWires.has(JSON.stringify(w)))
    const retained = new Set(next.wires.map((w) => JSON.stringify(w)))
    const removed = graph.wires.filter((w) => !retained.has(JSON.stringify(w)))
    const validRemoval = removed.every((w) => { const node = next.nodes.find((n) => n.id === w.to); return node?.type === 'arith' && node.params.constantSide === w.port })
    if (!sameNodes || added || !validRemoval) return
    setGraph(next)
    if (!keep && run && JSON.stringify(next.nodes.map((n) => n.params)) !== JSON.stringify(graph.nodes.map((n) => n.params))) setStale(true)
  }
  const go = () => {
    setRun(runLevel(made.bench, graph))
    setStale(false)
  }
  const tests = made.bench.tests.map((t, k) => ({ label: t.label ?? { zh: `测试 ${k + 1}`, en: `Test ${k + 1}` } }))
  const theme = document.documentElement.dataset.theme
  const common = {
    tests,
    test,
    onTest: (k) => setTest(k),
    onRun: go,
    onReset: () => {
      setGraph(made.graph)
      setRun(null)
      setStale(false)
    },
    state: stale ? 'stale' : run ? 'ran' : 'idle',
  }
  if (!phone) {
    return (
      <DemoBench {...common} note={{ zh: '更换测试图或修改元件设置，然后点击运行，查看每个元件的输出。', en: "Pick another test picture or change a part's settings, then run to see what each part outputs." }}>
        <Editor kit={kit} graph={graph} onChange={onChange} run={run} testIndex={test} flags={flags} sensors={made.sensors} outputLabels={made.bench.outputLabels} colourOutputs={made.colourOutputs} views={made.views} ioKinds={made.ioKinds} scan={scan} onScan={setScan} theme={theme} hasPalette={false} focus={made.nodeType} refit />
      </DemoBench>
    )
  }

  // The phone board: inputs show the test's pictures, every other block what the last run made; the tapped block's
  // settings are changed in the panel underneath.
  const values = run?.results[test]?.values
  const errors = run?.results[test]?.errors
  const valueOf = (node) => (node.type === 'input' ? made.bench.tests[test].inputs[node.params.name] : values?.get(node.id))
  const picture = (node, size) => {
    if (errors?.get(node.id)) return <i className="pb-error" style={{ width: size, height: size }}>!</i>
    const value = valueOf(node)
    const outputs = node.type !== 'input' ? parts.outputs(node) : null
    if (outputs?.length > 1) return <MultiOutputPreview node={node} outputs={outputs} values={values} view={nodeView(node, made.views)} theme={theme} size={40} compact />
    if (!value) return <i className="pb-empty" style={{ width: size, height: size }} />
    return <ValueView img={value} view={nodeView(node, made.views)} size={kindOf(value) === 'signal' ? size * 1.6 : size} theme={theme} />
  }
  const nameOf = (node) => (node ? L(parts.label(node)) : '')
  const tileExtra = (node) => {
    const param = (types[node.type].params ?? [])[0]
    return param ? <ParamChip param={param} value={node.params?.[param.key]} /> : null
  }
  const node = graph.nodes.find((n) => n.id === sel)
  const params = node ? settingsOf(node.type, flags) : []
  const change = (key, v) => onChange(setParam(kit, graph, node.id, key, v))
  const panel = !node ? (
    <p className="panel-note">{tr('点击一个元件，在此修改它的设置；然后运行，查看每个元件的输出。')}</p>
  ) : (
    <>
      <div className="demo-panel-head"><b>{nameOf(node)}</b><small>{node.type === 'input' ? tr('输入', 'Input') : node.type === 'output' ? tr('输出', 'Output') : describe(types, node.type)}</small></div>
      {params.map((param) => (
        <div key={param.key} className="demo-param">
          <span className="panel-label">{L(param.label)}</span>
          {param.kind === 'select' ? <Choice options={param.options} value={node.params[param.key] ?? param.default} onChange={(v) => change(param.key, v)} label={param.label} layout={param.buttons ?? 'row'} roomy /> : param.kind === 'kernel' ? <KernelEditor param={param} value={node.params[param.key]} onChange={(v) => change(param.key, v)} /> : <NumberEditor param={param} value={node.params[param.key]} onChange={(v) => change(param.key, v)} />}
        </div>
      ))}
      {node.type !== 'input' && node.type !== 'output' && !params.length && <p className="panel-note">{tr('这个元件没有设置。')}</p>}
    </>
  )
  return (
    <DemoBench {...common} height="auto" panel={panel}>
      <SlotBoard
        graph={graph}
        parts={parts}
        nameOf={nameOf}
        thumb={picture}
        tileExtra={tileExtra}
        sinkBody={(n) => <span className="pb-thumb">{picture(n, 64)}</span>}
        picking={null}
        canLand={() => false}
        onPort={() => {}}
        onNode={(id) => setSel(id === sel ? null : id)}
        onSlot={() => {}}
        fixed
        nodeClass={(n) => `${n.id === sel ? 'is-selected' : ''} ${n.type === made.nodeType ? 'is-focus' : ''}`}
      />
    </DemoBench>
  )
}
