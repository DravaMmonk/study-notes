import { useMemo, useState } from 'react'
import { CanvasEditor, Choice, DemoBench, SlotBoard } from '../../../circuit/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { LEVELS } from '../../../../state-graph/levels/index.js'
import { sceneSVG } from '../svg.js'
import { signal } from '../util.js'
import { WORLDS } from './worlds.js'
import { ROBOTS } from './robots.js'
import { runCircuit, sensorsOf, visibleSensors, windowOf } from './world.js'
import { BLUEPRINTS, def, evaluate, hasValue, valueDefault } from './components.js'
import { litOf, viewHTML } from './editor.js'
import { toGraph, partsFor } from './board.js'

// A part on a bench in the components box (games/kit/shell/PartsBook.jsx), the way its level is played: a test board, the
// robot's view and the board the level is solved with, the part's own components picked out. The test board starts
// filled the way that board fills it; click a cell to put the robot there. An input card reads the board, so changing
// it changes the cell it reads; constants and a merger's model change on their cards. Run computes the robot's cell
// and writes the answer into its red frame. On a phone the circuit is the phone board: tap a block, change it below.

// Parts that are an idea rather than a board show the board of the level that puts the idea to work.
const BORROW = { back: 'cheapest', memo: 'stairs', topdown: 'stairs', seam: 'seam' }
const MERGES = ['msum', 'mmin', 'mmax']

