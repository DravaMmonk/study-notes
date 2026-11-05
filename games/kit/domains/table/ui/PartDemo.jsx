import { useMemo, useState } from 'react'
import { ArrowLeft, Maximize2 } from 'lucide-react'
import { CanvasEditor, Choice, DemoBench, SlotBoard } from '../../../circuit/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { signal } from '../model/format.js'
import { WORLDS, windowOf } from '../model/worlds.js'
import { ROBOTS } from '../model/robots.js'
import { isCard, isGiven } from '../model/parts.js'
import { picksOf, splitSrc } from '../model/board.js'
import { fill } from '../items/labels.js'
import { CARD_W, partsFor, toGraph } from './board.js'
import RobotView from './RobotView.jsx'
import Scene from './Scene.jsx'

// A part on a bench in the components box (games/kit/shell/PartsBook.jsx), the way its level is played: a test board, the
// robot's view and the board the level is solved with, each sensor it reads on a card of its own and the part's own
// components picked out. The test board starts filled the way that board fills it; click a cell to put the robot
// there. A sensor card reads the board, so changing it changes the cell it reads; constants and a merger's model change
// on their cards. Run computes the robot's cell and writes the answer into its red frame. On a phone the circuit is the
// phone board: tap a block, change it below. A part a level builds opens to show the board it runs, as it ran on the
// bench's last run (the board the player passed its level with, course.js ownBoard).

const MERGES = ['msum', 'mmin', 'mmax']

/** A board with each sensor its cards read on a card of its own ('tap'): the bench sets each one by hand. */
function asTaps(b) {
  const reads = [...new Set(b.nodes.filter((n) => isCard(n.type)).flatMap(picksOf))]
  return {
    nodes: [...reads.map((p) => ({ id: p, type: 'tap', params: { sensor: p } })), ...b.nodes.filter((n) => !isCard(n.type))],
    wires: b.wires.map((w) => { const [from, pick] = splitSrc(w.from); return isCard(b.nodes.find((n) => n.id === from)?.type) ? { ...w, from: pick } : w }),
  }
}

/** The bench for a part: its level, world, robot, board and, per test, the table that board fills. */
// borrow: { part: level id } parts that are an idea rather than a board show the board of the level that puts the idea
// to work (the game's content). model: the course's board model (../model/run.js modelOf).
function benchFor(model, levels, borrow, key) {
  const own = levels.find((L) => L.unlock === key)
  const L = borrow[key] ? levels.find((x) => x.id === borrow[key]) : own
  if (!L || L.mode !== 'circuit') return null
  const s = L.stages.at(-1)
  if (!s.solution) return null
  const V = WORLDS[s.world]
  const robot = ROBOTS[L.robot] || ROBOTS.scout
  const runs = []
  for (const t of s.tests.slice(0, 3)) {
    try {
      const res = model.runCircuit(V, t, s.solution, s)
      // The robot starts two thirds of the way through the scan, where its inputs are already worked out.
      const steps = res.steps.filter((step) => step.writes)
      runs.push({ t, table: res.table, start: steps[Math.floor((steps.length * 2) / 3)]?.cell ?? V.sample(t, s) })
    } catch {
      // A test the reference cannot run is left off the bench.
    }
  }
  if (!runs.length) return null
  // A board that became a part of its own is tried as that one part, fed by the same inputs.
  const b = model.built[key]?.level === L.id ? model.built[key] : null
  const circuit = b
    ? { nodes: [...b.sensors.filter(Boolean).map((p) => ({ id: p, type: 'tap', params: { sensor: p } })), ...b.inputs.filter(Boolean).map((id) => ({ id, type: 'port' })), { id: 'p', type: key, ...(b.setting !== undefined ? { params: { value: b.setting } } : {}) }, { id: b.out, type: 'out' }], wires: [...b.sensors.map((p, k) => ({ from: p ?? b.inputs[k], to: 'p', port: String(k) })), { from: 'p', to: b.out, port: 'in' }] }
    : asTaps(s.solution)
  const lit = circuit.nodes.filter((n) => n.type === 'tap').map((n) => n.params.sensor)
  const focus = new Set(b ? [key] : [...(L.adds ?? []), ...L.stages.flatMap((x) => x.adds ?? [])])
  const avail = [...s.given.offers.view, ...s.given.offers.facts]
  const ports = Object.fromEntries((s.ports ?? []).filter((p) => p.input).map((p) => [p.input, { label: p.label, short: p.short }]))
  const { tallest, ...xy } = columns(circuit)
  return { L, s, V, o: s, robot, runs, circuit: place(circuit, xy), lit, avail, ports, focus, built: b ? key : null, height: Math.round(Math.min(440, Math.max(260, tallest * 0.6 + 40))) }
}
const place = (circ, xy) => ({ ...circ, nodes: circ.nodes.map((n) => ({ ...n, x: xy[n.id][0], y: xy[n.id][1] })) })

