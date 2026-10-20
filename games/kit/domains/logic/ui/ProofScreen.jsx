import { useMemo, useRef, useState } from 'react'
import { ChevronRight, Trash2 } from 'lucide-react'
import { Brief, CircuitLayout, RunDock, TaskCard, TestStatus } from '../../../shell/index.js'
import Sheet from '../../../shell/Sheet.jsx'
import { L, tr } from '../../../shell/i18n.js'
import { BoardTrail, CanvasEditor, Notice, Palette, SlotBoard, Tray, boardAt, freeSpot, outputsOf, srcOf, upTo, useSlotEditing, withBoardAt } from '../../../circuit/index.js'
import { MISSING } from '../../../engine/circuit.js'
import { runLevel, withHidden } from '../../../engine/tests.js'
import { fitBoard, startProof } from '../build.js'
import { parse, replaceAtoms, show } from '../formula.js'
import { fill, say, subformulas } from '../notation.js'
import { LOGIC_TESTS, runAt, seenAt } from '../proof.js'
import { descOf, iconOf, nameOf, partsFor, settingsOf, familyOf } from './catalog.js'
import FormulaField from './FormulaField.jsx'

// A proof level (《证明完毕》) on the shared circuit editor: the premises on the left, the goal on the right, rules as
// parts. A box's board opens in place of the board around it, with a trail back out; its fixed cards are what it
// reads from outside (proof.js seenAt). Every card shows what it proves right now; whether the proof is done is
// checked by the run bar, which completes the level. The level is a schema with test cases (course.js): the tests
// above the strip switch the sentences everywhere, the cards' choices included, and checking runs every case, the
// hidden ones too.

const premiseNames = (level) => Object.keys(level.schema.premises ?? {}).sort().join()
const names = (circuit) => circuit.nodes.filter((n) => n.type === 'premise').map((n) => n.params.name).sort().join()

