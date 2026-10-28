import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Brief, CircuitLayout, RunDock, StepLog, TaskCard, TestStatus, TestTabs, useKeptVerdict, usePlayback } from '../../../shell/index.js'
import Sheet from '../../../shell/Sheet.jsx'
import { L, tr } from '../../../shell/i18n.js'
import { CanvasEditor, FloatWindow, Notice, Palette, PartActions, SlotBoard, Tray, isFixed, outputsOf, spotIn, srcOf, useSlotEditing, within } from '../../../circuit/index.js'
import { MISSING } from '../../../engine/circuit.js'
import { runLevel } from '../../../engine/tests.js'
import { parse } from '../formula.js'
import { inductionCases } from '../proof.js'
import { say } from '../notation.js'
import { ScriptView } from './ScriptScreen.jsx'
import FormulaField from './FormulaField.jsx'
import { formOf } from '../../../engine/forms.js'
import { insideAt, machineSteps, machineViewAt } from './stepping.js'
import { MACHINE_PARTS, syncOwn } from '../machine.js'

// A level of the logic domain played on the shared circuit editor (《证明完毕》): a proof, whose wires carry proved
// judgments, or a machine, whose wires carry formulas and clause sets (boards.jsx says how each runs, is judged and
// shows what its wires carry). The level's inputs are on the left and what it must reach on the right; a frame (a
// proof's assumption box, a machine's repeat frame) holds cards in its regions on the same board
// (../../../circuit/frames.js). Every card shows what it gives right now on the test picked; the run bar checks every
// test, which completes the level. The tests above the strip switch the case everywhere, the cards' choices included.
// A board whose tests can be traced (a machine: boards.jsx) runs step by step instead (../../../shell/usePlayback.jsx):
// the card computing lights up, the board shows what had been computed by then, the strip lists every step's result,
// and the run stops at the first step or test that fails. A part the player built runs the board that built it, and
// its steps are steps of the run: while one is under way, that board opens beside the level's (read only), with its
// cards' values in this run of the part and the card computing lit. Either way the board's last run is kept (the
// shell's lastRun): the level, or a task of it, opens on it again.

const T = (zh, en) => ({ zh, en })

/** The screen for one board (boards.jsx), as a level kind's Screen. */
export const boardScreen = (board) => function LogicBoard(props) { return <BoardScreen board={board} {...props} /> }