/** Where the cards start: in columns by how far they are from the inputs, so the board reads left to right. */
function columns(circ) {
  const into = (id) => circ.wires.filter((w) => w.to === id).map((w) => w.from)
  const depth = new Map(circ.nodes.filter((n) => isGiven(n.type) && n.type !== 'out').map((n) => [n.id, 0]))
  const of = (id, seen = new Set()) => {
    if (depth.has(id)) return depth.get(id)
    if (seen.has(id)) return 1
    seen.add(id)
    const d = 1 + Math.max(0, ...into(id).map((f) => of(f, seen)))
    depth.set(id, d)
    return d
  }
  const parts = circ.nodes.filter((n) => !isGiven(n.type))
  parts.forEach((n) => of(n.id))
  const last = Math.max(1, ...parts.map((n) => depth.get(n.id)))
  circ.nodes.filter((n) => n.type === 'out').forEach((n) => depth.set(n.id, last + 1))
  // Inputs are short cards and stack closer; every column is centred on the tallest.
  const ids = circ.nodes.map((n) => n.id)
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


const wireStateOf = (probe) => (wire) => {
  if (!probe || !(wire.from in probe)) return null
  const v = probe[wire.from]
  return v === null || v === false ? 'dead' : 'live'
}

export default function PartDemo({ model, partKey, phone, levels, borrow }) {
  const bench = useMemo(() => benchFor(model, levels, borrow, partKey), [model, levels, borrow, partKey])
  const [ti, setTi] = useState(0)
  const [cell, setCell] = useState(() => bench?.runs[0].start)
  const [table, setTable] = useState(() => new Map(bench?.runs[0].table ?? []))
  const [typed, setTyped] = useState(() => new Set())
  const [overrides, setOverrides] = useState({}) // inputs that read no board cell (facts, an arm's run)
  const [circ, setCirc] = useState(() => bench?.circuit)
  const [probe, setProbe] = useState(null)
  const [stale, setStale] = useState(false)
  const [sel, setSel] = useState(null) // the block tapped on a phone
  const [inside, setInside] = useState(false) // a built part opened to the board it runs
  if (!bench) return null

  const { def, hasValue, valueDefault } = model
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
    const { out: answer } = model.evaluate(circ, (id) => inputs[id] ?? null, V.outs.map((x) => x[0]), out)
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
  }

  // The test board and the robot's view, drawn by the level's own world; a cell clicked sends the robot there.
  const onCell = (id) => {
    const next = V.cellOf(t, id, o)
    if (next !== null && next !== undefined) moveTo(next)
  }
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
  const scene = (
    <div className="sg-bench-scene">
      <Scene className="sg-bench-board" scene={{ ...V.scene(t, null, { ...o, bench: { cell, at: answerKeys, shown, reads, empty, typed, sel: null } }), look: robot.look }} opt={{ label: tr('测试棋盘', 'Test board'), ...(bench.L.boardOpt || { minScale: 0.5, maxScale: 1.1 }) }} onCell={onCell} />
      <div className="sg-bench-view"><div className="cview"><RobotView ui={{ sensors: V.sensors, avail: bench.avail, lit: bench.lit, outs: V.outs, win: w }} /></div></div>
    </div>
  )

  const graph = circ
  const parts = partsFor(model, circ, { sensors: V.sensors, outs: V.outs, ports: bench.ports })
  const valueOf = (id) => (probe && id in probe ? signal(probe[id]) : '')
  const tests = bench.runs.map((r) => ({ label: bench.L.testLabel ? fill(bench.L.testLabel, r.t) : V.label(r.t) }))
  const common = { tests, test: ti, onTest: pickTest, onRun: run, onReset: reset, state: stale ? 'stale' : probe ? 'ran' : 'idle' }
  const note = { zh: '点测试棋盘上的格子，让机器人站过去；输入元件读的就是棋盘上的格子，改它就是改那一格。改好点运行，答案会写进红框。', en: 'Click a cell on the test board to send the robot there; an input part reads a cell of the board, so changing it changes that cell. Then run, and the answer goes into the red frame.' }
  const isBuilt = (node) => Boolean(bench.built) && node.type === bench.built
  const open = () => {
    setSel(null)
    setInside(true)
  }
  // Inside a built part: the board it runs, fed what the bench feeds the part, with the part's own setting.
  const opened = inside && (
    <Inside
      model={model}
      board={model.built[bench.built].board()}
      setting={circ.nodes.find(isBuilt)?.params?.value}
      sense={(id) => inputs[id] ?? null}
      ran={Boolean(probe)}
      terms={{ sensors: V.sensors, outs: V.outs, ports: bench.ports }}
      name={L(model.built[bench.built].name)}
      phone={phone}
      height={bench.height}
      onBack={() => setInside(false)}
    />
  )

  if (!phone) {
    const body = (node) => {
      if (node.type === 'tap') return <div className="sg-body"><InputControl key={`${node.id}-${ti}-${cell}`} type={V.sensors[node.id].type} value={inputs[node.id] ?? null} onChange={(v) => setInput(node.id, v)} /></div>
      const value = valueOf(node.id)
      return (
        <div className="sg-body" title={!isGiven(node.type) ? L(def(node.type).desc) : undefined}>
          {hasValue(node.type) && (
            <div className="param is-choice">
              <span>{tr('数值', 'Value')}</span>
              <Choice options={(bench.L.consts || [0, 1, 2, 3, 4, 5]).map((v) => [v, String(v)])} value={node.params?.value ?? valueDefault(node.type)} onChange={(v) => setNode(node.id, { params: { ...node.params, value: v } })} label={tr('数值', 'Value')} />
            </div>
          )}
          {MERGES.includes(node.type) && (
            <div className="param is-choice">
              <span>{tr('操作', 'Operation')}</span>
              <Choice options={MERGES.map((k) => [k, def(k).tag])} value={node.type} onChange={(k) => setNode(node.id, { type: k })} label={tr('操作', 'Operation')} />
            </div>
          )}
          <output className={`sg-val ${value ? 'is-on' : ''}`}>{value || '—'}</output>
        </div>
      )
    }
    // Cards may be moved about, but the circuit itself stays as it is.
    const onChange = (next) => {
      if (next.nodes.length === graph.nodes.length && JSON.stringify(next.wires) === JSON.stringify(graph.wires)) setCirc((c) => ({ ...c, nodes: c.nodes.map((n) => { const m = next.nodes.find((x) => x.id === n.id); return m ? { ...n, x: Math.round(m.x), y: Math.round(m.y) } : n }) }))
    }
    // A built part's card opens to the board inside it.
    const head = (node) => isBuilt(node) && (
      <button type="button" className="node-tool" aria-label={tr('打开', 'Open')} title={tr('打开', 'Open')} onPointerDown={(e) => e.stopPropagation()} onClick={open}><Maximize2 size={12} /></button>
    )
    return (
      <DemoBench {...common} height="auto" note={note}>
        {scene}
        {opened || (
          <div className="sg-bench-canvas" style={{ height: bench.height }}>
            <CanvasEditor graph={graph} onChange={onChange} parts={parts} body={body} head={head} wireState={wireStateOf(probe)} cardClass={(node) => (bench.focus.has(node.type) ? 'is-focus' : '')} width={176} height={120} refit />
          </div>
        )}
      </DemoBench>
    )
  }

  // The phone board: each block shows its value; the tapped one is changed in the panel underneath.
  const nameOf = (node) => (node ? L(parts.label(node)) : '')
  const thumb = (node) => {
    const v = node.type === 'tap' ? signal(inputs[node.id] ?? null) : valueOf(node.id)
    return <i className={`sg-thumb ${v && v !== '—' ? 'is-on' : ''}`}>{v || '—'}</i>
  }
  // Sensor taps and outputs are cards, not parts: they have no definition to read a tag from.
  const tileExtra = (node) => (isGiven(node.type) ? '' : hasValue(node.type) ? `= ${node.params?.value ?? valueDefault(node.type)}` : L(def(node.type).tag ?? ''))
  const node = graph.nodes.find((n) => n.id === sel)
  const panel = opened ? null : !node ? (
    <p className="panel-note">{tr('点一块，在这里改它：输入、常数，或汇合器的操作。点棋盘上的格子换机器人的位置。', 'Tap a block to change it here: an input, a constant or a merger’s operation. Tap a cell on the board to move the robot.')}</p>
  ) : (
    <>
      <div className="demo-panel-head"><b>{nameOf(node)}</b><small>{node.type === 'tap' || node.type === 'port' ? tr('输入', 'Input') : node.type === 'out' ? tr('答案', 'Answer') : L(def(node.type).tag ?? '')}</small></div>
      {node.type === 'tap' && <InputControl key={`${sel}-${ti}-${cell}`} type={V.sensors[node.id].type} value={inputs[node.id] ?? null} onChange={(v) => setInput(node.id, v)} />}
      {hasValue(node.type) && <Choice options={(bench.L.consts || [0, 1, 2, 3, 4, 5]).map((v) => [v, String(v)])} value={node.params?.value ?? valueDefault(node.type)} onChange={(v) => setNode(node.id, { params: { ...node.params, value: v } })} label={tr('数值', 'Value')} roomy />}
      {MERGES.includes(node.type) && <Choice options={MERGES.map((k) => [k, def(k).tag])} value={node.type} onChange={(k) => setNode(node.id, { type: k })} label={tr('操作', 'Operation')} roomy />}
      {!isGiven(node.type) && <p className="panel-note">{L(def(node.type).desc)}</p>}
      {node.type !== 'tap' && <p className="panel-note">{probe ? tr(`上次运行：${valueOf(node.id) || '—'}`, `Last run: ${valueOf(node.id) || '—'}`) : tr('还没运行。', 'Not run yet.')}</p>}
      {isBuilt(node) && <button type="button" className="sg-open" onClick={open}><Maximize2 size={14} />{tr('打开', 'Open')}</button>}
    </>
  )
  return (
    <DemoBench {...common} height="auto" panel={panel}>
      {scene}
      {opened || (
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
      )}
    </DemoBench>
  )
}

