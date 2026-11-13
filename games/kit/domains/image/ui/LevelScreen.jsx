import { Suspense, lazy, useMemo, useState } from 'react'
import { Brief, Level, PinnedPlay } from '../../../shell/index.js'
import CircuitLevel, { useLevelBoard, useLevelRun } from '../../../shell/CircuitLevel.jsx'
import { L, tr, T } from '../../../shell/i18n.js'
import Readouts from '../../../shell/Readouts.jsx'
import { WORDS } from '../../../shell/words.js'
import { checkingTests } from '../engine/graph.js'
import { withHidden } from '../../../engine/tests.js'
import { startBoard } from '../engine/board.js'
import { useImageCards } from './useImageCards.jsx'
import ProbeLevel from './ProbeLevel.jsx'
import TestPanel from './TestPanel.jsx'
import { familyOf, iconOf } from './catalog.js'
import { describe } from '../words.js'
import { kindOf, nodeView, viewFor } from './views/views.js'
import { levelSensors } from './sensors.js'
import { pruneUnavailableWires } from './parameters.js'
import { openRef } from '../../../shell/refs.js'
import { partsFor } from './parts.js'
import { AddSheet } from './phone/parts.jsx'
import { inheritedBoard } from '../../../shell/progress.js'

const BenchLevel = lazy(() => import('./benches/BenchLevel.jsx'))

export default function LevelScreen(screen) {
  const { game, level, phone, solve, theme } = screen
  if (level.kind === 'graph') return <ImageCircuit screen={screen} />

  const brief = <Brief game={game} level={level} hint={level.hint} phone={phone} />
  const play = level.kind === 'board' ? (
    <Suspense fallback={<div className="board-loading">{tr('载入中…')}</div>}>
      <BenchLevel level={level} onSolve={() => solve(null)} theme={theme} />
    </Suspense>
  ) : <ProbeLevel level={level} onSolve={() => solve(null)} theme={theme} />
  return <Level phone={phone} className={`level-${level.kind}`} brief={brief} stage={phone ? <PinnedPlay>{play}</PinnedPlay> : play} />
}

