import { Suspense, createElement, useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Brief, CircuitLayout, PhonePage, PinnedPlay, RunDock, TestStatus, Workbench } from '../../../games/kit/shell/index.js'
import { Palette, freeSpot } from '../../../games/kit/circuit/index.js'
import { L, tr } from '../../../games/kit/shell/i18n.js'
import { hasLearnable, runLevel, trainStep } from './engine/graph.js'
import { NODE_TYPES, defaultParams } from './engine/nodes.js'
import { startBoard, withHidden } from './levels/util.js'
import Editor from './ui/Editor.jsx'
import ProbeLevel from './ui/ProbeLevel.jsx'
import PhoneCircuit from './ui/phone/PhoneCircuit.jsx'
import TestPanel, { ProbeReadout } from './ui/TestPanel.jsx'
import { boardFor } from './ui/boards/index.js'
import { describe, familyOf, iconOf } from './ui/catalog.js'
import { kindOf, nodeView, viewFor } from './ui/views/views.js'
import { levelSensors } from './ui/sensors.js'
import { usableIn } from './levels/course.js'

// Vision Complete's level screens on the shared game shell (games/kit/shell): a circuit to build (graph), a bench
// (board) and the one probe level. The shell owns the bar, the map, the rail, the dialogs and the saved progress;
// these draw a level in the shell's Workbench (desktop) or PhonePage (phone) and report back with save and solve.

// A run with every test's verdict hidden: the outputs are real, but nothing is marked passed or failed yet.
const untested = (run) => ({
  ...run,
  pass: false,
  untested: true,
  results: run.results.map((r) => ({ ...r, pass: null, checks: r.checks.map((c) => ({ ...c, pass: null, reason: '' })) })),
})