function BoardScreen({ board, game, level: entry, saved, save, solve, lastRun, keepRun, flags, progress, phone }) {
  const level = entry.source
  // The parts the player built run the boards that last passed their levels.
  syncOwn(progress.built)
  const parts = useMemo(() => board.parts(level), [board, level])
  // A saved board that no longer fits the level or the game starts fresh.
  const [circuit, setCircuit] = useState(() => (saved?.nodes && board.fits(saved, level, parts) ? board.lock(level, saved) : board.start(level)))
  // The frame region a new card goes into, or null for the board itself (CanvasEditor onTarget).
  const [target, setTarget] = useState(null)
  // A level opens on its first test, the case its task is written in.
  const [testIndex, setTestIndex] = useState(0)
  const tests = level.tests
  // After a check: { pass, results: [{ pass, reason }] } on every test; a change clears it.
  const judge = () => {
    const run = runLevel(board.tests, level, circuit)
    return { pass: run.pass, score: run.score, results: run.results.map((r) => ({ pass: r.pass, reason: r.checks[0].reason })) }
  }
  const [verdict, setVerdict] = useKeptVerdict({ lastRun: !board.tests.trace && lastRun, keepRun }, judge)
  const test = tests[Math.min(testIndex, tests.length - 1)]
  // What the player has here, of the parts this board runs (../../../course.js offer).
  const offered = useMemo(() => game.logic.offerIn(level, flags), [game, level, flags])
  const palette = offered.shown.filter((t) => parts.rules[t])
  const folded = offered.folded.filter((t) => parts.rules[t])
  const types = [...palette, ...folded]
  const live = useMemo(() => board.tests.runTest(level, circuit, test), [board, level, circuit, test])

  // Step by step, on a board that can trace its run: each test traced once per board.
  const stepped = Boolean(board.tests.trace)
  // A card's name on its own board: the level's, or the board a built part runs (drawn with its level's parts).
  const partsOf = useMemo(() => {
    const made = new Map([[level, parts]])
    return (lvl) => made.get(lvl) ?? made.set(lvl, board.parts(lvl)).get(lvl)
  }, [board, level, parts])
  const name = (node, lvl = level) => (partsOf(lvl).role(node) === 'part' ? board.nameOf(lvl, node.type) : partsOf(lvl).label(node))
  const opens = (type) => level.built?.[type]?.opens?.() ?? null
  const traces = useMemo(() => new Map(), [board, level, circuit])
  const tracedOf = (k) => {
    if (!traces.has(k)) {
      const traced = board.tests.trace(level, circuit, tests[k])
      traces.set(k, { ...traced, steps: machineSteps(traced, circuit, level, { name, partName: (type) => board.nameOf(level, type), opens, isRulePart: (type) => !MACHINE_PARTS[type], failing: (tests[k].want ?? level.want) === 'fails' || tests[k].becomes?.length === 0 }) })
    }
    return traces.get(k)
  }
  const playback = usePlayback({
    count: tests.length,
    stepsOf: (k) => tracedOf(k).steps,
    check: (k) => board.tests.check(level, tests[k], tracedOf(k).run.outputs)[0].reason,
    onSolve: () => solve(board.tests.score(level, circuit)),
    onTest: setTestIndex,
    board: circuit,
    kept: stepped ? lastRun : undefined,
    onKeep: stepped ? keepRun : undefined,
  })
  const shownIndex = tests.indexOf(test)
  const run = stepped ? playback.run : null
  const onThis = run && run.test === shownIndex
  const view = onThis ? machineViewAt(tracedOf(shownIndex), tracedOf(shownIndex).steps, run.step) : live
  const stepNow = onThis && run.step >= 0 ? tracedOf(shownIndex).steps[run.step] ?? null : null
  // A step inside a built part lights the part on the level's board.
  const stepClass = (node) => ((stepNow?.path[0] ?? stepNow?.id) === node.id ? `is-step ${stepNow.failed ? 'is-step-fail' : ''}` : '')
  const inside = stepNow?.path.length ? insideAt(tracedOf(shownIndex), tracedOf(shownIndex).steps, run.step, circuit, level, opens) : null

  const change = (next, { keep } = {}) => {
    setCircuit(next)
    save(next)
    if (!keep) setVerdict(null)
  }
  const check = () => {
    const v = judge()
    setVerdict(v)
    if (v.pass) solve(v.score)
    else setTestIndex(Math.max(0, Math.min(tests.length - 1, v.results.findIndex((r) => !r.pass))))
    return v.pass
  }
  const addNode = (type, extra = {}) => {
    const taken = new Set(circuit.nodes.map((n) => n.id))
    let k = circuit.nodes.length
    while (taken.has(`${type}-${k}`)) k += 1
    const id = `${type}-${k}`
    return { id, graph: { ...circuit, nodes: [...circuit.nodes, { id, type, params: {}, ...extra }] } }
  }
  // A new card goes into the region chosen last, while its frame is there and open.
  const into = target && circuit.nodes.some((n) => n.id === target.split('/')[0] && !n.fold) ? target : null
  const add = (type) => {
    const [x, y] = spotIn(circuit, into)
    change(addNode(type, { x, y, ...(into ? { in: into } : {}) }).graph)
  }
  const setParam = (id, key, value) => !circuit.nodes.some((n) => n.id === id && isFixed(n, key)) && change({ ...circuit, nodes: circuit.nodes.map((n) => (n.id === id ? { ...n, params: { ...n.params, [key]: value } } : n)) })

  // Formulas in the level's notation (everyday sentences, symbols once introduced: notation.js).
  const text = (f) => L(say(f, level.notation))
  const scene = board.scene(level, test, text)
  // From chapter 6 on (`terms`) every card shows its proof term too.
  const Value = (props) => <board.Value {...props} terms={Boolean(level.terms)} />
  const result = stepped ? run?.results[shownIndex] : verdict?.results[shownIndex]
  const states = stepped ? playback.states : tests.map((_, k) => (verdict ? (verdict.results[k].pass ? 'pass' : 'fail') : null))
  const best = progress.best?.[level.id]
  const brief = (
    <Brief game={game} level={entry} hint={level.hint} phone={phone}>
      {level.script && <ScriptView rows={level.script} text={(t) => text(parse(t, { consts: [...(level.consts ?? []), ...(level.things ?? [])] }))} />}
      <section className="lg-score">
        <div className="stat-row">
          <div className="stat"><b>{board.tests.score(level, circuit).steps}</b><span>{L(board.words.steps)}</span></div>
          {level.budget !== undefined && <div className="stat"><b>{level.budget}</b><span>{tr('最多', 'At most')}</span></div>}
          {best && <div className="stat"><b>{best.steps}</b><span>{tr('最少', 'Best')}</span></div>}
        </div>
      </section>
    </Brief>
  )
  // A part's description as it reads in this level (the game's revisions along the course: defineGame textAt).
  const descOf = (type) => game.textAt(board.textOf(level, type, level.revisions), entry.id)?.desc
  // The shapes a card of a part with forms offers here: its first, and every one an upgrade passed before brings.
  const formsOf = (type) => game.textAt(board.textOf(level, type, level.revisions), entry.id)?.forms ?? []
  const itemOf = (type) => ({ type, label: board.nameOf(level, type), desc: descOf(type), icon: board.iconOf(level, type), family: board.familyOf(level, type), fresh: entry.fresh?.includes(type) })
  const items = palette.map(itemOf)
  const foldedItems = folded.map(itemOf)
  // What a region opens with (or that it opens with nothing yet): at its left edge, or first in its grid on a phone.
  const regionNote = (node, region) => {
    // A for-any box opens no assumption: its region holds the thing it takes.
    if (node.type === 'allI') return node.params?.x ? <span className="lg-taken">{tr('任取的是', 'Taken:')} <b>{node.params.x}</b></span> : <i className="lg-mark">{tr('还没给它起名', 'not named yet')}</i>
    const v = view.values.get(srcOf(node, region))
    return v ? <Value v={v} text={text} small /> : <i className="lg-mark">{L(board.words.noOpen)}</i>
  }
  // By a region's result: what the frame gives (or why it gives nothing yet); each box of Induction proves its own case.
  const resultNote = (node, region) => {
    if (node.type === 'natInd' && region) {
      let want = null
      try { const G = parse(node.params?.P ?? '', { consts: level.consts ?? [] }); if (G.op === '∀' && node.params?.x) want = inductionCases(G, node.params.x, level.consts)[region] } catch { want = null }
      return want ? <span className="lg-taken">{tr('要证', 'To prove')} <b>{text(want)}</b></span> : <i className="lg-mark">{tr('先选好要证的和名字', 'choose what to prove and the name first')}</i>
    }
    const [v, error] = [view.values.get(node.id), view.errors.get(node.id)]
    if (v) return <Value v={v} text={text} small />
    return error && error !== MISSING ? <span className="lg-error">{L(error)}</span> : <i className="lg-mark">{tr('还没有接上', 'nothing wired in yet')}</i>
  }
  const passed = stepped ? playback.passed : verdict?.pass
  // Clearing is the board's own (a button among its tools, which asks first).
  const onClear = circuit.nodes.some((n) => parts.role(n) === 'part' && !n.locked) ? () => change(board.start(level)) : null
  const dock = stepped
    ? <RunDock {...playback.dock({ go: L(board.words.go), done: L(board.words.passed) })} />
    : <RunDock go={{ label: L(passed ? board.words.passed : board.words.go), pass: Boolean(passed), onClick: check }} />
  // The steps of the test shown, so far: what each card gave, the current one marked.
  const shown = stepped ? playback.shown(shownIndex) : { list: [], at: -1 }
  const stepLog = <StepLog steps={shown.list.map((s) => ({ label: s.label, value: s.value ? <Value v={s.value} text={text} /> : null, failed: s.failed }))} at={shown.at} />
  const verdictText = result ? (result.pass ? L(board.words.pass) : L(result.reason)) : null
  const shared = { board: { ...board, Value }, parts, level, circuit, view, scene, setParam, text, formsOf }
  const insideView = inside && <InsideView inside={inside} board={{ ...board, Value }} parts={partsOf(inside.level)} text={text} name={name} phone={phone} />

  if (phone) return <PhoneBoard {...shared} insideView={insideView} stepLog={stepLog} stepClass={stepClass} stepped={stepped} logged={shown.list.length > 0} began={Boolean(run && (run.step >= 0 || run.results.length > 0 || run.test > 0))} waiting={Boolean(onThis)} stepKey={run ? `${run.test}:${run.step}:${run.results.length}` : ''} onClear={onClear} result={result} verdictText={verdictText} regionNote={regionNote} resultNote={resultNote} testTabs={<TestTabs phone tests={tests} states={states} index={tests.indexOf(test)} onSelect={setTestIndex} />} brief={brief} items={items} foldedItems={foldedItems} dock={dock} change={change} addNode={addNode} types={types} descOf={descOf} scope={level.id} />

  return (
    <CircuitLayout
      className="lg-level"
      brief={brief}
      parts={items.length + foldedItems.length > 0 && <Palette compact items={items} folded={foldedItems} onAdd={add} />}
      canvas={
        <div className="lg-stage">
          <div className="lg-board">
            <CanvasEditor
              key={level.id}
              scope={level.id}
              graph={circuit}
              onChange={change}
              parts={parts}
              width={160}
              height={150}
              body={(node) => <CardBody node={node} {...shared} />}
              head={(node) => parts.role(node) === 'sink' && result && <em className="node-verdict">{L(result.pass ? board.words.reached : board.words.notYet)}</em>}
              cardClass={(node) => `lg-node ${parts.role(node) === 'sink' && result ? (result.pass ? 'is-pass' : 'is-fail') : ''} ${stepClass(node)}`}
              wireState={(wire) => (view.values.get(wire.from) ? 'live' : 'dead')}
              regionNote={regionNote}
              resultNote={resultNote}
              onTarget={setTarget}
              onClear={onClear}
              types={types}
              emptyNote={items.length > 0 && board.words.empty}
              overlay={insideView && <FloatWindow id="lg-inside" className="lg-inside-window" title={inside.path.map((p) => L(name(p.node, p.level))).join(' › ')} at={{ right: 16, top: 16 }}>{insideView}</FloatWindow>}
            />
          </div>
        </div>
      }
      tests={<TestTabs tests={tests} states={states} index={tests.indexOf(test)} onSelect={setTestIndex} />}
      status={<TestStatus states={states} />}
      outputsTitle={tr('这组测试', 'This test')}
      outputs={
        <div className="lg-strip">
          <p className="lg-sequent">{scene.sequent}</p>
          {stepLog}
          <p className={`lg-verdict ${result ? (result.pass ? 'is-pass' : 'is-fail') : ''}`}>{verdictText ?? L(board.words.idle)}</p>
        </div>
      }
      actions={<footer className="run-foot">{dock}</footer>}
    />
  )
}