export default function ProofScreen({ game, level: entry, saved, save, solved, solve, flags, progress, phone }) {
  const level = entry.source
  const parts = useMemo(() => partsFor(level.lemmas, Object.keys(level.schema.premises ?? {})), [level])
  const lemmas = level.lemmas
  // A saved proof whose premises no longer match the level, or with a part the game no longer has, starts fresh.
  const [circuit, setCircuit] = useState(() => (saved?.nodes && names(saved) === premiseNames(level) && saved.nodes.every((n) => parts.rules[n.type]) ? saved : startProof(level)))
  const [path, setPath] = useState([])
  // After the proof was checked: { pass, results: [{ pass, reason }] } on every test, hidden ones last; a change clears it.
  const [verdict, setVerdict] = useState(null)
  const [testIndex, setTestIndex] = useState(0)
  // Hidden tests are checked every time but shown only once the level is solved.
  const tests = solved ? withHidden(level).tests : level.tests
  const test = tests[Math.min(testIndex, tests.length - 1)]
  const hiddenCount = solved ? 0 : level.hidden?.length ?? 0
  // What the player has here: what this level shows, and what it folds away (../../../course.js offer).
  const { shown: palette, folded } = useMemo(() => game.logic.offerIn(level, flags), [game, level, flags])
  const seen = path.length ? seenAt(level, circuit, path) : null
  const board = path.length ? fitBoard(boardAt(circuit, path), seen) : circuit
  const view = useMemo(() => runAt(level, circuit, path, test), [level, circuit, path, test])
  const scope = `${level.id}:${path.map((p) => `${p.node}/${p.board}`).join('>')}`

  const change = (next, { keep } = {}) => {
    const whole = path.length ? withBoardAt(circuit, path, next) : next
    setCircuit(whole)
    save(whole)
    if (!keep) setVerdict(null)
  }
  const reset = () => {
    setPath([])
    change(startProof(level))
  }
  const open = (id, name) => setPath([...path, { node: id, board: name }])
  const check = () => {
    const run = runLevel(LOGIC_TESTS, withHidden(level), circuit)
    setVerdict({ pass: run.pass, results: run.results.map((r) => ({ pass: r.pass, reason: r.checks[0].reason })) })
    if (run.pass) solve(run.score)
    else setTestIndex(Math.max(0, Math.min(level.tests.length - 1, run.results.findIndex((r) => !r.pass))))
    return run.pass
  }
  const addNode = (type, extra = {}) => {
    const taken = new Set(board.nodes.map((n) => n.id))
    let k = board.nodes.length
    while (taken.has(`${type}-${k}`)) k += 1
    const id = `${type}-${k}`
    return { id, graph: { ...board, nodes: [...board.nodes, { id, type, params: {}, ...extra }] } }
  }
  const setParam = (id, key, value) => change({ ...board, nodes: board.nodes.map((n) => (n.id === id ? { ...n, params: { ...n.params, [key]: value } } : n)) })

  const consts = level.consts ?? []
  const goal = parse(test.goal, { consts })
  const given = Object.fromEntries(Object.entries(test.premises ?? {}).map(([name, t]) => [name, parse(t, { consts })]))
  const premises = Object.values(given)
  // Formulas in everyday sentences (notation.js). A card holds the schema's letters and shows them as this test's
  // sentences, so its choices are the schema's own sentences, renamed whenever the test changes.
  const text = (f) => L(say(f, level.notation))
  const schema = [...Object.values(level.schema.premises ?? {}), level.schema.goal].map((t) => parse(t, { consts }))
  const choices = subformulas(schema).map((f) => ({ value: show(f), label: text(replaceAtoms(f, test.subst)) }))
  // The level's words, with {A} for a letter's sentence, {p} for a premise and {goal} filled in from this test.
  const filled = (t) => fill(t, { ...test.subst, ...given, goal }, level.notation)
  const result = verdict?.results[tests.indexOf(test)]
  const states = tests.map((_, k) => (verdict ? (verdict.results[k].pass ? 'pass' : 'fail') : null))
  const hiddenFailed = verdict && hiddenCount ? verdict.results.slice(level.tests.length).filter((r) => !r.pass).length : 0
  const best = progress.best?.[level.id]
  const brief = (
    <Brief game={game} level={entry} text={filled(level.brief)} hint={(level.hint ?? []).map(filled)} phone={phone}>
      <section className="lg-score">
        <div className="stat-row">
          <div className="stat"><b>{LOGIC_TESTS.score(level, circuit).steps}</b><span>{tr('步数', 'Steps')}</span></div>
          {best && <div className="stat"><b>{best.steps}</b><span>{tr('最少', 'Best')}</span></div>}
        </div>
      </section>
    </Brief>
  )
  const itemOf = (type) => ({ type, label: nameOf(lemmas, type), desc: descOf(lemmas, type), icon: iconOf(lemmas, type), family: familyOf(lemmas, type), fresh: entry.fresh?.includes(type) })
  const items = palette.map(itemOf)
  const foldedItems = folded.map(itemOf)
  const trailOf = (
    <BoardTrail circuit={circuit} path={path} labelOf={(n) => L(parts.label(n))} boardsOf={(n) => parts.boards(n)} onGo={(depth) => setPath(upTo(path, depth))} />
  )
  // Inside a box, what it opens and where its result goes.
  const boxNote = path.length > 0 && (
    <p className="lg-box-note">
      {view.scopeError ? L(view.scopeError) : view.bind.assume ? tr(`框里假设「${text(view.bind.assume.formula)}」。证出的东西接到「结论」。`, `This box assumes “${text(view.bind.assume.formula)}”. Wire what you prove to “Conclusion”.`) : tr('证出的东西接到「结论」。', 'Wire what you prove to “Conclusion”.')}
    </p>
  )
  const run = verdict ? { pass: verdict.pass } : null
  const dock = (
    <RunDock
      secondary={circuit.nodes.some((n) => parts.role(n) === 'part') ? { label: tr('清空', 'Clear'), icon: <Trash2 size={16} />, onClick: reset } : null}
      go={{ label: run?.pass ? tr('证明完毕', 'Q.E.D.') : tr('检查证明', 'Check proof'), pass: Boolean(run?.pass), onClick: check }}
    />
  )
  const shared = { parts, lemmas, board, view, goal, result, open, setParam, text, choices }

  if (phone) return <PhoneProof {...shared} testChips={<TestChips tests={tests} states={states} current={test} onPick={setTestIndex} />} brief={brief} items={items} foldedItems={foldedItems} trail={trailOf} boxNote={boxNote} dock={dock} change={change} addNode={addNode} reset={reset} scope={scope} />

  return (
    <CircuitLayout
      className="lg-level"
      brief={brief}
      parts={items.length + foldedItems.length > 0 && <Palette compact items={items} folded={foldedItems} onAdd={(type) => { const [x, y] = freeSpot(board, { w: 170, h: 150, x0: 240, dx: 200 }); change(addNode(type, { x, y }).graph) }} />}
      canvas={
        <div className="lg-stage">
          {path.length > 0 && <div className="lg-trail">{trailOf}{boxNote}</div>}
          <div className="lg-board">
            <CanvasEditor
              key={scope}
              scope={scope}
              graph={board}
              onChange={change}
              parts={parts}
              width={160}
              height={150}
              body={(node) => <CardBody node={node} {...shared} />}
              head={(node) => node.type === 'goal' && result && <em className="node-verdict">{result.pass ? tr('证到了', 'Proved') : tr('还没有', 'Not yet')}</em>}
              cardClass={(node) => `lg-node ${node.type === 'goal' && result ? (result.pass ? 'is-pass' : 'is-fail') : ''}`}
              wireState={(wire) => (view.values.get(wire.from) ? 'live' : 'dead')}
              emptyNote={path.length === 0 && items.length > 0 && { zh: '从上面一排元件里选一条规则放上来，再从卡片右侧的圆点连到另一张卡片左侧的圆点。', en: 'Pick a rule from the row above, then wire a dot on the right of a card to a dot on the left of another.' }}
            />
          </div>
        </div>
      }
      tests={<TestChips tests={tests} states={states} current={test} onPick={setTestIndex} />}
      status={<TestStatus states={states} hidden={{ count: hiddenCount, failed: hiddenFailed, note: HIDDEN_NOTE(hiddenCount) }} />}
      outputsTitle={tr('这组测试', 'This test')}
      outputs={
        <div className="lg-strip">
          <p className="lg-sequent">{premises.length > 0 && <>{tr('已知', 'Given')} <b>{premises.map(text).join(tr('；', '; '))}</b> · </>}{tr('要证', 'prove')} <b>{text(goal)}</b></p>
          <p className={`lg-verdict ${result ? (result.pass ? 'is-pass' : 'is-fail') : ''}`}>{result ? (result.pass ? tr('目标证出来了，没有留下开着的假设。', 'The goal is proved, with no hypothesis left open.') : L(result.reason)) : tr('检查时每组测试都要过：目标收到的是不是要证的那句，还有没有没关上的假设。', 'Checking runs every test: does the goal receive the sentence to prove, and is any hypothesis left open?')}</p>
        </div>
      }
      actions={<footer className="run-foot">{dock}</footer>}
    />
  )
}