export default function LevelScreen({ game, level, saved, save, solved, solve, flags, progress, theme, phone }) {
  // The board and its test results change together: tests re-run whenever the wiring or a parameter
  // changes, but not while a card is only being dragged around.
  const [{ board, run }, setState] = useState(() => {
    // A saved circuit whose inputs and outputs no longer match the level (it was saved for a level
    // that has since moved) would leave the player with the wrong cards; start fresh instead.
    const names = (type) => (saved?.nodes ?? []).filter((n) => n.type === type).map((n) => n.params.name).sort().join()
    const fits = saved && names('input') === [...level.inputs].sort().join() && names('output') === [...level.outputs].sort().join()
    const initial = fits ? saved : startBoard(level)
    return { board: initial, run: level.kind === 'graph' ? runLevel(solved ? withHidden(level) : level, initial) : null }
  })
  // A circuit level's hidden tests are checked by every run but shown only once the level is solved; from then on
  // they sit in the test list like the others. Training only ever sees the visible tests.
  const revealed = solved
  // A part is in the palette once the level that builds it is solved (levels/course.js).
  const palette = useMemo(() => (level.kind === 'graph' ? usableIn(level, flags) : level.palette ?? []), [level, flags])
  const playLevel = useMemo(() => ({ ...(revealed ? withHidden(level) : level), palette }), [revealed, level, palette])
  const hiddenCount = revealed ? 0 : level.hidden?.length ?? 0
  const [hiddenMiss, setHiddenMiss] = useState(null) // { failed, total } after a run whose visible tests passed
  const [testIndex, setTestIndex] = useState(0)
  // The circuit's results update live, but whether it passes is only shown, and the level only completed, once
  // the player runs the tests; any change to the circuit makes it untested again.
  const [tested, setTested] = useState(false)
  const [armed, setArmed] = useState(false) // 清空 pressed once, waiting for the second press
  const [losses, setLosses] = useState([])
  // The fixed cards are named and drawn by what they carry: a picture, a waveform or a number.
  const ioKinds = level.kind === 'graph' ? Object.fromEntries([...Object.entries(level.tests[0].inputs), ...Object.entries(level.tests[0].expected)].map(([name, value]) => [name, kindOf(value)])) : {}
  const sensors = useMemo(() => (level.kind === 'graph' ? levelSensors(level) : {}), [level])
  const outputLabels = level.outputLabels ?? {}
  const views = { in: viewFor(level, 'in'), out: viewFor(level, 'out'), mid: viewFor(level, 'mid') }
  // The row every profile view traces, as a fraction of the height, shared by cards and tests.
  const [scan, setScan] = useState(0.5)
  const [probe, setProbe] = useState(null) // the cell under the pointer in the test strip, read out under its outputs

  const change = (next, { quiet, keep } = {}) => {
    if (quiet || keep) {
      setState((s) => ({ ...s, board: next }))
      // A change of view is kept but does not touch the circuit, so the tests need not re-run.
      if (keep) save(next)
      return
    }
    const result = runLevel(playLevel, next)
    setHiddenMiss(null)
    setState({ board: next, run: result })
    setTested(false)
    save(next)
  }

  // Run the tests: a passing circuit completes the level (every time, not only the first); a failing one
  // shows the first test it fails. Returns { pass, passed }.
  const runTests = () => {
    if (!run) return { pass: false, passed: 0 }
    setTested(true)
    // Before the level is solved, its hidden tests run here too; the player learns only how many failed.
    const hiddenRun = hiddenCount ? runLevel({ ...level, tests: level.hidden }, board) : null
    const hiddenFailed = hiddenRun ? hiddenRun.results.filter((r) => !r.pass).length : 0
    const pass = run.pass && !hiddenFailed
    setHiddenMiss(run.pass && hiddenFailed ? { failed: hiddenFailed, total: hiddenCount } : null)
    // Every pass opens the shell's passed dialog, not only the first (it also records a better score).
    if (pass) {
      solve(run.score)
      // Now solved: the hidden tests join the list, with this circuit's results on them.
      if (hiddenRun) setState((s) => ({ ...s, run: runLevel(withHidden(level), s.board) }))
    } else if (!run.pass) {
      const first = run.results.findIndex((r) => !r.pass)
      if (first >= 0) setTestIndex(first)
    }
    return { pass, passed: run.results.filter((r) => r.pass).length, hiddenFailed, hiddenTotal: hiddenCount }
  }
  const shown = useMemo(() => (tested || !run ? run : untested(run)), [tested, run])

  // The test panel draws inputs and outputs the way their cards on the board do; switching either
  // place switches both.
  const roleView = (type) => nodeView(board.nodes.find((n) => n.type === type) ?? { type }, views)
  const showRole = (type, shown) => change({ ...board, nodes: board.nodes.map((n) => (n.type === type ? { ...n, view: shown } : n)) }, { keep: true })

  const addNode = (type) => {
    const count = board.nodes.length
    const taken = new Set(board.nodes.map((n) => n.id))
    let index = count
    while (taken.has(`${type}-${index}`)) index += 1
    const id = `${type}-${index}`
    // Drop the new card in the first free spot of a loose grid between the camera and the display.
    const [x, y] = freeSpot(board)
    const node = { id, type, x, y, params: defaultParams(type) }
    change({ ...board, nodes: [...board.nodes, node] })
  }

  const train = (steps) => {
    let next = board
    const history = []
    for (let i = 0; i < steps; i++) {
      const result = trainStep(level, next, level.trainRate ?? 1)
      next = result.graph
      history.push(result.loss)
    }
    setLosses((l) => [...l, ...history].slice(-80))
    change(next)
  }

  const passed = shown?.results.filter((r) => r.pass).length ?? 0

  // Only a circuit level has parts to place; a board or probe level has no palette at all.
  const compactParts = level.kind === 'graph' && <Palette compact items={palette.map((type) => ({ type, label: NODE_TYPES[type].label, desc: describe(type), icon: iconOf(type), family: familyOf(type) }))} onAdd={addNode} />
  const brief = <Brief game={game} level={level} hint={level.hint} phone={phone} />
  const training = level.kind === 'graph' && hasLearnable(board) && (
    <section>
      <h3 className="panel-label">{tr('训练', 'Training')}</h3>
      <div className="train-buttons">
        <button onClick={() => train(1)}>{tr('训练 1 步', 'Train 1 step')}</button>
        <button onClick={() => train(10)}>{tr('训练 10 步', 'Train 10 steps')}</button>
      </div>
      <LossCurve losses={losses} />
    </section>
  )
  const graphLevel = level.kind === 'graph'
  const score = graphLevel && (
    <section className="score">
      <h3 className="panel-label">{tr('评分', 'Score')}</h3>
      <div className="stat-row">
        <div className="stat"><b>{run?.score.nodes ?? 0}</b><span>{tr('节点', 'Parts')}</span></div>
        <div className="stat"><b>{run?.score.cost ?? 0}</b><span>{tr('计算量', 'Cost')}</span></div>
        <div className={`stat ${shown?.pass ? 'is-pass' : ''}`}><b>{shown?.untested ? '—' : passed}/{playLevel.tests.length}</b><span>{shown?.untested ? tr('还没测试', 'Not tested') : tr('测试', 'Tests')}</span></div>
      </div>
      {run?.constraint && <p className="constraint">{L(run.constraint)}</p>}
      {progress.best[level.id] && <p className="panel-note">{tr(`最佳：${progress.best[level.id].nodes} 个节点 · 计算量 ${progress.best[level.id].cost}`, `Best: ${progress.best[level.id].nodes} parts · cost ${progress.best[level.id].cost}`)}</p>}
    </section>
  )
  // Clearing the circuit asks twice, as everywhere in the kit's run bar.
  const clearCircuit = () => {
    if (!armed) {
      setArmed(true)
      window.setTimeout(() => setArmed(false), 2600)
      return
    }
    setArmed(false)
    change(startBoard(level))
    setLosses([])
  }
  const play = level.kind === 'board' ? (
    <Suspense fallback={<div className="board-loading">{tr('载入中…', 'Loading…')}</div>}>
      <BoardLevel level={level} onSolve={() => solve(null)} theme={theme} />
    </Suspense>
  ) : (
    <ProbeLevel level={level} onSolve={() => solve(null)} theme={theme} />
  )
  const testPanel = graphLevel && <TestPanel level={playLevel} hiddenCount={hiddenCount} hiddenMiss={hiddenMiss} run={shown} testIndex={testIndex} onSelect={setTestIndex} sensors={sensors} theme={theme} scan={scan} onScan={setScan} inView={roleView('input')} outView={roleView('output')} onView={showRole} />
  // On a phone everything is one scrolling page: the task, the tests pinned under it, then the
  // circuit as a list of steps (or the board level itself).
  if (phone) {
    // Circuit levels: the circuit map above, a dock with the task, the selected block and the
    // tests below. Board levels: the task, then the board, whose main visual stays pinned.
    if (level.kind === 'graph') {
      return (
        <div className="level-phone level-graph is-split">
          <PhoneCircuit level={playLevel} hiddenCount={hiddenCount} hiddenMiss={hiddenMiss} graph={board} onChange={change} run={shown} onTest={runTests} testIndex={testIndex} onTestIndex={setTestIndex} flags={flags} sensors={sensors} outputLabels={outputLabels} ioKinds={ioKinds} views={views} theme={theme} scan={scan} onScan={setScan} onReset={() => { change(startBoard(level)); setLosses([]) }} brief={brief} training={training} footer={score} testDetails={testPanel} />
        </div>
      )
    }
    return (
      <PhonePage brief={brief} className={`level-${level.kind}`}>
        <PinnedPlay>{play}</PinnedPlay>
      </PhonePage>
    )
  }

  if (!graphLevel) return <Workbench className={`level-${level.kind}`} brief={brief} stage={play} scroll />

  // A circuit level on a desktop: the kit's circuit layout, as in every game. The parts are a row over the board; the
  // strip under it has the tests, the test's inputs, what came out against what was expected, and the run bar.
  const half = { level: playLevel, hiddenCount, hiddenMiss, run: shown, testIndex, onSelect: setTestIndex, sensors, theme, scan, onScan: setScan, inView: roleView('input'), outView: roleView('output'), onView: showRole, probe, onProbe: setProbe }
  const states = playLevel.tests.map((t, k) => (shown?.untested || !shown ? null : shown.results[k]?.pass ? 'pass' : 'fail'))
  const hidden = { count: hiddenCount, failed: hiddenMiss?.failed, note: hiddenMiss ? { zh: `下面的测试都通过了，但 ${hiddenMiss.total} 组隐藏测试里有 ${hiddenMiss.failed} 组没过：电路可能只对这几张图凑巧成立。`, en: `Every test passes, but ${hiddenMiss.failed} of ${hiddenMiss.total} hidden tests fail: the circuit may only happen to work on these pictures.` } : { zh: `另有 ${hiddenCount} 组隐藏测试，运行测试时一起检查，通关后公开。`, en: `${hiddenCount} more hidden tests are checked with every run and shown once you pass.` } }
  return (
    <CircuitLayout
      className="level-graph"
      brief={
        <>
          {brief}
          {training}
          {score}
        </>
      }
      inputs={<TestPanel {...half} part="inputs" />}
      parts={palette.length > 0 && compactParts}
      canvas={<Editor graph={board} onChange={change} run={shown} testIndex={testIndex} flags={flags} sensors={sensors} outputLabels={outputLabels} views={views} ioKinds={ioKinds} scan={scan} onScan={setScan} theme={theme} hasPalette={palette.length > 0} />}
      tests={<TestPanel {...half} part="tests" />}
      status={<TestStatus states={states} hidden={hidden} />}
      outputs={<TestPanel {...half} part="outputs" />}
      outputsAside={<ProbeReadout probe={probe} />}
      actions={
        <footer className="run-foot">
          <RunDock
            secondary={board.nodes.some((n) => !NODE_TYPES[n.type].fixed) ? { label: armed ? tr('确认清空', 'Confirm clear') : tr('清空', 'Clear'), icon: <Trash2 size={16} />, armed, onClick: clearCircuit } : null}
            go={{ label: shown?.pass && !hiddenMiss ? tr('全部通过', 'All passed') : tr('运行测试', 'Run tests'), pass: Boolean(shown?.pass && !hiddenMiss), onClick: runTests }}
          />
        </footer>
      }
    />
  )
}

