import { useMemo, useState } from 'react'
import { CanvasEditor, DemoBench, SlotBoard } from '../../../kit/circuit/index.js'
import { L, tr } from '../../../kit/shell/i18n.js'
import { LEVELS } from '../levels/index.js'
import { WORLDS } from './worlds.js'
import { runCircuit } from './world.js'
import { BLUEPRINTS, def, evaluate } from './components.js'
import { litOf } from './editor.js'
import { toGraph, partsFor } from './board.js'
import { signal } from '../util.js'

// A part on a bench in the parts box (games/kit/shell/PartsBook.jsx): the board its level is solved with, on the
// shared circuit editor, with the part's own components picked out. Its inputs are cells of a real run of that
// board (one test per cell); the player changes them, a constant, or a merger's model, and runs the board to see
// what each card and the answer come to. On a phone it is the phone board: tap a block, change it underneath.

// Parts that are an idea rather than a board show the board of the level that puts the idea to work.
const BORROW = { back: 'cheapest', memo: 'stairs', topdown: 'stairs', seam: 'seam' }
const MERGES = ['msum', 'mmin', 'mmax']

/** The bench for a part: its level, board, world and a few cells of a real run. Null when there is none. */
function benchFor(key) {
  const own = LEVELS.find((L) => L.unlock === key)
  const L = BORROW[key] ? LEVELS.find((x) => x.id === BORROW[key]) : own
  if (!L || L.mode !== 'circuit') return null
  const s = L.stages ? L.stages.at(-1) : L
  if (!s.solution) return null
  const V = WORLDS[s.world]
  const o = { ...s, dirs: L.solutionDirs || {}, ...(s.dial ? { scan: s.solutionScan } : {}), filter: s.solutionFilter || 'all', remember: s.solutionMem || [] }
  const t = (s.tests || L.tests)[0]
  const lit = litOf(s.solution)
  let res
  try {
    res = runCircuit(V, t, s.solution, o)
  } catch {
    return null
  }
  // Three cells where every input reads something: early, middle and the last.
  const full = res.steps.filter((step) => step.probe && lit.every((id) => step.probe[`tap:${id}`] !== undefined) && lit.some((id) => step.probe[`tap:${id}`] !== null))
  const pick = full.length ? [...new Set([Math.floor(full.length / 3), Math.floor((2 * full.length) / 3), full.length - 1])].map((k) => full[k]) : []
  const samples = pick.map((step) => Object.fromEntries(lit.map((id) => [id, step.probe[`tap:${id}`] ?? null])))
  // A board that became a component of its own is tried as that one component, fed by the same inputs.
  const bp = BLUEPRINTS[`bp:${L.id}`]
  const circuit = bp && bp.tapIds.every((id) => lit.includes(id))
    ? { nodes: [{ id: 'p', kind: `bp:${L.id}` }], wires: [...bp.tapIds.map((id, k) => ({ from: `tap:${id}`, to: `p:${k}` })), { from: 'p', to: `out:${bp.out}` }] }
    : s.solution
  const focus = new Set([...(bp ? [`bp:${L.id}`] : s.fresh || L.fresh || []), ...(key === 'skeleton' ? MERGES : [])])
  const used = circuit === s.solution ? lit : bp.tapIds
  const { tallest, ...xy } = columns(circuit, used, V)
  return { L, s, V, circuit, lit: used, samples: samples.length ? samples : [Object.fromEntries(used.map((id) => [id, null]))], focus, xy, height: Math.round(Math.min(480, Math.max(300, tallest * 0.62 + 40))) }
}

/** Where the cards start: in columns by how far they are from the inputs, so the board reads left to right. */
function columns(circ, lit, V) {
  const into = (id) => circ.wires.filter((w) => w.to.split(':')[0] === id || w.to === id).map((w) => w.from)
  const depth = new Map(lit.map((t) => [`tap:${t}`, 0]))
  const of = (id, seen = new Set()) => {
    if (depth.has(id)) return depth.get(id)
    if (seen.has(id)) return 1
    seen.add(id)
    const d = 1 + Math.max(0, ...into(id).map((f) => of(f, seen)))
    depth.set(id, d)
    return d
  }
  circ.nodes.forEach((n) => of(n.id))
  const last = Math.max(1, ...circ.nodes.map((n) => depth.get(n.id)))
  V.outs.forEach(([o]) => depth.set(`out:${o}`, last + 1))
  // Inputs are short cards and stack closer; every column is centred on the tallest.
  const ids = [...lit.map((t) => `tap:${t}`), ...circ.nodes.map((n) => n.id), ...V.outs.map(([o]) => `out:${o}`)]
  const gap = (d) => (d === 0 ? 124 : 150)
  const count = new Map()
  ids.forEach((id) => count.set(depth.get(id), (count.get(depth.get(id)) ?? 0) + 1))
  const tallest = Math.max(...[...count].map(([d, n]) => n * gap(d)))
  const rows = new Map(), xy = {}
  for (const id of ids) {
    const d = depth.get(id), k = rows.get(d) ?? 0
    rows.set(d, k + 1)
    xy[id] = [20 + d * 205, 20 + (tallest - count.get(d) * gap(d)) / 2 + k * gap(d)]
  }
  xy.tallest = tallest
  return xy
}