// The shapes a part with forms offers on its card here: its first, and those `more` brings, each with its label (its
// text's `forms`, [{ key, label }]).
const shapesOf = (part, text, more) => part.forms.filter((k, i) => i === 0 || more.includes(k)).map((k) => ({ key: k, label: text?.forms?.find((f) => f.key === k)?.label ?? k }))
const DEPTHS = [2, 3, 4, 5, 6, 8, 10, 12]
const WAYS = [2, 3, 4, 5, 6]

// What a machine board's input and result hold (`board.ioBox`), written out in full, in a box sized as a step's result
// in the run (shell StepLog): as tall as what it holds, up to that result's height, and scrolling past it.
const IoBox = ({ children }) => <div className="lg-io" onPointerDown={(e) => e.stopPropagation()}>{children}</div>

// The rules a rule part gives, each written out, ticked on or off; at least one stays ticked. The part gives them in
// the order listed.
function RuleTicks({ label, value, onChange, choices, disabled }) {
  const toggle = (k) => {
    const next = value.includes(k) ? value.filter((x) => x !== k) : [...value, k]
    if (next.length) onChange(choices.map((c) => c.value).filter((c) => next.includes(c)))
  }
  return (
    <div className="lg-ticks" role="group" aria-label={L(label)} onPointerDown={(e) => e.stopPropagation()}>
      {choices.map((c) => (
        <button key={c.value} type="button" aria-pressed={value.includes(c.value)} disabled={disabled} onClick={() => toggle(c.value)}>{c.label}</button>
      ))}
    </div>
  )
}