/**
 * The board a built part runs, only to look at: each card shows what it gives once the bench has run (`ran`), fed by
 * `sense` (what the bench feeds the part, by sensor), its numbers set to the part's own `setting`. The way back out
 * names the part.
 */
function Inside({ model, board, setting, sense, ran, terms, name, phone, height, onBack }) {
  const { def, hasValue, valueDefault } = model
  const inner = setting === undefined ? board : { ...board, nodes: board.nodes.map((n) => (hasValue(n.type) ? { ...n, params: { ...n.params, value: setting } } : n)) }
  const probe = {}
  try {
    model.evaluate(inner, (id) => sense(id), terms.outs.map((x) => x[0]), probe)
  } catch {
    // A board that cannot compute on these inputs shows what it reached.
  }
  const graph = toGraph(inner)
  const parts = partsFor(model, inner, terms)
  const valueOf = (id) => (ran && id in probe ? signal(probe[id]) : '')
  const outNote = (node, key) => (isCard(node.type) ? <b className="sg-oval">{signal(sense(key))}</b> : null)
  const back = <button type="button" className="sg-inside-back" onClick={onBack}><ArrowLeft size={14} />{name}</button>
  if (phone) {
    const thumb = (node) => {
      if (isCard(node.type)) return null
      const v = valueOf(node.id)
      return <i className={`sg-thumb ${v && v !== '—' ? 'is-on' : ''}`}>{v || '—'}</i>
    }
    const tileExtra = (node) => (parts.role(node) !== 'part' ? '' : hasValue(node.type) ? `= ${node.params?.value ?? valueDefault(node.type)}` : L(def(node.type).tag ?? ''))
    return (
      <div className="sg-inside">
        {back}
        <SlotBoard graph={graph} parts={parts} nameOf={(node) => (node ? L(parts.label(node)) : '')} thumb={thumb} tileExtra={tileExtra} outNote={outNote} picking={null} canLand={() => false} onPort={() => {}} onNode={() => {}} onSlot={() => {}} fixed />
      </div>
    )
  }
  const body = (node) => {
    if (isCard(node.type)) return null
    const value = valueOf(node.id)
    return (
      <div className="sg-body" title={parts.role(node) === 'part' ? L(def(node.type).desc) : undefined}>
        {parts.role(node) === 'part' && <small className="sg-tag">{hasValue(node.type) ? `= ${node.params?.value ?? valueDefault(node.type)}` : L(def(node.type).tag)}</small>}
        <output className={`sg-val ${value ? 'is-on' : ''}`}>{value || '—'}</output>
      </div>
    )
  }
  return (
    <div className="sg-bench-canvas sg-inside" style={{ height }}>
      {back}
      <CanvasEditor readOnly graph={graph} parts={parts} body={body} outNote={outNote} wireState={wireStateOf(ran ? probe : null)} width={CARD_W} height={170} refit />
    </div>
  )
}