/** Typing a signal: a number, — (nothing), yes / no, or a run of them separated by spaces or commas. */
function InputControl({ type, value, onChange }) {
  const stop = (event) => event.stopPropagation()
  if (type === 'bool') {
    return (
      <span className="demo-yn" onPointerDown={stop}>
        {[[true, tr('是', 'yes')], [false, tr('否', 'no')]].map(([v, label]) => (
          <button key={label} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>{label}</button>
        ))}
      </span>
    )
  }
  if (type.endsWith('s')) {
    const text = Array.isArray(value) ? value.map((v) => (v === null ? '—' : typeof v === 'boolean' ? (v ? 'y' : 'n') : v)).join(' ') : ''
    const parse = (raw) => raw.split(/[\s,，]+/).filter(Boolean).map((x) => (x === '—' || x === '-' ? null : /^(y|是)$/i.test(x) ? true : /^(n|否)$/i.test(x) ? false : Number(x))).filter((x) => x === null || typeof x === 'boolean' || Number.isFinite(x))
    return <input className="demo-list" defaultValue={text} onPointerDown={stop} onBlur={(event) => onChange(parse(event.target.value))} onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()} aria-label={tr('一段数，用空格隔开', 'A run of numbers, separated by spaces')} />
  }
  const step = (d) => onChange(value === null ? 0 : Math.round((value + d) * 100) / 100)
  return (
    <span className="demo-num" onPointerDown={stop}>
      <button type="button" onClick={() => step(-1)} aria-label={tr('减 1', 'Minus 1')}>−</button>
      <output>{signal(value)}</output>
      <button type="button" onClick={() => step(1)} aria-label={tr('加 1', 'Plus 1')}>+</button>
      <button type="button" className={value === null ? 'is-on' : ''} onClick={() => onChange(value === null ? 0 : null)} title={tr('「—」：这里什么也没有', '“—”: nothing here')}>—</button>
    </span>
  )
}