// Boards are module-level lazy components looked up by name.
function BoardLevel({ level, onSolve, theme }) {
  const board = boardFor(level.board)
  if (!board) return <div className="board-loading">{tr('这个机关台还没做好。', 'This bench is not built yet.')}</div>
  return createElement(board, { level, onSolve, theme })
}

function LossCurve({ losses }) {
  if (!losses.length) return <p className="panel-note">{tr('还没训练。每一步，所有可学习的权重都朝让误差变小的方向挪一点。', 'Not trained yet. Each step nudges every learnable weight in the direction that makes the error smaller.')}</p>
  const max = Math.max(...losses)
  const min = Math.min(...losses)
  const points = losses.map((v, i) => `${(i / Math.max(1, losses.length - 1)) * 200},${56 - ((Math.log(v + 1e-9) - Math.log(min + 1e-9)) / Math.max(1e-9, Math.log(max + 1e-9) - Math.log(min + 1e-9))) * 52}`)
  return (
    <figure className="loss">
      <svg viewBox="0 0 200 60" preserveAspectRatio="none" role="img" aria-label={tr('损失曲线', 'Loss curve')}>
        <polyline className="loss-area" points={`0,60 ${points.join(' ')} 200,60`} />
        <polyline points={points.join(' ')} />
      </svg>
      <figcaption>{tr('损失', 'Loss')} {losses.at(-1).toExponential(1)}<span>{tr('对数刻度', 'log scale')}</span></figcaption>
    </figure>
  )
}