/** Keep legacy task data and evaluation on the image domain. CircuitLevel owns editing, slots and checking. */
function ImageCircuit({ screen }) {
  const { game, level, flags, progress, solved, phone, theme } = screen
  game.image.syncOwn(progress)
  const { kit } = game.image
  const { types, runLevel, trainStep, lossOn, hasLearnable, resetTraining } = kit
  const fresh = () => startBoard(level)
  const board = useLevelBoard(screen, {
    fresh,
    open(saved) {
      const names = (circuit, type) => circuit.nodes.filter((n) => n.type === type).map((n) => n.params.name).sort().join()
      const fits = (circuit) => circuit?.nodes && names(circuit, 'input') === [...level.inputs].sort().join() && names(circuit, 'output') === [...level.outputs].sort().join() && circuit.nodes.every((n) => types[n.type])
      const prior = level.carry && game.image.levelById[level.carry]?.tasks.at(-1)
      const carried = inheritedBoard(progress, prior && { ...prior, id: level.carry })
      const offers = (circuit) => circuit.nodes.every((n) => types[n.type]?.fixed || level.palette.includes(n.type))
      return pruneUnavailableWires(kit, fits(saved) ? saved : fits(carried) && offers(carried) ? carried : fresh())
    },
  })
  const { circuit } = board
  const playLevel = solved ? withHidden(level) : level
  // View changes and drags keep the same board version. Only evaluate again when wiring, settings or tests change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const evaluated = useMemo(() => runLevel(playLevel, circuit), [runLevel, board.version, level.tests, level.hidden, solved])
  const hiddenCount = solved ? 0 : level.hidden?.length ?? 0
  const run = useLevelRun(screen, board, {
    tests: playLevel.tests,
    judge: () => ({ ...evaluated, results: evaluated.results.map((test) => ({ pass: test.pass, reason: test.checks.find((check) => !check.pass)?.reason })) }),
    hidden: {
      count: hiddenCount,
      fails: () => runLevel({ ...level, tests: level.hidden }, circuit).results.filter((test) => !test.pass).length,
      words: {
        note: T(`另有 ${hiddenCount} 组隐藏测试，通关后公开。`, `${hiddenCount} more tests are hidden until you pass.`),
        failed: (count) => tr(`${hiddenCount} 组隐藏测试中有 ${count} 组未通过。`, `${count} of ${hiddenCount} hidden tests failed.`),
      },
    },
    onSolve(score) {
      if (level.packs) screen.save({ ...circuit, passed: { nodes: circuit.nodes, wires: circuit.wires } })
      screen.solve(score)
    },
  })
  // The domain has always previewed its outputs live. Only show correctness after the shared check.
  const shown = run.over ? evaluated : {
    ...evaluated, pass: false, untested: true,
    results: evaluated.results.map((test) => ({ ...test, pass: null, checks: test.checks.map((check) => ({ ...check, pass: null, reason: '' })) })),
  }
  const [losses, setLosses] = useState([])
  const [rate, setRate] = useState(level.trainRates?.[1] ?? level.trainRate ?? 1)
  const [scan, setScan] = useState(0.5)
  const [probe, setProbe] = useState(null)
  const change = board.change
  const sensors = useMemo(() => levelSensors(level), [level])
  const ioKinds = Object.fromEntries([...Object.entries(level.tests[0].inputs), ...Object.entries(level.tests[0].expected)].map(([name, value]) => [name, kindOf(value)]))
  const outputLabels = level.outputLabels ?? {}
  const colourOutputs = useMemo(() => Object.entries(level.tests[0].expected).filter(([, value]) => value?.c === 3).map(([name]) => name), [level])
  const views = { in: viewFor(level, 'in'), out: viewFor(level, 'out'), mid: viewFor(level, 'mid'), shows: level.shows, fresh: level.freshViews }
  const { parts, card, corner, sheet } = useImageCards({ kit, graph: circuit, onChange: change, run: shown, testIndex: run.at, has: useMemo(() => game.image.holdsIn(level, flags), [game, level, flags]), sensors, outputLabels, colourOutputs, views, ioKinds, scan, onScan: setScan, theme, phone, test: playLevel.tests[run.at] })
  const { shown: offered, folded } = game.image.offerIn(level, flags)
  const itemOf = (type) => ({ type, label: types[type].label, desc: describe(types, type), icon: iconOf(type), family: familyOf(type), fresh: level.fresh?.includes(type) })

  const train = (steps) => {
    let next = circuit
    const history = []
    const checking = checkingTests(level)
    for (let i = 0; i < steps; i++) {
      const result = trainStep(level, next, rate, { backtrack: !level.trainRates })
      next = result.graph
      history.push({ train: result.loss, check: checking.length ? lossOn(checking, next) : null })
    }
    setLosses((l) => [...l, ...history].slice(-80))
    change(next)
  }

  const training = hasLearnable(circuit) && (
    <section>
      <h3 className="panel-label">{tr('训练')}</h3>
      <div className="train-buttons">
        {level.trainRates && (
          <label className="train-rate">
            <span>{tr('学习率')}</span>
            <select value={rate} onChange={(event) => setRate(Number(event.target.value))}>
              {level.trainRates.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
        )}
        <button onClick={() => train(1)}>{tr('训练 1 步')}</button>
        <button onClick={() => train(10)}>{tr('训练 10 步')}</button>
        <button onClick={() => { change(resetTraining(circuit)); setLosses([]) }}>{tr('重置参数')}</button>
      </div>
      <LossCurve losses={losses} />
    </section>
  )

  const score = (
    <section className="score">
      <Readouts items={[
        { value: evaluated.score.nodes, label: T('元件', 'Parts') },
        { value: evaluated.score.cost, label: T('计算量') },
        evaluated.score.learned > 0 && { value: evaluated.score.learned, label: T('参数') },
      ]} />
      {evaluated.constraint && <p className="constraint">{L(evaluated.constraint)}</p>}
      {progress.best[level.id] && <p className="panel-note">{tr(`最佳：${progress.best[level.id].nodes} 个元件 · 计算量 ${progress.best[level.id].cost}`, `Best: ${progress.best[level.id].nodes} parts · cost ${progress.best[level.id].cost}`)}</p>}
    </section>
  )
  const roleView = (type) => nodeView(circuit.nodes.find((node) => node.type === type) ?? { type }, views)
  const onView = (roles, view) => change({ ...circuit, nodes: circuit.nodes.map((node) => roles.includes(node.type) ? { ...node, view } : node) }, { keep: true })
  const panel = {
    level: playLevel, run: shown, testIndex: run.at, sensors, theme, scan, onScan: setScan,
    inView: roleView('input'), outView: roleView('output'), onView, probe, onProbe: setProbe, hiddenCount,
    hiddenMiss: run.hiddenFailed ? { failed: run.hiddenFailed, total: hiddenCount } : null,
  }
  const selected = shown.results[run.at]
  const test = playLevel.tests[run.at]
  const packed = {
    open(node) {
      const inner = types[node.type]?.circuitOf?.()
      if (!inner) return null
      const builder = game.image.levelById[node.type.slice('own-'.length)].tasks.at(-1)
      const expected = builder.tests[0].expected
      return {
        circuit: inner,
        parts: partsFor(kit, {
          sensors: levelSensors(builder),
          outputLabels: builder.outputLabels,
          colourOutputs: Object.keys(expected).filter((name) => expected[name]?.c === 3),
        }),
      }
    },
    edit: (node) => openRef('level', node.type.slice('own-'.length)),
    trace() {
      const trace = []
      kit.evaluate(circuit, test.inputs, null, trace)
      return { trace }
    },
  }
  const extras = <>{training}{score}</>
  return <CircuitLevel
    screen={screen}
    board={{ ...board, clear: () => { board.clear(); setLosses([]) } }}
    run={run}
    parts={parts}
    items={offered.map(itemOf)}
    folded={folded.map(itemOf)}
    defaults={kit.defaultParams}
    card={card}
    sheet={sheet}
    packed={packed}
    addSheet={({ place, close }) => <AddSheet kit={kit} level={{ ...level, palette: [...offered, ...folded] }} graph={circuit} previewFrom={circuit.nodes.find((node) => node.type === 'input')?.id} test={test} title={tr('放在这一格')} theme={theme} onAdd={place} onClose={close} />}
    describe={(node) => describe(types, node.type)}
    view={{ values: selected.values, errors: selected.errors }}
    canvas={{ corner }}
    className="level-graph"
    brief={{ hint: level.hint, children: !phone && extras }}
    below={phone && extras}
    results={<TestPanel {...panel} part={phone ? undefined : 'row'} />}
    resultsTitle={!phone && <TestPanel {...panel} part="readout" />}
    resultsAside={!phone && <div className="strip-aside"><TestPanel {...panel} part="verdict" /><TestPanel {...panel} part="views" /></div>}
    words={{ go: L(WORDS.check), done: L(WORDS.passed) }}
  />
}

function LossCurve({ losses }) {
  if (!losses.length) return <p className="panel-note">{tr('尚未训练。每训练一步，所有可学习的权重都朝误差减小的方向微调一点。')}</p>
  // Both curves share one log scale: the error on the training tests and, when the level keeps new samples back, on those.
  const all = losses.flatMap((l) => [l.train, l.check]).filter((v) => v !== null && Number.isFinite(v))
  const lo = Math.log(Math.min(...all) + 1e-9)
  const hi = Math.log(Math.max(...all) + 1e-9)
  const line = (key) => losses.map((l, i) => `${(i / Math.max(1, losses.length - 1)) * 200},${56 - ((Math.log(Math.min(l[key], 1e9) + 1e-9) - lo) / Math.max(1e-9, hi - lo)) * 52}`)
  const checked = losses.at(-1).check !== null
  return (
    <figure className="loss">
      <svg viewBox="0 0 200 60" preserveAspectRatio="none" role="img" aria-label={tr('损失曲线')}>
        <polyline className="loss-area" points={`0,60 ${line('train').join(' ')} 200,60`} />
        <polyline points={line('train').join(' ')} />
        {checked && <polyline className="loss-check" points={line('check').join(' ')} />}
      </svg>
      <figcaption>
        {tr('训练误差', 'Training loss')} {losses.at(-1).train.toExponential(1)}
        {checked && <> · {tr('新样本误差', 'New-sample loss')} {losses.at(-1).check.toExponential(1)}</>}
        <span>{tr('对数刻度')}</span>
      </figcaption>
    </figure>
  )
}