const HIDDEN_NOTE = (count) => ({ zh: `另有 ${count} 组隐藏测试，检查时一起检查，通关后公开。`, en: `${count} more hidden tests are checked with every check and shown once you pass.` })

/** The test cases as chips: each its sentences, marked once checked; picking one shows the proof on its sentences. */
function TestChips({ tests, states, current, onPick }) {
  return (
    <span className="lg-tests">
      {tests.map((t, k) => (
        <button key={k} type="button" className={`lg-test ${t === current ? 'is-on' : ''} ${states[k] ? `is-${states[k]}` : ''}`} aria-pressed={t === current} onClick={() => onPick(k)}>
          <i aria-hidden="true" />
          {L(t.label)}
          {t.hidden && <em>{tr('隐藏', 'hidden')}</em>}
        </button>
      ))}
    </span>
  )
}

/** A judgment: the formula proved, and the hypotheses it still rests on, written by `text`. */
function Formula({ j, text, small = false, bare = false }) {
  if (!j) return null
  const hyps = [...j.hyps.values()]
  return (
    <span className={`lg-formula ${small ? 'is-small' : ''}`}>
      <b>{text(j.formula)}</b>
      {!small && !bare && hyps.length > 0 && <small>{tr('依赖', 'from')} {hyps.map(text).join(tr('；', '; '))}</small>}
    </span>
  )
}

// Under a card's ports: its settings, the boards it opens, and what it proves (or why it cannot yet).
function CardBody({ node, parts, view, goal, open, setParam, text, choices }) {
  const value = view.values.get(node.id)
  const error = view.errors.get(node.id)
  const role = parts.role(node)
  const boxes = parts.boards(node)
  const multi = parts.outputs(node)
  const problem = error && <span className={`lg-error ${error === MISSING ? 'is-missing' : ''}`}>{error === MISSING ? tr('等接线', 'Waiting for wires') : L(error)}</span>
  return (
    <div className="lg-card">
      {node.type === 'goal' && <span className="lg-want">{tr('要证', 'Prove')} <b>{text(goal)}</b></span>}
      {settingsOf(parts.rules, node.type).map((s) => <FormulaField key={s.key} label={s.label} value={node.params[s.key] ?? ''} onChange={(v) => setParam(node.id, s.key, v)} choices={choices} />)}
      {node.type === 'orI' && (
        <div className="lg-side" role="group" aria-label={tr('另一边放在', 'Other side goes')} onPointerDown={(e) => e.stopPropagation()}>
          <span>{tr('另一边放', 'Other side')}</span>
          {[['left', tr('左', 'left')], ['right', tr('右', 'right')]].map(([side, label]) => (
            <button key={side} type="button" aria-pressed={(node.params.side ?? 'right') === side} onClick={() => setParam(node.id, 'side', side)}>{label}</button>
          ))}
        </div>
      )}
      {boxes.map((b) => {
        const inner = node.boards?.[b.name]?.nodes.filter((n) => parts.role(n) === 'part').length ?? 0
        return (
          <button key={b.name} type="button" className="lg-open" onPointerDown={(e) => e.stopPropagation()} onClick={() => open(node.id, b.name)}>
            <span>{boxes.length > 1 ? b.label : tr('打开框', 'Open box')}</span>
            <small>{inner ? tr(`${inner} 步`, `${inner} steps`) : tr('空', 'empty')}</small>
            <ChevronRight size={14} />
          </button>
        )
      })}
      {role === 'source' && <Formula j={value} text={text} bare />}
      {role !== 'source' && (problem || (multi ? multi.map((o) => (
        <span key={o.key} className="lg-out"><em>{L(o.short)}</em><Formula j={view.values.get(srcOf(node, o.key))} text={text} /></span>
      )) : <Formula j={value} text={text} />))}
    </div>
  )
}

