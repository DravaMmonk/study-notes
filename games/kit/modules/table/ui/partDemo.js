import { feeding } from '../../../circuit/model.js'
import { packedBoards } from '../../../circuit/packed-boards.js'
import { insideAt } from '../../../engine/trace.js'
import { columnDepths } from '../../../circuit/layout.js'
import { indexEdges } from '../../../graph.js'
import { splitSource, wireEdges } from '../../../engine/wire-source.js'
import { T } from '../../../shell/i18n.js'
import { signal } from '../model/format.js'
import { recordReads } from '../model/world.js'
import { WORLDS } from '../model/worlds.js'
import { ROBOTS } from '../model/robots.js'
import { isCard, isGiven, modelsOf } from '../model/parts.js'
import { picksOf } from '../model/board.js'
import { testLabel } from '../model/verdict.js'
import { experimentParts } from './board.js'
import { probeValues, wireStateOf } from './circuitRun.js'
import { boardDrawing } from './scene.js'
import { robotDrawing, robotWindow } from './robotDrawing.js'

/** A board with each sensor its cards read on a card of its own ('tap'): the bench sets each one by hand. */
function asTaps(b) {
  const reads = [...new Set(b.nodes.filter((n) => isCard(n.type)).flatMap(picksOf))]
  return {
    nodes: [...reads.map((p) => ({ id: p, type: 'tap', params: { sensor: p } })), ...b.nodes.filter((n) => !isCard(n.type))],
    wires: b.wires.map((w) => { const [from, pick] = splitSource(w.from); return isCard(b.nodes.find((n) => n.id === from)?.type) ? { ...w, from: pick } : w }),
  }
}

/** The bench for a part: its level's last task (its world, robot, board) and, per test, the table that board fills. */
// tasks: every level's last task as the course plays it (../course.js played). borrow: { part: level id } parts that
// are an idea rather than a board show the board of the level that puts the idea to work (the game's content). model:
// the course's board model (../model/run.js modelOf).
function benchFor(model, tasks, borrow, key) {
  const own = tasks.find((T) => T.unlock === key)
  const L = borrow[key] ? tasks.find((T) => T.id === borrow[key]) : own
  if (!L || L.mode !== 'table:circuit' || !L.solution) return null
  const s = L
  const V = WORLDS[s.world]
  const robot = ROBOTS[L.robot] || ROBOTS['table:robot-scout']
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
  const focus = new Set(b ? [key] : L.adds ?? [])
  const { tallest, ...xy } = columns(circuit)
  return { L, s, V, o: s, robot, runs, circuit: place(circuit, xy), lit, focus, built: b ? key : null, height: Math.round(Math.min(440, Math.max(260, tallest * 0.6 + 40))) }
}
const place = (circ, xy) => ({ ...circ, nodes: circ.nodes.map((n) => ({ ...n, x: xy[n.id][0], y: xy[n.id][1] })) })

/** Where the cards start: in columns by how far they are from the inputs, so the board reads left to right. */
function columns(circ) {
  const sources = new Set(circ.nodes.filter((node) => isGiven(node.type)).map(({ id }) => id))
  const ids = circ.nodes.filter(({ type }) => type !== 'out').map(({ id }) => id)
  const depth = columnDepths(ids, indexEdges(wireEdges(circ.wires)).before, (id) => sources.has(id) ? 0 : 1)
  const parts = circ.nodes.filter((n) => !isGiven(n.type))
  const last = Math.max(1, ...parts.map((n) => depth.get(n.id)))
  circ.nodes.filter((n) => n.type === 'out').forEach((n) => depth.set(n.id, last + 1))
  // Inputs are short cards and stack closer; every column is centred on the tallest.
  const placed = circ.nodes.map((n) => n.id)
  const gap = (d) => (d === 0 ? 124 : 150)
  const count = new Map()
  placed.forEach((id) => count.set(depth.get(id), (count.get(depth.get(id)) ?? 0) + 1))
  const tallest = Math.max(...[...count].map(([d, n]) => n * gap(d)))
  const rows = new Map(), xy = {}
  for (const id of placed) {
    const d = depth.get(id), k = rows.get(d) ?? 0
    rows.set(d, k + 1)
    xy[id] = [20 + d * 205, 20 + (tallest - count.get(d) * gap(d)) / 2 + k * gap(d)]
  }
  xy.tallest = tallest
  return xy
}

const valueOf = (values, id) => values.has(id) ? signal(values.get(id)) : ''
const choice = (key, label, options, value, change) => ({ key, kind: 'choice', label, options, value, change })

