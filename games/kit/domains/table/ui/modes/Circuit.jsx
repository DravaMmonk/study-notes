// Circuit levels: a robot walks the table cell by cell and runs the player's board on each cell.
// The player picks what the robot reads on the level's two input cards (视野, 本格信息: each sensor picked is an
// output of its own), wires parts on the shared circuit editor (../BoardView.jsx), and the board writes the robot's
// cell. Before a run the test board is a sandbox: the player types numbers into cells and puts the robot anywhere, and
// the robot's cell shows the board's answer at once. Running clears the board and the robot starts from its usual cell.
// The screen plays one task of a level (course.js played): its board is the one the shell keeps for the task, and
// passing it is the shell's solve. A task may be a new world with new inputs after one whose failure is its lesson
// (that task's onFail: the lesson passes it, and the level goes on to the next task), or a new question on the same
// board (`carries`: the shell opens it on the task before's board). A level's first task may also start from the board
// the player left on an earlier level it requires (the level's `carry`). A level that builds a part passes only on a
// board that reads exactly the part's ports. A run that ends (every test passed, or the one that failed) is kept as
// { test } (the shell's lastRun): the task opens on it again, replayed on the board.
import { createElement, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Pause, Play, StepForward } from 'lucide-react'
import { Sheet, TestStatus, Workbench } from '../../../../shell/index.js'
import { L as text } from '../../../../shell/i18n.js'
import { paceOf } from '../../../../engine/trace.js'
import { WORLDS, windowOf } from '../../model/worlds.js'
import { ROBOTS } from '../../model/robots.js'
import { CARDS, isCard, isGiven, modelsOf } from '../../model/parts.js'
import { blank, fitted, picksOf, placed, portsProblem, readsOf, removeNode, splitSrc, withPicks } from '../../model/board.js'
import { judge, testLabel, whyFailed } from '../../model/verdict.js'
import { signal } from '../../model/format.js'
import { diagnosisOf, guideAt } from '../../items/conditions.js'
import { trace } from '../../items/traces.js'
import { Panel } from '../../items/panels.jsx'
import { toGraph, create, partsFor } from '../board.js'
import { fromGraph } from '../../model/wiring.js'
import { lookIcon } from '../looks.js'
import { tr, lazy } from '../../lang.js'
import { SgCanvas, SgParts, SgPhone } from '../BoardView.jsx'
import RobotView from '../RobotView.jsx'
import Scene from '../Scene.jsx'
import { Dock, Html, LevelBrief, TestChips, buzz, typing, useKeys, usePlayer, useToast, useVerdict } from '../play.jsx'

const MERGES = ['msum', 'mmin', 'mmax']
const CONSTS = [0, 1, 2, 3, 4, 5]
/** A level's parts as the player picks them: each family of models (the mergers) is one entry, the first of them,
 *  whose model is then chosen on the card. */
const shelf = (palette) => palette.filter((k) => { const m = modelsOf(k); return !m || k === palette.find((x) => m.includes(x)) })
/** The models a part can swap to in place, keeping its wires (a merger's), within the level's palette. */
const swapsOf = (type, palette) => { const m = modelsOf(type); return m ? m.filter((k) => k === type || palette.includes(k)) : [] }
/** How that one merger entry reads, when the level has more than one model of it (def: the course's, ../../model/parts.js). */
const mergerEntry = (def, models) => ({
  label: lazy(() => def(models[0]).name),
  tag: lazy(() => models.map((k) => def(k).tag).join(' / ')),
  icon: lookIcon('merger'),
  look: 'merger',
  desc: lazy(() => tr(`把接进来的几个数汇成一个。放上后在元件上选操作：${models.map((k) => def(k).tag).join('、')}；换操作时连线不变。`, `Merges the numbers wired into it into one. Pick its operation on the part once placed: ${models.map((k) => def(k).tag).join(', ')}; the wires stay when you swap.`)),
})
/** Palette entries for some parts: a merger's models as one entry (when there are several), each with what it does. */
const itemsOf = (def, all) => {
  const models = all.filter((k) => MERGES.includes(k))
  return shelf(all).map((type) => {
    const d = def(type)
    // A part that shares its name with a family shown as one entry (「任一是」 beside the mergers) says its model.
    const twin = !modelsOf(type) && all.some((k) => k !== type && modelsOf(k) && String(def(k).name) === String(d.name))
    const item = { type, name: twin ? lazy(() => `${d.name} · ${d.tag}`) : d.name, label: d.tag && type !== 'const' && !d.built ? lazy(() => `${d.name} · ${d.tag}`) : d.name, desc: d.desc, icon: lookIcon(type), tag: type === 'const' ? tr('一个数', 'a number') : d.tag }
    return MERGES.includes(type) && models.length > 1 ? { ...item, ...mergerEntry(def, models), name: mergerEntry(def, models).label } : item
  })
}