// The proof on a phone: the shared slot board, with the trail over it, a sheet per block and the run bar.
function PhoneProof({ parts, lemmas, board, view, goal, result, open, setParam, text, choices, brief, items, foldedItems, trail, boxNote, dock, change, addNode, reset, scope, testChips }) {
  const [sheet, setSheet] = useState(null) // { node } or { slot }
  const root = useRef(null)
  const scroller = useRef(null)
  const editing = useSlotEditing({
    graph: board,
    onChange: change,
    parts,
    create: (_, type, at) => addNode(type, { slot: at }),
    label: parts.label,
    openNode: (id) => setSheet({ node: id }),
    openSlot: (at) => items.length + foldedItems.length > 0 && setSheet({ slot: at }),
    reset,
    root,
    scroller,
    scope,
  })
  const node = sheet?.node && board.nodes.find((n) => n.id === sheet.node)
  const thumb = (n) => {
    const error = view.errors.get(n.id)
    const outs = outputsOf(parts, n)
    if (outs.length > 1) return <span className="lg-chips">{outs.map((o) => <Formula key={o.key} j={view.values.get(srcOf(n, o.key))} text={text} small />)}</span>
    if (error) return error === MISSING ? <i className="lg-mark">{tr('待接线', 'unwired')}</i> : <span className="lg-error">{L(error)}</span>
    return <Formula j={view.values.get(n.id)} text={text} small />
  }
  const sinkBody = (n) => (
    <span className="lg-sink">
      {n.type === 'goal' && <span className="lg-want">{tr('要证', 'Prove')} <b>{text(goal)}</b></span>}
      <Formula j={view.values.get(n.id)} text={text} small />
    </span>
  )
  return (
    <div className="level-phone is-split lg-phone" ref={root}>
      <nav className="lg-tests is-phone" aria-label={tr('测试', 'Tests')}>{testChips}</nav>
      <div className="lg-scroll" ref={scroller}>
        <TaskCard>{brief}</TaskCard>
        {trail}
        {boxNote}
        <SlotBoard dense graph={board} parts={parts} nameOf={editing.nameOf} thumb={thumb} sinkBody={sinkBody} sinkClass={(n) => (n.type === 'goal' && result ? (result.pass ? 'is-pass' : 'is-fail') : '')} tileExtra={(n) => parts.boards(n).length > 0 && tr('点开选假设、进框', 'tap to set it and go in')} picking={editing.picking} canLand={editing.canLand} onPort={editing.onPort} onNode={editing.onNode} onSlot={editing.onSlot} history={editing.history} />
        {result && <p className={`lg-verdict ${result.pass ? 'is-pass' : 'is-fail'}`}>{result.pass ? tr('目标证出来了，没有留下开着的假设。', 'The goal is proved, with no hypothesis left open.') : L(result.reason)}</p>}
      </div>
      <Tray items={items} folded={foldedItems} onPick={editing.placeFirstFree} />
      <footer className="run-foot">{dock}</footer>
      <Notice editing={editing} />
      {node && (
        <Sheet title={editing.nameOf(node)} onClose={() => setSheet(null)}>
          <div className="lg-sheet">
            {parts.role(node) === 'part' && <p className="lg-desc">{L(descOf(lemmas, node.type))}</p>}
            <CardBody node={node} parts={parts} view={view} goal={goal} text={text} choices={choices} open={(id, name) => { setSheet(null); open(id, name) }} setParam={setParam} />
            {parts.role(node) === 'part' && <button type="button" className="lg-remove" onClick={() => { editing.remove(node.id); setSheet(null) }}><Trash2 size={15} />{tr('拿掉这一块', 'Remove this block')}</button>}
          </div>
        </Sheet>
      )}
      {sheet?.slot !== undefined && (
        <Sheet title={tr(`放进第 ${sheet.slot + 1} 格`, `Place in slot ${sheet.slot + 1}`)} onClose={() => setSheet(null)}>
          <div className="lg-add">
            {[...items, ...foldedItems].map((item) => (
              <button key={item.type} type="button" data-family={item.family} onClick={() => { editing.place(item.type, sheet.slot); setSheet(null) }}>
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