// One setting on a card: what kind it is decides how it is chosen (board.settings).
function Setting({ s, node, board, parts, level, circuit, scene, setParam, formsOf }) {
  const value = node.params[s.key] ?? ''
  const set = (v) => setParam(node.id, s.key, v)
  // A setting the level's preset fixed only shows (../../../circuit/model.js).
  const disabled = isFixed(node, s.key)
  switch (s.kind) {
    case 'form': return <FormulaField label={board.textOf(level, node.type)?.formLabel ?? T('形状', 'Shape')} value={formOf(parts.rules[node.type], node)} onChange={set} choices={shapesOf(parts.rules[node.type], board.textOf(level, node.type), formsOf(node.type)).map((o) => ({ value: o.key, label: L(o.label) }))} required disabled={disabled} />
    // A rule part's own rule, when it has several (../machine.js rulePartsOf).
    case 'use': return <RuleTicks label={s.label} value={value || [scene.choices.uses[node.type][0].value]} onChange={set} choices={scene.choices.uses[node.type]} disabled={disabled} />
    // As many regions as the frame has: never fewer than the last one holding something.
    case 'ways': {
      const regions = parts.frames(node).map((r) => r.name)
      const held = regions.filter((r) => circuit.nodes.some((n) => n.in === `${node.id}/${r}`) || circuit.wires.some((w) => (w.to === node.id && w.port === r) || w.from === `${node.id}#${r}`))
      const least = Math.max(2, ...held.map((r) => regions.indexOf(r) + 1))
      return <FormulaField label={s.label} value={String(value || 2)} onChange={set} choices={WAYS.filter((n) => n >= least).map((n) => ({ value: String(n), label: tr(`${n} 条`, `${n}`) }))} required disabled={disabled} />
    }
    case 'depth': return <FormulaField label={s.label} value={String(value)} onChange={set} choices={DEPTHS.map((d) => ({ value: String(d), label: tr(`${d} 层`, `${d} levels`) }))} blank={T('不限', 'No limit')} disabled={disabled} />
    case 'at': return <FormulaField label={s.label} value={value} onChange={set} choices={[{ value: 'hyps', label: tr('已知', 'Hypotheses') }]} blank={T('目标', 'Goal')} disabled={disabled} />
    case 'unit': return <FormulaField label={s.label} value={value} onChange={set} choices={[{ value: 'unit', label: tr('只和单项子句', 'One-literal clauses only') }]} blank={T('任意两条', 'Any two')} disabled={disabled} />
    default: return <FormulaField label={s.label} value={value} onChange={set} choices={scene.choices[s.kind ?? 'formula']} blank={s.blank} disabled={disabled} />
  }
}