/** Describe the world and controls for the editor's shared circuit preview. */
export function partDemo(model, course, tasks, borrow, key) {
  const bench = benchFor(model, tasks, borrow, key)
  if (!bench) return null
  const { L, s, V, robot, runs, circuit, lit, focus, built, height } = bench
  const { def, hasValue, valueDefault, valueOptions } = model
  const taskView = course.forTask(s)
  const packed = packedBoards(course, (opened, view) => ({
    ...opened,
    parts: experimentParts(model, opened.circuit, opened.level, view),
  }))
  const tagsOf = (node) => hasValue(node.type) ? `= ${node.params?.value ?? valueDefault(node.type)}` : def(node.type).tag

  const view = ({ test, state, report, graph, change, update }) => {
    const { cell, table, typed, overrides } = state
    const { t } = runs[test]
    const values = probeValues(report?.probe ?? {})
    const keys = V.keys(t, cell)
    const answerKeys = Object.values(keys)
    const shown = new Map(table)
    if (!report) answerKeys.forEach((key) => shown.delete(key))
    const { reads, empty, get } = recordReads(shown)
    const input = (id) => (id in overrides ? overrides[id] : V.read(t, cell, id, get, s))
    const inputs = Object.fromEntries(lit.map((id) => [id, input(id)]))
    const inputKey = (id) => {
      const sensor = V.sensors[id]
      if (sensor.family !== 'view') return null
      const [row, col] = V.here(t, cell)
      return V.keyAt(t, row + sensor.at[0], col + sensor.at[1], cell)
    }
    const setInput = (id, value) => {
      const key = inputKey(id)
      update(key === null
        ? { ...state, overrides: { ...overrides, [id]: value } }
        : { ...state, table: new Map(table).set(key, value), typed: new Set(typed).add(key) })
    }

    const window = robotWindow({ world: V, test: t, task: s, robot, cell, shown, reads, empty, lit, readFact: input })
    const drawings = [
      { editable: true, drawing: boardDrawing({ ...V.scene(t, null, { ...s, bench: { cell, at: answerKeys, shown, reads, empty, typed, sel: null } }), look: robot.look }, { label: T('测试棋盘'), ...(L.boardOpt || { minScale: 0.5, maxScale: 1.1 }) }, null, 'sg-bench-board') },
      { frame: 'sg-bench-view', drawing: robotDrawing(window) },
    ]
    const readout = (node) => {
      const controls = []
      const { id, type, params } = node
      const tap = type === 'tap'
      const given = isGiven(type)
      const value = tap ? inputs[id] ?? null : valueOf(values, id)
      if (tap) controls.push({ key: `${id}-${test}-${cell}`, kind: V.sensors[id].type, value, shown: signal(value), change: (next) => setInput(id, next) })
      const options = valueOptions(type, L)
      if (options) controls.push(choice('value', T('数值', 'Value'), options.map((n) => [n, String(n)]), params?.value ?? valueDefault(type), (value) => change(id, { params: { ...params, value } })))
      const models = modelsOf(type)
      if (models) controls.push(choice('model', T('操作'), models.map((other) => [other, def(other).tag]), type, (next) => change(id, { type: next })))
      return {
        value: tap ? signal(value) : value,
        controls, isInput: tap, focus: focus.has(type), canOpen: Boolean(built && type === built),
        description: given ? null : def(type).desc, tag: given ? '' : tagsOf(node),
        panelTag: tap || type === 'port' ? T('输入', 'Input') : type === 'out' ? T('答案') : def(type).tag,
      }
    }

    return {
      graph, parts: experimentParts(model, graph, s, taskView), height, readout, drawings, wireState: wireStateOf(values),
      pick: (id) => {
        const next = V.cellOf(t, id, s)
        return next == null ? null : { ...state, cell: next, overrides: {} }
      },
      run: () => {
        const probe = {}, trace = []
        const { out } = model.evaluate(graph, (id) => inputs[id] ?? null, V.outs.map(([id]) => id), probe, trace)
        const tableNext = new Map(table)
        Object.entries(keys).forEach(([id, key]) => tableNext.set(key, out[id]))
        return { state: { ...state, table: tableNext }, report: { probe, trace } }
      },
      inside: (id) => {
        const node = graph.nodes.find((item) => item.id === id)
        if (!node || !built || node.type !== built) return null
        const { circuit, parts } = packed.open(node, { level: s })
        const { values } = insideAt(report?.trace ?? [], [id])
        return {
          graph: circuit, name: def(built).name, parts, height,
          readout: (item) => ({
            value: valueOf(values, parts.role(item) === 'sink' ? feeding(circuit, item.id, 'in') : item.id),
            controls: [], hide: isCard(item.type),
            tag: parts.role(item) === 'part' && def(item.type) ? tagsOf(item) : '',
          }),
          outNote: (item, port) => (isCard(item.type) ? signal(inputs[port] ?? null) : null),
          wireState: wireStateOf(values),
        }
      },
    }
  }
  return {
    graph: circuit,
    tests: runs.map(({ t }) => ({ label: testLabel(L, V, t) })),
    start: (k) => ({ cell: runs[k].start, table: new Map(runs[k].table), typed: new Set(), overrides: {} }),
    view,
    layout: { scene: 'sg-bench-scene', canvas: 'sg-bench-canvas', inside: 'sg-inside', back: 'sg-inside-back', open: 'sg-open', body: 'sg-body', tag: 'sg-tag', value: 'sg-val', thumb: 'sg-thumb' },
    note: T('点测试棋盘上的格子，让机器人站过去；输入元件读的就是棋盘上的格子，改它就是改那一格。改好点运行，答案会写进红框。', 'Click a cell on the test board to send the robot there; an input part reads a cell of the board, so changing it changes that cell. Then run, and the answer goes into the red frame.'),
    help: T('点一块，在这里改它：输入、常数，或汇合器的操作。点棋盘上的格子换机器人的位置。'),
  }
}