export default function PartDemo({ partKey, phone }) {
  const bench = useMemo(() => benchFor(partKey), [partKey])
  const [test, setTest] = useState(0)
  const [inputs, setInputs] = useState(() => bench?.samples[0] ?? {})
  const [circ, setCirc] = useState(() => bench?.circuit)
  const [xy, setXy] = useState(() => bench?.xy ?? {})
  const [probe, setProbe] = useState(null)
  const [stale, setStale] = useState(false)
  const [sel, setSel] = useState(null) // the block tapped on a phone
  if (!bench) return null

  const u = { taps: bench.V.taps, avail: bench.lit, outs: bench.V.outs }
  const graph = toGraph({ ...circ, lit: bench.lit, xy }, u)
  const parts = partsFor({ ...circ, lit: bench.lit }, u)
  // After a run, any change leaves its results on the cards, faded, until the next run.
  const changed = () => probe && setStale(true)
  const run = () => {
    const out = {}
    evaluate(circ, (id) => inputs[id] ?? null, bench.V.outs.map((x) => x[0]), out)
    setProbe(out)
    setStale(false)
  }
  const pickTest = (k) => {
    setTest(k)
    setInputs(bench.samples[k])
    changed()
  }
  const reset = () => {
    setInputs(bench.samples[test])
    setCirc(bench.circuit)
    setXy(bench.xy)
    setProbe(null)
    setStale(false)
  }
  // Cards may be moved about, but the circuit itself stays as it is.
  const onChange = (next) => {
    const same = next.nodes.length === graph.nodes.length && JSON.stringify(next.wires) === JSON.stringify(graph.wires)
    if (same) setXy(Object.fromEntries(next.nodes.map((n) => [n.id, [Math.round(n.x), Math.round(n.y)]])))
  }
  const setNode = (id, patch) => {
    setCirc((c) => ({ ...c, nodes: c.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }))
    changed()
  }
  const valueOf = (id) => (probe && id in probe ? signal(probe[id]) : '')
  const stop = (event) => event.stopPropagation()

  const body = (node) => {
    if (node.type === 'tap') {
      const type = bench.V.taps[node.tap].type
      return <div className="sg-body"><InputControl type={type} value={inputs[node.tap] ?? null} onChange={(v) => { setInputs((i) => ({ ...i, [node.tap]: v })); changed() }} /></div>
    }
    const value = valueOf(node.id)
    const swaps = MERGES.includes(node.type) ? MERGES : []
    return (
      <div className="sg-body" title={node.type !== 'out' ? L(def(node.type).desc) : undefined}>
        {node.type === 'const' && (
          <label className="param" onPointerDown={stop}>
            <span>{tr('数值', 'Value')}</span>
            <select value={node.value ?? 1} onChange={(e) => setNode(node.id, { value: +e.target.value })}>
              {(bench.s.consts || [0, 1, 2, 3, 4, 5]).map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
        )}
        {swaps.length > 0 && (
          <label className="param" onPointerDown={stop}>
            <span>{tr('型号', 'Model')}</span>
            <select value={node.type} onChange={(e) => setNode(node.id, { kind: e.target.value })}>
              {swaps.map((k) => <option key={k} value={k}>{L(def(k).tag)}</option>)}
            </select>
          </label>
        )}
        <output className={`sg-val ${value ? 'is-on' : ''}`}>{value || '—'}</output>
      </div>
    )
  }
  const wireState = (wire) => {
    if (!probe || !(wire.from in probe)) return null
    const v = probe[wire.from]
    return v === null || v === false ? 'dead' : 'live'
  }
  const tests = bench.samples.map((_, k) => ({ label: { zh: `格子 ${k + 1}`, en: `Cell ${k + 1}` } }))
  const common = {
    tests,
    test,
    onTest: pickTest,
    onRun: run,
    onReset: reset,
    state: stale ? 'stale' : probe ? 'ran' : 'idle',
  }
  if (!phone) {
    return (
      <DemoBench {...common} height={bench.height} note={{ zh: '每个「格子」是这块电路板真跑一遍时，机器人在某一格看到的输入。改改输入、常数或汇合器的型号，再点运行，看每张卡片和答案怎么变。', en: 'Each “cell” is what the robot saw on one cell when this board really ran. Change an input, a constant or a merger’s model, then run, and watch every card and the answer change.' }}>
        <CanvasEditor graph={graph} onChange={onChange} parts={parts} body={body} wireState={wireState} cardClass={(node) => (bench.focus.has(node.type) ? 'is-focus' : '')} width={176} height={120} />
      </DemoBench>
    )
  }

  // The phone board: each block shows its value; the tapped one is changed in the panel underneath.
  const nameOf = (node) => (node ? L(parts.label(node)) : '')
  const thumb = (node) => {
    const v = node.type === 'tap' ? signal(inputs[node.tap] ?? null) : valueOf(node.id)
    return <i className={`sg-thumb ${v && v !== '—' ? 'is-on' : ''}`}>{v || '—'}</i>
  }
  const tileExtra = (node) => (node.type === 'const' ? `= ${node.value ?? 1}` : L(def(node.type).tag ?? ''))
  const node = graph.nodes.find((n) => n.id === sel)
  const choices = (options, value, pick) => (
    <div className="demo-choices">{options.map(([v, label]) => <button key={String(v)} type="button" aria-pressed={v === value} onClick={() => pick(v)}>{label}</button>)}</div>
  )
  const panel = !node ? (
    <p className="panel-note">{tr('点一块，在这里改它：输入的数、常数，或汇合器的型号。改好点运行。', 'Tap a block to change it here: an input, a constant or a merger’s model. Then run.')}</p>
  ) : (
    <>
      <div className="demo-panel-head"><b>{nameOf(node)}</b><small>{node.type === 'tap' ? tr('输入', 'Input') : node.type === 'out' ? tr('答案', 'Answer') : L(def(node.type).tag ?? '')}</small></div>
      {node.type === 'tap' && <InputControl key={`${sel}-${test}`} type={bench.V.taps[node.tap].type} value={inputs[node.tap] ?? null} onChange={(v) => { setInputs((i) => ({ ...i, [node.tap]: v })); changed() }} />}
      {node.type === 'const' && choices((bench.s.consts || [0, 1, 2, 3, 4, 5]).map((v) => [v, String(v)]), node.value ?? 1, (v) => setNode(node.id, { value: v }))}
      {MERGES.includes(node.type) && choices(MERGES.map((k) => [k, L(def(k).tag)]), node.type, (k) => setNode(node.id, { kind: k }))}
      {node.type !== 'tap' && node.type !== 'out' && <p className="panel-note">{L(def(node.type).desc)}</p>}
      {node.type !== 'tap' && <p className="panel-note">{probe ? tr(`上次运行：${valueOf(node.id) || '—'}`, `Last run: ${valueOf(node.id) || '—'}`) : tr('还没运行。', 'Not run yet.')}</p>}
    </>
  )
  return (
    <DemoBench {...common} height="auto" panel={panel}>
      <SlotBoard
        graph={graph}
        parts={parts}
        nameOf={nameOf}
        thumb={thumb}
        tileExtra={tileExtra}
        picking={null}
        canLand={() => false}
        onPort={() => {}}
        onNode={(id) => setSel(id === sel ? null : id)}
        onSlot={() => {}}
        fixed
        nodeClass={(n) => `${n.id === sel ? 'is-selected' : ''} ${bench.focus.has(n.type) ? 'is-focus' : ''}`}
      />
    </DemoBench>
  )
}