// Under a card's ports: its settings, and what it gives (or why it cannot yet); a frame shows that by its regions'
// results instead, and folded, how much it holds.
function CardBody({ node, board, parts, level, circuit, view, scene, setParam, text, formsOf }) {
  const { Value } = board
  const value = view.values.get(node.id)
  const error = view.errors.get(node.id)
  const role = parts.role(node)
  const regions = new Set(parts.frames(node).map((r) => r.name))
  const outs = parts.outputs(node)?.filter((o) => !regions.has(o.key))
  const multi = outs && !(outs.length === 1 && outs[0].key === null) ? outs : null
  const held = regions.size ? within(circuit, node.id).size : 0
  const problem = error && <span className={`lg-error ${error === MISSING ? 'is-missing' : ''}`}>{error === MISSING ? tr('等接线', 'Waiting for wires') : L(error)}</span>
  return (
    <div className="lg-card">
      {role === 'sink' && scene.want}
      {board.settings(parts, node, level).map((s) => <Setting key={s.key} s={s} node={node} board={board} parts={parts} level={level} circuit={circuit} scene={scene} setParam={setParam} formsOf={formsOf} />)}
      {board.extra?.(node, setParam, { ins: Object.fromEntries(circuit.wires.filter((w) => w.to === node.id).map((w) => [w.port, view.values.get(w.from)])), text })}
      {node.fold && <span className="lg-held">{held ? tr(`框里 ${held} 步`, held === 1 ? '1 step inside' : `${held} steps inside`) : tr('框里是空的', 'Nothing inside yet')}</span>}
      {role === 'source' && (board.ioBox ? <IoBox><Value v={value} text={text} /></IoBox> : <Value v={value} text={text} bare />)}
      {role === 'sink' && board.ioBox && !problem && <IoBox><Value v={value} text={text} /></IoBox>}
      {role !== 'source' && !(role === 'sink' && board.ioBox && !problem) && (!regions.size || node.fold) && (problem || (multi ? multi.map((o) => (
        <span key={o.key} className="lg-out"><em>{L(o.short)}</em><Value v={view.values.get(srcOf(node, o.key))} text={text} /></span>
      )) : <Value v={value} text={text} />))}
    </div>
  )
}