/** The bench for a part: its level, world, robot, circuit and, per test, the table that circuit fills. */
function benchFor(key) {
  const own = LEVELS.find((L) => L.unlock === key)
  const L = BORROW[key] ? LEVELS.find((x) => x.id === BORROW[key]) : own
  if (!L || L.mode !== 'circuit') return null
  const s = L.stages ? L.stages.at(-1) : L
  if (!s.solution) return null
  const V = WORLDS[s.world]
  const robot = ROBOTS[L.robot] || ROBOTS.scout
  const o = { ...s, dirs: L.solutionDirs || {}, ...(s.dial ? { scan: s.solutionScan } : {}), filter: s.solutionFilter || 'all', remember: s.solutionMem || [], layers: s.solution && s.solution.layers, answerLayers: s.solution && s.solution.answerLayers, maxLayers: s.maxLayers }
  const tests = (s.tests || L.tests).slice(0, 3)
  const runs = []
  for (const t of tests) {
    try {
      const res = runCircuit(V, t, s.solution, o)
      // The robot starts two thirds of the way through the scan, where its inputs are already worked out.
      const steps = res.steps.filter((step) => step.writes)
      runs.push({ t, table: res.table, start: steps[Math.floor((steps.length * 2) / 3)]?.cell ?? V.sample(t, o) })
    } catch {
      // A test the reference cannot run is left off the bench.
    }
  }
  if (!runs.length) return null
  const lit = litOf(s.solution)
  // A board that became a component of its own is tried as that one component, fed by the same inputs.
  const bp = BLUEPRINTS[`bp:${L.id}`]
  const packaged = bp && bp.sensors.every((id) => lit.includes(id))
  const circuit = packaged
    ? { nodes: [{ id: 'p', kind: `bp:${L.id}` }], wires: [...bp.sensors.map((id, k) => ({ from: `tap:${id}`, to: `p:${k}` })), { from: 'p', to: `out:${bp.out}` }] }
    : s.solution
  const used = packaged ? bp.sensors : lit
  const focus = new Set([...(packaged ? [`bp:${L.id}`] : s.fresh || L.fresh || []), ...(key === 'skeleton' ? MERGES : [])])
  const avail = [...visibleSensors(V, robot.vision), ...(robot.arm && !s.noArm ? sensorsOf(V, 'arm') : []), ...(s.facts || [])]
  const { tallest, ...xy } = columns(circuit, used, V)
  return { L, s, V, o, robot, runs, circuit, lit: used, avail, focus, xy, height: Math.round(Math.min(440, Math.max(260, tallest * 0.6 + 40))) }
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
  const step = (d) => onChange(value === null || typeof value !== 'number' ? 0 : Math.round((value + d) * 100) / 100)
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
  const [ti, setTi] = useState(0)
  const [cell, setCell] = useState(() => bench?.runs[0].start)
  const [table, setTable] = useState(() => new Map(bench?.runs[0].table ?? []))
  const [typed, setTyped] = useState(() => new Set())
  const [overrides, setOverrides] = useState({}) // inputs that read no board cell (facts, an arm's run)
  const [circ, setCirc] = useState(() => bench?.circuit)
  const [xy, setXy] = useState(() => bench?.xy ?? {})
  const [probe, setProbe] = useState(null)
  const [stale, setStale] = useState(false)
  const [sel, setSel] = useState(null) // the block tapped on a phone
  if (!bench) return null

  const { V, o, robot, s } = bench
  const t = bench.runs[ti].t
  const keys = V.keys(t, cell)
  const answerKeys = Object.values(keys)
  // The board as the robot finds it: the run's table, with the robot's own cell empty until this bench runs it.
  const shown = new Map(table)
  if (!probe) answerKeys.forEach((key) => shown.delete(key))
  const reads = new Set(), empty = new Set()
  const get = (key) => {
    reads.add(key)
    if (shown.has(key)) return shown.get(key)
    empty.add(key)
    return null
  }
  const input = (id) => (id in overrides ? overrides[id] : V.read(t, cell, id, get, o))
  const inputs = Object.fromEntries(bench.lit.map((id) => [id, input(id)]))
  const keyOf = (id) => {
    const m = V.sensors[id]
    if (m.family !== 'view') return null
    const [r, col] = V.here(t, cell)
    return V.keyAt(t, r + m.at[0], col + m.at[1], cell)
  }

  const changed = () => probe && setStale(true)
  const setInput = (id, v) => {
    const key = keyOf(id)
    if (key !== null) {
      setTable((tb) => new Map(tb).set(key, v))
      setTyped((ty) => new Set(ty).add(key))
    } else setOverrides((ov) => ({ ...ov, [id]: v }))
    changed()
  }
  const setNode = (id, patch) => {
    setCirc((c) => ({ ...c, nodes: c.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }))
    changed()
  }
  const run = () => {
    const out = {}
    const { out: answer } = evaluate(circ, (id) => inputs[id] ?? null, V.outs.map((x) => x[0]), out)
    setTable((tb) => {
      const next = new Map(tb)
      Object.entries(keys).forEach(([id, key]) => next.set(key, answer[id]))
      return next
    })
    setProbe(out)
    setStale(false)
  }
  const moveTo = (next) => {
    setCell(next)
    setOverrides({})
    setProbe(null)
    setStale(false)
  }
  const pickTest = (k) => {
    setTi(k)
    setSel(null)
    setTable(new Map(bench.runs[k].table))
    setTyped(new Set())
    setCell(bench.runs[k].start)
    setOverrides({})
    setProbe(null)
    setStale(false)
  }
  const reset = () => {
    pickTest(ti)
    setCirc(bench.circuit)
    setXy(bench.xy)
  }

  // The test board and the robot's window, drawn by the level's own world.
  const boardHTML = sceneSVG({ ...V.scene(t, null, { ...o, bench: { cell, at: answerKeys, shown, reads, empty, typed, sel: null } }), look: robot.look }, { label: tr('测试棋盘', 'Test board'), ...(bench.L.boardOpt || { minScale: 0.5, maxScale: 1.1 }) })
  const mark = (x) => ({ ...x, value: x.key !== null && shown.has(x.key) ? signal(shown.get(x.key)) : '', state: empty.has(x.key) ? 'empty' : reads.has(x.key) ? 'read' : '' })
  const w = windowOf(V, t, cell, robot.vision, o)
  w.wins = w.wins.map((x) => ({ ...x, cells: x.cells.map(mark) }))
  if (w.arm && w.arm.cells) w.arm.cells = w.arm.cells.map(mark)
  if (w.arm && w.arm.sweeps) w.arm.sweeps = w.arm.sweeps.map((x) => ({ ...x, cells: x.cells.map(mark) }))
  if (w.arm && (s.noArm || !robot.arm)) w.arm = null
  if (w.arm) w.arm.filter = o.filter
  w.facts = (s.facts || []).map((id) => ({ id, value: signal(input(id)) }))
  w.robot = robot
  w.probe = probe ?? {}
  const viewMarkup = viewHTML({ ...circ, lit: bench.lit }, { sensors: V.sensors, avail: bench.avail, lit: bench.lit, outs: V.outs, palette: s.palette, win: w, sideView: false })
  const onBoard = (event) => {
    const hit = event.target.closest('[data-cell]')
    if (!hit) return
    const next = V.cellOf(t, hit.dataset.cell, o)
    if (next !== null && next !== undefined) moveTo(next)
  }
  const scene = (
    <div className="sg-bench-scene">
      <div className="sg-bench-board" onClick={onBoard} dangerouslySetInnerHTML={{ __html: boardHTML }} />
      <div className="sg-bench-view"><div className="cview" dangerouslySetInnerHTML={{ __html: viewMarkup }} /></div>
    </div>
  )

  const u = { sensors: V.sensors, avail: bench.lit, outs: V.outs }
  const graph = toGraph({ ...circ, lit: bench.lit, xy }, u)
  const parts = partsFor({ ...circ, lit: bench.lit }, u)
  const valueOf = (id) => (probe && id in probe ? signal(probe[id]) : '')
  const tests = bench.runs.map((r, k) => ({ label: (bench.L.testLabel || V.label)?.(r.t) ?? { zh: `测试 ${k + 1}`, en: `Test ${k + 1}` } }))
  const common = { tests, test: ti, onTest: pickTest, onRun: run, onReset: reset, state: stale ? 'stale' : probe ? 'ran' : 'idle' }
  const note = { zh: '点测试棋盘上的格子，让机器人站过去；输入卡片读的就是棋盘上的格子，改它就是改那一格。改好点运行，答案会写进红框。', en: 'Click a cell on the test board to send the robot there; an input card reads a cell of the board, so changing it changes that cell. Then run, and the answer goes into the red frame.' }

  if (!phone) {
    const body = (node) => {
      if (node.type === 'tap') return <div className="sg-body"><InputControl key={`${node.tap}-${ti}-${cell}`} type={V.sensors[node.tap].type} value={inputs[node.tap] ?? null} onChange={(v) => setInput(node.tap, v)} /></div>
      const value = valueOf(node.id)
      return (
        <div className="sg-body" title={node.type !== 'out' ? L(def(node.type).desc) : undefined}>
          {hasValue(node.type) && (
            <div className="param is-choice">
              <span>{tr('数值', 'Value')}</span>
              <Choice options={(s.consts || [0, 1, 2, 3, 4, 5]).map((v) => [v, String(v)])} value={node.value ?? valueDefault(node.type)} onChange={(v) => setNode(node.id, { value: v })} label={tr('数值', 'Value')} />
            </div>
          )}
          {MERGES.includes(node.type) && (
            <div className="param is-choice">
              <span>{tr('操作', 'Operation')}</span>
              <Choice options={MERGES.map((k) => [k, def(k).tag])} value={node.type} onChange={(k) => setNode(node.id, { kind: k })} label={tr('操作', 'Operation')} />
            </div>
          )}
          <output className={`sg-val ${value ? 'is-on' : ''}`}>{value || '—'}</output>
        </div>
      )
    }
    // Cards may be moved about, but the circuit itself stays as it is.
    const onChange = (next) => {
      if (next.nodes.length === graph.nodes.length && JSON.stringify(next.wires) === JSON.stringify(graph.wires)) setXy(Object.fromEntries(next.nodes.map((n) => [n.id, [Math.round(n.x), Math.round(n.y)]])))
    }
    const wireState = (wire) => {
      if (!probe || !(wire.from in probe)) return null
      const v = probe[wire.from]
      return v === null || v === false ? 'dead' : 'live'
    }
    return (
      <DemoBench {...common} height="auto" note={note}>
        {scene}
        <div className="sg-bench-canvas" style={{ height: bench.height }}>
          <CanvasEditor graph={graph} onChange={onChange} parts={parts} body={body} wireState={wireState} cardClass={(node) => (bench.focus.has(node.type) ? 'is-focus' : '')} width={176} height={120} refit />
        </div>
      </DemoBench>
    )
  }

  // The phone board: each block shows its value; the tapped one is changed in the panel underneath.
  const nameOf = (node) => (node ? L(parts.label(node)) : '')
  const thumb = (node) => {
    const v = node.type === 'tap' ? signal(inputs[node.tap] ?? null) : valueOf(node.id)
    return <i className={`sg-thumb ${v && v !== '—' ? 'is-on' : ''}`}>{v || '—'}</i>
  }
  // Sensor taps and outputs are cards, not parts: they have no definition to read a tag from.
  const tileExtra = (node) => (node.type === 'tap' || node.type === 'out' ? '' : hasValue(node.type) ? `= ${node.value ?? valueDefault(node.type)}` : L(def(node.type).tag ?? ''))
  const node = graph.nodes.find((n) => n.id === sel)
  const panel = !node ? (
    <p className="panel-note">{tr('点一块，在这里改它：输入、常数，或汇合器的操作。点棋盘上的格子换机器人的位置。', 'Tap a block to change it here: an input, a constant or a merger’s operation. Tap a cell on the board to move the robot.')}</p>
  ) : (
    <>
      <div className="demo-panel-head"><b>{nameOf(node)}</b><small>{node.type === 'tap' ? tr('输入', 'Input') : node.type === 'out' ? tr('答案', 'Answer') : L(def(node.type).tag ?? '')}</small></div>
      {node.type === 'tap' && <InputControl key={`${sel}-${ti}-${cell}`} type={V.sensors[node.tap].type} value={inputs[node.tap] ?? null} onChange={(v) => setInput(node.tap, v)} />}
      {hasValue(node.type) && <Choice options={(s.consts || [0, 1, 2, 3, 4, 5]).map((v) => [v, String(v)])} value={node.value ?? valueDefault(node.type)} onChange={(v) => setNode(node.id, { value: v })} label={tr('数值', 'Value')} roomy />}
      {MERGES.includes(node.type) && <Choice options={MERGES.map((k) => [k, def(k).tag])} value={node.type} onChange={(k) => setNode(node.id, { kind: k })} label={tr('操作', 'Operation')} roomy />}
      {node.type !== 'tap' && node.type !== 'out' && <p className="panel-note">{L(def(node.type).desc)}</p>}
      {node.type !== 'tap' && <p className="panel-note">{probe ? tr(`上次运行：${valueOf(node.id) || '—'}`, `Last run: ${valueOf(node.id) || '—'}`) : tr('还没运行。', 'Not run yet.')}</p>}
    </>
  )
  return (
    <DemoBench {...common} height="auto" panel={panel}>
      {scene}
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