/** The task as it opens: its board as saved (else as course.js opening starts it), and the run kept from the last
 *  visit, replayed as it ended. */
function opening(table, L, saved, progress, lastRun) {
  const board = saved?.nodes ? fitted(saved, L.given) : table.opening(L, progress.data)
  const st = { board, ti: 0, status: L.tests.map(() => null), view: null, typed: {}, robot: null, sel: null, input: '' }
  if (lastRun && lastRun.test < L.tests.length) {
    for (let k = 0; k <= lastRun.test; k++) {
      const { ok, stop, view } = judge(table.model, L, board, k, { ...L, boardWidth: 0 })
      st.status[k] = ok ? 'pass' : 'fail'
      if (k === lastRun.test) Object.assign(st, { ti: k, view: { ...view, k: stop, end: true } })
    }
  }
  return st
}

export default function Circuit({ game, level, saved, save, solve, fail, lastRun, keepRun, flags, progress, phone }) {
  const L = level.source
  const robot = ROBOTS[L.robot]
  const model = game.table.model
  const player = usePlayer()
  const verdict = useVerdict({ level, solve, fail })
  const [toast, toastEl] = useToast()
  const shell = useRef(null)
  shell.current = { save, keepRun }
  // The task's state: { board, ti, status, view, typed, robot, sel, input }. `put` applies a change at once to
  // the latest state, so a run under way and the handlers it outlives never work on an old one.
  const [st, setSt] = useState(() => opening(game.table, L, saved, progress, lastRun))
  const latest = useRef(st)
  latest.current = st
  const put = (change) => {
    const next = { ...latest.current, ...(typeof change === 'function' ? change(latest.current) : change) }
    latest.current = next
    setSt(next)
  }
  const [sheet, setSheet] = useState(null) // { kind: 'node', id, move? } | { kind: 'slot', at, place }
  const [boardWidth, setBoardWidth] = useState(0) // px the test board may take across (a board of several layers lays them out to it)
  const root = useRef(null)
  const running = player.running
  // A task that brings something new says so the first time it opens.
  useEffect(() => {
    if (L.unlockToast && !progress.data[L.taskId]) toast(L.unlockToast)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // A part is in the palette once the level that builds it is solved, and stays in every level after it; what the
  // level's puzzle does not need is folded away (../../../../course.js offer).
  const allowed = useMemo(() => game.table.usableIn(L, flags), [game, L, flags])
  const shownSet = useMemo(() => new Set(game.table.offerIn(L, flags).shown), [game, L, flags])
  const s = L, V = WORLDS[s.world], board = st.board, tests = s.tests, expected = s.expected
  const opt = { ...s, boardWidth }
  /** The parts this player can use on this task (its palette holds the carried ones too), in its order; of those, the
   *  ones the task shows, and the folded rest. */
  const offeredParts = s.palette.filter((k) => allowed.has(k))
  const shownParts = offeredParts.filter((k) => shownSet.has(k))
  const foldedParts = offeredParts.filter((k) => !shownSet.has(k))
  const label = (t) => testLabel(L, V, t)
  /** The sensors a card may read on this task, in the order it offers them. */
  const offered = (card) => s.given.offers[card]
  const avail = [...offered('view'), ...offered('facts')]
  /** The port inputs of the part this task builds, by id, for the editor's labels. */
  const terms = { sensors: V.sensors, outs: V.outs, ports: Object.fromEntries(s.ports.filter((p) => p.input).map((p) => [p.input, { label: p.label, short: p.short }])) }

  // What is on the test board now: the sandbox (typed numbers, the robot where the player put it, its answer computed
  // live), or the step of the run being shown.
  const t = tests[st.ti], v = st.view
  const step = v && v.k ? v.res.steps[v.focus ?? v.k - 1] : null
  const box = step ? null : (() => {
    const cell = st.robot || V.sample(t, opt), keys = V.keys(t, cell)
    const shown = new Map(V.base ? V.base(t, opt) : []), reads = new Set(), empty = new Set(), probe = {}
    Object.entries(st.typed).forEach(([k, x]) => shown.set(k, x))
    const get = (key) => { reads.add(key); if (shown.has(key)) return shown.get(key); empty.add(key); return null }
    const { out } = model.evaluate(board, (id, layer) => V.read(t, cell, id, get, opt, layer), V.outs.map((x) => x[0]), probe)
    Object.entries(keys).forEach(([id, key]) => shown.set(key, out[id]))
    return { cell, at: Object.values(keys), shown, reads, empty, probe, typed: new Set(Object.keys(st.typed)), sel: st.sel }
  })()
  const cell = step ? step.cell : box.cell
  const shown = box ? box.shown : new Map(v.res.base)
  if (v) v.res.steps.slice(0, (v.focus ?? v.k - 1) + 1).forEach((x) => (x.writes || []).forEach(([key, val]) => shown.set(key, val)))
  /** What a sensor reads there, wired or not. */
  const readPick = (pick) => V.read(t, cell, pick, (key) => (shown.has(key) ? shown.get(key) : null), opt, 'self')
  // The robot's window, live during a run or an inspection, otherwise around the robot on the sandbox.
  const win = (() => {
    const reads = step ? new Set(step.reads) : box.reads, isEmpty = (key) => (step ? step.empty === key : box.empty.has(key))
    // A swept cell shows what the table holds there, or (v) a value of its own, such as the cost of a piece.
    const mark = (x) => ({ ...x, value: x.v !== undefined ? signal(x.v) : x.key !== null && shown.has(x.key) ? signal(shown.get(x.key)) : '', state: isEmpty(x.key) ? 'empty' : reads.has(x.key) ? 'read' : '' })
    const w = windowOf(V, t, cell, robot.vision, opt)
    w.wins = w.wins.map((x) => ({ ...x, cells: x.cells.map(mark) }))
    if (w.arm && w.arm.cells) w.arm.cells = w.arm.cells.map(mark)
    if (w.arm && w.arm.sweeps) w.arm.sweeps = w.arm.sweeps.map((x) => ({ ...x, cells: x.cells.map(mark) }))
    if (w.arm && (s.noArm || !robot.arm)) w.arm = null
    if (w.arm) w.arm.filter = opt.filter
    w.facts = s.facts.map((id) => ({ id, value: signal(V.read(t, cell, id, (key) => shown.get(key) ?? null, opt)) }))
    w.robot = robot
    w.probe = box ? box.probe : step.probe
    // A run that stopped on a cell not computed yet (`halted`) never computed what came after it.
    w.halted = Boolean(step && step.empty !== undefined)
    return w
  })()

  /** A change of board: the tests start over, the board is kept, and the last run is gone. */
  const setBoard = (b) => {
    put({ board: b, status: tests.map(() => null), view: null })
    shell.current.save(b)
    shell.current.keepRun(null)
  }
  const fresh = () => fitted(blank(), s.given)
  /** A card reads one more sensor, or one fewer: each is an output of its own, in the order the card offers them, and
   *  the wires from a sensor taken off come off with it. */
  const togglePick = (id, pick) => {
    const n = board.nodes.find((x) => x.id === id)
    if (!n) return
    const picks = picksOf(n), order = offered(id)
    const next = picks.includes(pick) ? picks.filter((p) => p !== pick) : [...picks, pick].sort((a, c) => order.indexOf(a) - order.indexOf(c))
    setBoard({ ...board, nodes: board.nodes.map((x) => (x.id === id ? withPicks(x, next) : x)), wires: board.wires.filter((w) => { const [f, p] = splitSrc(w.from); return f !== id || next.includes(p) }) })
  }
  /** A sensor picked anywhere (the view, the facts): its card gains or loses that output. */
  const pickSensor = (id) => {
    if (player.running) return
    const card = ['view', 'facts'].find((c) => offered(c).includes(id))
    if (card) togglePick(card, id)
    buzz(6)
  }
  const setValue = (id, x) => setBoard({ ...board, nodes: board.nodes.map((n) => (n.id === id ? { ...n, params: { ...n.params, value: x } } : n)) })
  /** A merger swapped to another model, its wires kept. */
  const swap = (id, type) => {
    setBoard({ ...board, nodes: board.nodes.map((n) => (n.id === id ? { ...n, type } : n)) })
    buzz(8)
  }

  /** The hint for this failure (the misses before it pick which), worded again in the current language whenever the
   *  fail dialog is redrawn. */
  const hintFor = () => {
    const b = board, before = verdict.fails.current
    const pick = () => diagnosisOf(L.diagnose, b) || (s.hints ? s.hints[Math.min(Math.max(before - 1, 0), s.hints.length - 1)] : null)
    return pick() ? lazy(pick) : null
  }
  /** Why test k failed (model/verdict.js), worded again whenever the fail dialog is redrawn. */
  const explain = (k, test, res, mm) => whyFailed({ L, V, opt, label, expected }, k, test, res, mm)
  /** A task whose failure is its lesson (its onFail): what went wrong, why no board could do better, and on: the lesson
   *  passes the task, and the level goes straight on to the next. */
  const lesson = (k, res) => {
    const at = { test: k + 1, want: signal(expected[k]), got: signal(res.value) }
    return {
      head: s.onFail.head,
      body: lazy(() => String(s.onFail.body).replace(/\{(test|want|got)\}/g, (_, f) => at[f])),
      extra: <Panel call={s.onFail.show} t={tests[0]} />,
      cta: { label: s.onFail.next, fn: () => { solve(null); level.steps.go(L.task + 1) } },
      hint: null,
    }
  }

  /** Run every test; `step` starts the run paused, so the player steps through it. */
  const run = async ({ step: held = false } = {}) => {
    const b = board
    const miss = V.outs.find(([id]) => !b.wires.some((w) => w.to === id))
    if (miss) {
      toast(tr(`输出口「${text(miss[1])}」还没接线`, `The output “${text(miss[1])}” is not wired yet`))
      buzz(20)
      return
    }
    put({ sel: null, typed: {}, robot: null, status: tests.map(() => null) })
    player.begin(held)
    const mark = (k, state) => (x) => ({ status: x.status.map((y, j) => (j === k ? state : y)) })
    for (let k = 0; k < tests.length; k++) {
      const { t: test, res, mm, ok, stop, view } = judge(model, s, b, k, opt)
      put((x) => ({ ti: k, view, ...mark(k, 'run')(x) }))
      // The kit's pace (several steps a frame on a long run); a paused run goes one step at a time.
      const { per, stride } = paceOf(k, stop)
      const by = () => (player.paused ? 1 : stride)
      for (let j = Math.min(by(), stop); ; j = Math.min(j + by(), stop)) {
        put((x) => ({ view: { ...x.view, k: j } }))
        await player.wait(per)
        if (!player.alive) return
        if (j === stop) break
      }
      put((x) => ({ view: { ...x.view, end: true }, ...mark(k, ok ? 'pass' : 'fail')(x) }))
      if (!ok) {
        shell.current.keepRun({ test: k })
        player.end()
        verdict.fail(s.onFail ? lesson(k, res) : { ...explain(k, test, res, mm), hint: hintFor() })
        return
      }
      await player.wait(per)
      if (!player.alive) return
    }
    shell.current.keepRun({ test: tests.length - 1 })
    player.end()
    // A board that becomes a part must read exactly the part's ports, or the part would not do what the board did.
    const why = s.ports.length ? portsProblem(b, s.ports) : null
    if (why) {
      verdict.fail({ head: lazy(() => tr('还不能做成元件', 'Not a part yet')), body: why, hint: null })
      return
    }
    verdict.pass()
  }
  // 单步 is always there: before a run it starts one held on its first step; during one it stops the run where it is,
  // or moves a stopped run on a step.
  const stepAct = () => {
    if (!player.running) run({ step: true })
    else if (player.paused) player.step()
    else player.pause()
  }

  const selectTest = (k) => {
    if (player.running) return
    put({ ti: k, view: null, typed: {}, robot: null, sel: null })
  }
  /** A cell of the test board: before a run, one to type a number into; after one, a step to look at again. */
  const onCell = (id) => {
    if (player.running) return
    if (!v) {
      put({ sel: st.sel === id ? null : id, input: '' })
      buzz(6)
      return
    }
    if (!v.end) return
    let q = -1
    v.res.steps.slice(0, v.k).forEach((x, j) => { if (x.at.includes(id)) q = j })
    if (q < 0) return
    put({ view: { ...v, focus: v.focus === q ? null : q } })
    buzz(6)
  }
  const key = (k) => {
    const { sel, input } = latest.current
    if (k === 'close') put({ sel: null })
    else if (k === 'del') put({ input: input.slice(0, -1) })
    else if (k === 'bot') {
      put({ robot: V.cellOf(t, sel, opt), sel: null, input: '' })
      buzz(8)
    } else if (k === 'ok') {
      const { [sel]: _, ...rest } = latest.current.typed
      put({ typed: input === '' ? rest : { ...rest, [sel]: +input }, sel: null, input: '' })
      buzz(8)
    } else if (input.length < 3) put({ input: (input === '0' ? '' : input) + k })
  }
  // Escape puts the keypad away; digits, Backspace and Enter type into the selected cell.
  useKeys((event) => {
    if (!st.sel) return
    if (event.key === 'Escape') put({ sel: null, input: '' })
    else typing(event, key)
  })

  // On a desktop the test board takes the width of the strip's pane, as large as fits it (fitBoard); on a phone the
  // width of the page.
  const measure = () => {
    const el = root.current
    const pane = el && (phone ? el.querySelector('.sg-board') : el.querySelector('.wb-results > .wb-pane-body'))
    if (!pane) return
    const pad = getComputedStyle(pane)
    setBoardWidth(pane.clientWidth - parseFloat(pad.paddingLeft) - parseFloat(pad.paddingRight))
  }
  useLayoutEffect(() => {
    measure()
    if (!phone) fitBoard(root.current)
  })
  // The test board follows the strip it sits in as that is dragged taller or shorter: drawn again, and fitted.
  const [, redraw] = useReducer((n) => n + 1, 0)
  useEffect(() => {
    const strip = !phone && root.current?.querySelector('.wb-results > .wb-pane-body')
    if (!strip) return undefined
    const refit = new ResizeObserver(redraw)
    refit.observe(strip)
    return () => refit.disconnect()
  }, [phone])

  const ui = { sensors: V.sensors, avail, lit: readsOf(board), outs: V.outs, win }
  /** The board, played on the shared circuit editor: the graph it shows, how a change comes back, new parts, sheets. */
  const bridge = {
    graph: () => toGraph(board),
    parts: () => partsFor(model, board, terms),
    model,
    probe: () => win.probe,
    /** Whether the run stopped on a cell not computed yet, before computing the rest. */
    reading: () => ({ halted: win.halted }),
    change(next, { keep } = {}) {
      if (player.running) return
      const b = fitted(fromGraph(next), s.given)
      // A card moved only changes where it sits: kept, but the tests need not run again.
      if (!keep) {
        setBoard(b)
        return
      }
      put({ board: b })
      shell.current.save(b)
    },
    create: (graph, type, at) => create(model, graph, type, at),
    reset: () => setBoard(fresh()),
    /** Whether clearing would take anything away: a part, a wire, or something a card reads. */
    clearable: () => board.wires.length > 0 || placed(board).length > 0 || readsOf(board).length > 0,
    palette: () => itemsOf(model.def, shownParts),
    /** Every part the player may place on this task, shown or folded (a board read from text may use any). */
    types: () => offeredParts,
    folded: () => itemsOf(model.def, foldedParts),
    consts: () => L.consts || CONSTS,
    /** The models a merger can swap to in place (its wires stay). */
    swaps: (type) => swapsOf(type, offeredParts),
    setValue(id, x) {
      if (player.running) return
      setValue(id, x)
      buzz(6)
    },
    /** What one of a card's outputs carries now, wired or not. */
    outValue: (node, pick) => signal(readPick(pick)),
    swap: (id, type) => !player.running && swap(id, type),
    /** What an input card reads, inside it: the robot's view and arm, or the cell's facts. */
    cardView: (type) => <RobotView ui={ui} part={type} onPick={pickSensor} />,
    openNode: (id, extra) => { if (!player.running && board.nodes.some((n) => n.id === id && (isCard(n.type) || !isGiven(n.type)))) setSheet({ kind: 'node', id, move: extra?.move }) },
    openSlot: (at, extra) => { if (!player.running) setSheet({ kind: 'slot', at, place: extra.place }) },
  }

  // The test board, with the run's end, or the sandbox.
  const scene = { ...V.scene(t, v, { ...opt, ...(v && v.end && v.pass && L.trace ? trace(L.trace, t) : {}), bench: v ? null : box }), look: robot.look }
  const testBoard = <Scene scene={scene} opt={{ label: tr('棋盘', 'Board'), ...(L.boardOpt || { minScale: 0.7, maxScale: 1.25 }) }} onCell={onCell} />
  const note = (() => {
    if (!v) return ''
    if (!v.end) return step ? tr(`${step.round ? `第 ${step.round} 轮 · ` : ''}正在算${V.where(step.cell)}`, `${step.round ? `Round ${step.round} · ` : ''}Computing ${V.where(step.cell)}`) : ''
    if (v.focus !== null && v.focus !== undefined) return tr(`正在看${V.where(step.cell)}，再点一次取消。`, `Looking at ${V.where(step.cell)}. Click again to leave.`)
    if (v.halt) return tr(`机器在${V.where(step.cell)}出了错。`, `The machine went wrong at ${V.where(step.cell)}.`)
    const rounds = v.res.rounds ? tr(`扫了 ${v.res.rounds} 轮，最后一轮一格也没变。`, `Scanned ${v.res.rounds} round${v.res.rounds === 1 ? '' : 's'}; the last round changed nothing. `) : ''
    return `${rounds}${v.pass ? tr(`答案 ${signal(v.res.value)}，正确。`, `Answer ${signal(v.res.value)}: correct.`) : tr(`机器算出 ${signal(v.res.value)}，应该是 ${signal(expected[st.ti])}。`, `The machine computed ${signal(v.res.value)}; it should be ${signal(expected[st.ti])}.`)}`
  })()
  // Under the test board: back to the sandbox once a run is over, and what the level shows there.
  const after = (
    <div className="sg-after">
      {v && v.end && !running && <button className="sec-btn backbench" type="button" onClick={() => put({ view: null })}>{tr('回到棋盘测试', 'Back to the test board')}</button>}
      {L.after && <Panel call={L.after} t={t} view={v} st={st} />}
    </div>
  )
  const tip = guideAt(L.guide, board) ?? ([s.ask, s.tip].filter(Boolean).join(' ') || null)
  const brief = <LevelBrief game={game} level={level} tip={tip} hint={s.hints || null} />
  const testTabs = <TestChips tests={tests.map((x, k) => ({ label: `${tr('测试', 'Test')} ${k + 1} · ${label(x)}`, status: st.status[k] }))} ti={st.ti} onTest={selectTest} />
  // The run bar: 单步, then Run, or during a run pause / go on and skip; while a number is typed, the keypad.
  const padExtra = st.sel && V.cellOf(t, st.sel, opt) && !box?.at.includes(st.sel) ? { key: 'bot', label: tr('让机器人站到这一格', 'Put the robot on this cell') } : null
  const stepCtl = { key: 'step', label: tr('单步', 'Step'), icon: <StepForward size={16} />, onClick: stepAct }
  const dock = (
    <Dock
      pad={st.sel && { title: tr(`${V.name(st.sel)}：填一个数（不填 = 清空这一格）`, `${V.name(st.sel)}: type a number (leave blank to clear the cell)`), value: st.input, extra: padExtra, onKey: key }}
      controls={running ? [stepCtl, player.paused ? { key: 'resume', label: tr('继续', 'Continue'), icon: <Play size={16} />, onClick: player.resume } : { key: 'pause', label: tr('暂停', 'Pause'), icon: <Pause size={16} />, onClick: player.pause }] : [stepCtl]}
      go={running ? { label: tr('跳过动画', 'Skip animation'), busy: true, onClick: player.skip } : { label: tr('运行测试', 'Run tests'), onClick: () => run() }}
    />
  )
  const close = () => setSheet(null)
  const sheets = sheet && (
    <Sheet onClose={close}>
      <div className="sg-sheet">
        {sheet.kind === 'node' && <NodeSheet model={model} node={board.nodes.find((n) => n.id === sheet.id)} move={sheet.move} offered={offered} V={V} robot={robot} swaps={(type) => swapsOf(type, offeredParts)} consts={L.consts || CONSTS} close={close}
          on={{ pick: (pick) => { togglePick(sheet.id, pick); buzz(6) }, value: (x) => { setValue(sheet.id, x); close() }, swap: (type) => { swap(sheet.id, type); close() }, remove: () => { setBoard(removeNode(board, sheet.id)); close() } }} />}
        {sheet.kind === 'slot' && <SlotSheet items={itemsOf(model.def, shownParts)} close={close} place={(type) => { close(); sheet.place(type) }} />}
      </div>
    </Sheet>
  )

  // A phone: the page holds the board (slots), the test board in the results below it, the tests pinned at the top.
  if (phone) {
    return (
      <SgPhone board={bridge} rootRef={root} brief={brief} tests={testTabs} dock={dock} results={
        <section className="bcard" aria-label={tr('棋盘', 'Board')}>
          {testBoard}
          <p className="bnote">{note}</p>
          {after}
        </section>
      }>
        {toastEl}
        {sheets}
      </SgPhone>
    )
  }
  // A desktop: what the robot reads is on its input cards on the board (a click adds or removes that output); the
  // strip under it holds the tests and the test board.
  return (
    <>
      <Workbench
        rootRef={root}
        className="sg-level panel-stage"
        brief={brief}
        parts={<SgParts board={bridge} />}
        stage={<SgCanvas board={bridge} />}
        tests={testTabs}
        status={<TestStatus states={st.status.map((x) => (['pass', 'fail', 'run'].includes(x) ? x : null))} />}
        results={<section className="bcard" aria-label={tr('棋盘', 'Board')}>{testBoard}{after}</section>}
        resultsAside={<p className="bnote">{note}</p>}
        dock={dock}
      />
      {toastEl}
      {sheets}
    </>
  )
}

/** A part's sheet on a phone: what it does, what it reads (视野's box and arm, 本格信息's facts), its number or model,
 *  and moving or deleting it. */
function NodeSheet({ model, node: n, move, offered, V, robot, swaps, consts, close, on }) {
  if (!n) return null
  const { def, hasValue } = model
  const d = isCard(n.type) ? CARDS[n.type] : def(n.type)
  const picks = picksOf(n)
  const fixed = isGiven(n.type)
  // 视野 is set by a square of its box (and the arm), 本格信息 by the facts it reads.
  let grid = null
  if (n.type === 'view') {
    const r = robot.vision, cells = []
    for (let dr = -r; dr <= r; dr++) for (let dc = -r; dc <= r; dc++) {
      // The robot's own cell is the one being worked out: it cannot be read.
      const key = V.sensorAt[`${dr},${dc}`] || null, ok = Boolean(key) && offered('view').includes(key) && Boolean(dr || dc)
      cells.push({ dr, dc, key, ok, on: ok && picks.includes(key), self: !dr && !dc })
    }
    grid = { n: 2 * r + 1, cells }
  }
  const opts = n.type === 'facts' ? offered('facts').map((f) => [f, V.sensors[f].label]) : n.type === 'view' ? offered('view').filter((id) => V.sensors[id].family === 'arm').map((id) => [id, V.sensors[id].label]) : []
  const choices = swaps(n.type)
  return (
    <>
      <div><div className="kicker sig">{d.built ? tr('零件', 'Part') : tr('元件', 'Component')}</div><h3 className="sh">{text(d.name)}</h3></div>
      <div className="prose"><Html as="p" html={d.desc} /></div>
      {grid && (
        <>
          <div className="optlabel">{tr('读哪几格（每一格一个输出口）', 'Which cells (an output for each)')}</div>
          <div className="rgrid" style={{ '--rn': grid.n }}>
            {grid.cells.map((x) => <button key={`${x.dr},${x.dc}`} className={`rcell${x.on ? ' on' : ''}${x.self ? ' self' : ''}`} type="button" disabled={!x.ok} aria-pressed={x.on} aria-label={`${x.dr},${x.dc}`} onClick={() => on.pick(x.key)} />)}
          </div>
        </>
      )}
      {opts.length > 0 && (
        <>
          <div className="optlabel">{n.type === 'facts' ? tr('读哪几条（每一条一个输出口）', 'Which facts (an output for each)') : tr('手臂够到的（每一个一个输出口）', 'What the arm reaches (an output for each)')}</div>
          <div className="chips">{opts.map(([id, l]) => <button key={id} className="chip" type="button" aria-pressed={picks.includes(id)} onClick={() => on.pick(id)}>{text(l)}</button>)}</div>
        </>
      )}
      {hasValue(n.type) && (
        <div className="chips" role="radiogroup" aria-label={tr('数值', 'Value')}>
          {consts.map((x) => <button key={x} className="chip" type="button" role="radio" aria-checked={n.params?.value === x} onClick={() => on.value(x)}>{x}</button>)}
        </div>
      )}
      {/* A merger can change its model in place: the wires stay, only the way it merges changes. */}
      {choices.length > 1 && (
        <>
          <div className="optlabel">{tr('操作（换操作时连线不变）', 'Operation (the wires stay when you swap)')}</div>
          <div className="chips" role="radiogroup" aria-label={tr('操作', 'Operation')}>
            {choices.map((k) => <button key={k} className="chip" type="button" role="radio" aria-checked={k === n.type} onClick={() => on.swap(k)}>{text(def(k).tag)}</button>)}
          </div>
        </>
      )}
      <div className="acts">
        {!fixed && move && <button className="btn sec" type="button" onClick={() => { close(); move() }}>{tr('移动', 'Move')}</button>}
        {!fixed && <button className="btn sec" type="button" onClick={on.remove}>{tr('删除', 'Delete')}</button>}
        <button className="btn pri" type="button" onClick={close}>{tr('好', 'OK')}</button>
      </div>
    </>
  )
}

/** An empty slot on a phone: the level's parts to put in it, each with what it does. */
function SlotSheet({ items, place, close }) {
  return (
    <>
      <div><div className="kicker sig">{tr('元件', 'Components')}</div><h3 className="sh">{tr('放在这一格', 'Place in this slot')}</h3></div>
      <div className="list">
        {items.map((item) => (
          <button key={item.type} className="pal" type="button" onClick={() => place(item.type)}>
            <span className="pal-ic">{createElement(lookIcon(item.look ?? item.type), { size: 19 })}</span>
            <span className="pal-tx"><b>{text(item.name)}</b><Html as="small" html={item.desc} /></span>
          </button>
        ))}
      </div>
      <div className="acts"><button className="btn sec" type="button" onClick={close}>{tr('取消', 'Cancel')}</button></div>
    </>
  )
}

/**
 * The test board in the strip's pane under a circuit: as large as fits the pane (width and height) up to the board's own
 * largest size and cells of LARGEST px, but never under its smallest readable one; a board too big for the pane at that
 * size scrolls in it. Its smallest and largest sizes are the ones sceneSVG wrote (min-width / max-width): the board is
 * drawn afresh before each fit (Scene draws a new board every render).
 */
const READABLE = 26
const LARGEST = 34
function fitBoard(root) {
  const body = root?.querySelector('.wb-results > .wb-pane-body')
  const card = body?.querySelector('.bcard')
  const svg = card?.querySelector('.sg-board > .board-svg')
  if (!svg || !body.clientWidth) return
  // The board as sceneSVG drew it (each fit is of a board drawn afresh), sized at once: a transition (any, with reduced
  // motion) would show its first size for a frame, and the strip would follow that one.
  svg.style.setProperty('transition', 'none', 'important')
  const min = parseFloat(svg.style.minWidth) || 0
  const max = parseFloat(svg.style.maxWidth) || Infinity
  const [, , vw, vh] = svg.getAttribute('viewBox').split(' ').map(Number)
  const gap = parseFloat(getComputedStyle(card).rowGap) || 0
  const pad = getComputedStyle(body)
  const padY = parseFloat(pad.paddingTop) + parseFloat(pad.paddingBottom)
  const shownKids = [...card.children].filter((c) => !c.classList.contains('sg-board') && c.offsetHeight)
  const others = shownKids.reduce((h, c) => h + c.offsetHeight + gap, 0)
  // Cells stay at least READABLE px across, however many there are (a board of many layers runs wider and scrolls).
  const sizes = [...svg.querySelectorAll('g.cell:not(.axis) > rect')].map((r) => +r.getAttribute('width')).sort((a, b) => a - b)
  const cellPx = sizes[Math.floor(sizes.length / 2)] || 0
  const floor = cellPx ? (vw * READABLE) / cellPx : min
  // The pane asks for the board's height at that size, so the strip grows to show a tall board whole.
  body.style.minHeight = `${Math.ceil((floor * vh) / vw + others + padY + 4)}px`
  const w = body.clientWidth - parseFloat(pad.paddingLeft) - parseFloat(pad.paddingRight)
  const fits = Math.min(w, ((body.clientHeight - padY - others - 4) / vh) * vw)
  const most = cellPx ? Math.min(max, (vw * LARGEST) / cellPx) : max
  const width = Math.max(floor, Math.min(most, fits))
  Object.assign(svg.style, { width: `${Math.round(width)}px`, minWidth: '0', maxWidth: 'none' })
}