// The board on a phone: the shared slot board, where a frame is a block with its regions' grids inside it, a sheet
// per block and the run bar.
function PhoneBoard({ board, parts, level, circuit, view, scene, result, verdictText, insideView, stepLog, stepClass, stepped, logged, began, waiting, stepKey, onClear, setParam, text, formsOf, brief, items, foldedItems, dock, change, addNode, types, descOf, scope, testTabs, regionNote, resultNote }) {
  const { Value } = board
  const [sheet, setSheet] = useState(null) // { node } or { slot, region }
  const root = useRef(null)
  const scroller = useRef(null)
  const editing = useSlotEditing({
    graph: circuit,
    onChange: change,
    parts,
    create: (_, type, at, region) => {
      const [x, y] = spotIn(circuit, region)
      return addNode(type, { slot: at, x, y, ...(region ? { in: region } : {}) })
    },
    label: parts.label,
    openNode: (id) => setSheet({ node: id }),
    openSlot: (at, region) => items.length + foldedItems.length > 0 && setSheet({ slot: at, region }),
    root,
    scroller,
    scope,
  })
  // The run window appears with the run's first step, and the page is at its bottom in the same frame (no scrolling
  // to watch); after that the window, of a fixed size, follows the steps inside itself and the page stays put.
  // A card's value showing under the board can push the window down: while the page sits at its bottom it stays
  // there, until the player scrolls away.
  const preview = useRef(null)
  const pinned = useRef(false)
  const was = useRef(false)
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    if (!began) { pinned.current = false; return }
    if (!was.current) pinned.current = true
    if (pinned.current) el.scrollTop = el.scrollHeight
  }, [began, stepKey])
  useLayoutEffect(() => { was.current = began })
  const onScroll = () => {
    const el = scroller.current
    if (began && el) pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 4
  }
  const node = sheet?.node && circuit.nodes.find((n) => n.id === sheet.node)
  // A frame shows what it gives outside; what it opens shows in its regions.
  const thumb = (n) => {
    const error = view.errors.get(n.id)
    const outs = parts.frames(n).length ? [] : outputsOf(parts, n)
    if (outs.length > 1) return <span className="lg-chips">{outs.map((o) => <span key={o.key} className="lg-out"><em>{L(o.short)}</em><Value v={view.values.get(srcOf(n, o.key))} text={text} small /></span>)}</span>
    if (error) return error === MISSING ? <i className="lg-mark">{tr('待接线', 'unwired')}</i> : <span className="lg-error">{L(error)}</span>
    if (board.ioBox && parts.role(n) === 'source') return <IoBox><Value v={view.values.get(n.id)} text={text} /></IoBox>
    return <Value v={view.values.get(n.id)} text={text} small />
  }
  const sinkBody = (n) => (
    <span className="lg-sink">
      {scene.want}
      {board.ioBox ? <IoBox><Value v={view.values.get(n.id)} text={text} /></IoBox> : <Value v={view.values.get(n.id)} text={text} small />}
    </span>
  )
  return (
    <div className="level-phone is-split lg-phone" ref={root}>
      {testTabs}
      <div className="lg-scroll" ref={scroller} onScroll={onScroll}>
        <TaskCard>{brief}</TaskCard>
        <SlotBoard dense graph={circuit} parts={parts} nameOf={editing.nameOf} thumb={thumb} sinkBody={sinkBody} sinkClass={() => (result ? (result.pass ? 'is-pass' : 'is-fail') : '')} regionNote={regionNote} resultNote={resultNote} nodeClass={stepClass} onClear={onClear} picking={editing.picking} moving={editing.moving} canLand={editing.canLand} onPort={editing.onPort} onNode={editing.onNode} onSlot={editing.onSlot} history={editing.history} onChange={change} types={types} />
        {stepped ? began && (
          <section className={`lg-preview ${insideView ? 'has-inside' : ''}`} ref={preview}>
            <h3>{tr('运行过程', 'The run')}</h3>
            {insideView}
            {logged ? stepLog : <p className="lg-mark lg-preview-empty">{waiting ? tr('这一组开始运行……', 'This test starts…') : tr('这一组还没有运行到。', 'This test has not been run yet.')}</p>}
            {verdictText && <p className={`lg-verdict ${result.pass ? 'is-pass' : 'is-fail'}`}>{verdictText}</p>}
          </section>
        ) : verdictText && <p className={`lg-verdict ${result.pass ? 'is-pass' : 'is-fail'}`}>{verdictText}</p>}
      </div>
      <Tray items={items} folded={foldedItems} onPick={editing.placeFirstFree} />
      <footer className="run-foot">{dock}</footer>
      <Notice editing={editing} />
      {node && (
        <Sheet title={editing.nameOf(node)} onClose={() => setSheet(null)}>
          <div className="lg-sheet">
            {parts.role(node) === 'part' && <p className="lg-desc">{L(descOf(node.type))}</p>}
            <CardBody node={node} board={board} parts={parts} level={level} circuit={circuit} view={view} scene={scene} text={text} setParam={setParam} formsOf={formsOf} />
            {parts.role(node) === 'part' && <PartActions onMove={() => { editing.startMove(node.id); setSheet(null) }} onRemove={node.locked ? null : () => { editing.remove(node.id); setSheet(null) }} />}
          </div>
        </Sheet>
      )}
      {sheet?.slot !== undefined && (
        <Sheet title={tr('放在这一格', 'Place in this slot')} onClose={() => setSheet(null)}>
          <div className="lg-add">
            {[...items, ...foldedItems].map((item) => (
              <button key={item.type} type="button" data-family={item.family} onClick={() => { editing.place(item.type, sheet.slot, sheet.region); setSheet(null) }}>
                <b>{L(item.label)}</b>
                <small>{L(item.desc)}</small>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  )
}

// A built part opened while a run steps through it: the board that built it, read only, each card showing what it gives
// in this run of the part, the card computing lit. On a phone it says which parts it is in above it.
function InsideView({ inside, board, parts, text, name, phone }) {
  const scene = board.scene(inside.level, inside.level.tests[0], text)
  const shared = { board, parts, level: inside.level, circuit: inside.circuit, view: inside.view, scene, setParam: () => {}, text, formsOf: () => [] }
  const where = inside.path.map((p) => p.node.id).join('/')
  return (
    <div className="lg-inside">
      {phone && <p className="lg-inside-path">{inside.path.map((p) => L(name(p.node, p.level))).join(' › ')}</p>}
      <CanvasEditor
        key={where}
        readOnly
        focus={inside.step}
        graph={inside.circuit}
        parts={parts}
        width={160}
        height={150}
        body={(node) => <CardBody node={node} {...shared} />}
        cardClass={(node) => `lg-node ${node.id === inside.step ? 'is-step' : ''}`}
        wireState={(wire) => (inside.view.values.get(wire.from) ? 'live' : 'dead')}
      />
    </div>
  )
}
