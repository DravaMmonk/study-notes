import { useMemo, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Brief, CircuitLayout, RunDock, TaskCard, TestStatus, TestTabs } from '../../../shell/index.js'
import Sheet from '../../../shell/Sheet.jsx'
import { L, tr } from '../../../shell/i18n.js'
import { CanvasEditor, Notice, Palette, SlotBoard, Tray, freeSpot, moveInto, outputsOf, srcOf, useSlotEditing, within } from '../../../circuit/index.js'
import { MISSING } from '../../../engine/circuit.js'
import { runLevel, withHidden } from '../../../engine/tests.js'
import { startProof } from '../build.js'
import { parse, replaceAtoms, show } from '../formula.js'
import { say, subformulas } from '../notation.js'
import { LOGIC_TESTS } from '../proof.js'
import { descOf, iconOf, nameOf, partsFor, settingsOf, familyOf } from './catalog.js'
import FormulaField from './FormulaField.jsx'

// A proof level (《证明完毕》) on the shared circuit editor: the premises on the left, the goal on the right, rules as
// parts. A box is a frame on the same board (../../../circuit/frames.js): its regions hold the cards that work under
// its assumption, which each region shows at its left edge. Every card shows what it proves right now; whether the proof is done is
// checked by the run bar, which completes the level. The level is a schema with test cases (course.js): the tests
// above the strip switch the sentences everywhere, the cards' choices included, and checking runs every case, the
// hidden ones too.

const premiseNames = (level) => Object.keys(level.schema.premises ?? {}).sort().join()
const names = (circuit) => circuit.nodes.filter((n) => n.type === 'premise').map((n) => n.params.name).sort().join()
// A saved proof still fits the game: every card a part it has, every wire into a port its card has, every card in a
// region of a box that is there.
const fits = (circuit, parts) => {
  const byId = new Map(circuit.nodes.map((n) => [n.id, n]))
  const region = (key) => { const [id, name] = key.split('/'); return byId.has(id) && parts.frames(byId.get(id)).some((r) => r.name === name) }
  return circuit.nodes.every((n) => parts.rules[n.type] && (!n.in || region(n.in)))
    && circuit.wires.every((w) => byId.has(w.to) && parts.inputs(byId.get(w.to)).includes(w.port))
}
// Where a new card goes: free room on the board, or in a box's region from its corner.
const spotIn = (circuit, region) => (region
  ? freeSpot({ nodes: circuit.nodes.filter((n) => n.in === region) }, { w: 170, h: 150, x0: 44, y0: 20, dx: 190, cols: 2 })
  : freeSpot({ nodes: circuit.nodes.filter((n) => !n.in) }, { w: 170, h: 150, x0: 240, dx: 200 }))

export default function ProofScreen({ game, level: entry, saved, save, solved, solve, flags, progress, phone }) {
  const level = entry.source
  const parts = useMemo(() => partsFor(level.lemmas, Object.keys(level.schema.premises ?? {})), [level])
  const lemmas = level.lemmas
  // A saved proof whose premises no longer match the level, or that no longer fits the game, starts fresh.
  const [circuit, setCircuit] = useState(() => (saved?.nodes && names(saved) === premiseNames(level) && fits(saved, parts) ? saved : startProof(level)))
  // The box region a new card goes into, or null for the board itself (CanvasEditor onTarget).
  const [target, setTarget] = useState(null)
  // After the proof was checked: { pass, results: [{ pass, reason }] } on every test, hidden ones last; a change clears it.
  const [verdict, setVerdict] = useState(null)
  const [testIndex, setTestIndex] = useState(0)
  // Hidden tests are checked every time but shown only once the level is solved.
  const tests = solved ? withHidden(level).tests : level.tests
  const test = tests[Math.min(testIndex, tests.length - 1)]
  const hiddenCount = solved ? 0 : level.hidden?.length ?? 0
  // What the player has here: what this level shows, and what it folds away (../../../course.js offer).
  const { shown: palette, folded } = useMemo(() => game.logic.offerIn(level, flags), [game, level, flags])
  const view = useMemo(() => LOGIC_TESTS.runTest(level, circuit, test), [level, circuit, test])

  const change = (next, { keep } = {}) => {
    setCircuit(next)
    save(next)
    if (!keep) setVerdict(null)
  }
  const reset = () => change(startProof(level))
  const check = () => {
    const run = runLevel(LOGIC_TESTS, withHidden(level), circuit)
    setVerdict({ pass: run.pass, results: run.results.map((r) => ({ pass: r.pass, reason: r.checks[0].reason })) })
    if (run.pass) solve(run.score)
    else setTestIndex(Math.max(0, Math.min(level.tests.length - 1, run.results.findIndex((r) => !r.pass))))
    return run.pass
  }
  const addNode = (type, extra = {}) => {
    const taken = new Set(circuit.nodes.map((n) => n.id))
    let k = circuit.nodes.length
    while (taken.has(`${type}-${k}`)) k += 1
    const id = `${type}-${k}`
    return { id, graph: { ...circuit, nodes: [...circuit.nodes, { id, type, params: {}, ...extra }] } }
  }
  // A new card goes into the region chosen last, while its box is there and open.
  const into = target && circuit.nodes.some((n) => n.id === target.split('/')[0] && !n.fold) ? target : null
  const add = (type) => {
    const [x, y] = spotIn(circuit, into)
    change(addNode(type, { x, y, ...(into ? { in: into } : {}) }).graph)
  }
  const setParam = (id, key, value) => change({ ...circuit, nodes: circuit.nodes.map((n) => (n.id === id ? { ...n, params: { ...n.params, [key]: value } } : n)) })

  const consts = level.consts ?? []
  const goal = parse(test.goal, { consts })
  const premises = Object.values(test.premises ?? {}).map((t) => parse(t, { consts }))
  // Formulas in everyday sentences (notation.js). A card holds the schema's letters and shows them as this test's
  // sentences, so its choices are the schema's own sentences, renamed whenever the test changes.
  const text = (f) => L(say(f, level.notation))
  const schema = [...Object.values(level.schema.premises ?? {}), level.schema.goal].map((t) => parse(t, { consts }))
  const choices = subformulas(schema).map((f) => ({ value: show(f), label: text(replaceAtoms(f, test.subst)) }))
  const result = verdict?.results[tests.indexOf(test)]
  const states = tests.map((_, k) => (verdict ? (verdict.results[k].pass ? 'pass' : 'fail') : null))
  const hiddenFailed = verdict && hiddenCount ? verdict.results.slice(level.tests.length).filter((r) => !r.pass).length : 0
  const best = progress.best?.[level.id]
  const brief = (
    <Brief game={game} level={entry} hint={level.hint} phone={phone}>
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
  // At a region's left edge, the assumption it makes (or why it cannot make one yet).
  const regionNote = (node, region) => {
    const j = view.values.get(srcOf(node, region))
    return j ? <Formula j={j} text={text} small /> : <i className="lg-mark">{tr('还没有假设', 'nothing assumed yet')}</i>
  }
  const run = verdict ? { pass: verdict.pass } : null
  const dock = (
    <RunDock
      secondary={circuit.nodes.some((n) => parts.role(n) === 'part') ? { label: tr('清空', 'Clear'), icon: <Trash2 size={16} />, onClick: reset } : null}
      go={{ label: run?.pass ? tr('证明完毕', 'Q.E.D.') : tr('检查证明', 'Check proof'), pass: Boolean(run?.pass), onClick: check }}
    />
  )
  const shared = { parts, lemmas, circuit, view, goal, result, setParam, text, choices }

  if (phone) return <PhoneProof {...shared} testTabs={<TestTabs phone tests={tests} states={states} index={tests.indexOf(test)} onSelect={setTestIndex} />} brief={brief} items={items} foldedItems={foldedItems} dock={dock} change={change} addNode={addNode} reset={reset} scope={level.id} />

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
              head={(node) => node.type === 'goal' && result && <em className="node-verdict">{result.pass ? tr('证到了', 'Proved') : tr('还没有', 'Not yet')}</em>}
              cardClass={(node) => `lg-node ${node.type === 'goal' && result ? (result.pass ? 'is-pass' : 'is-fail') : ''}`}
              wireState={(wire) => (view.values.get(wire.from) ? 'live' : 'dead')}
              regionNote={regionNote}
              onTarget={setTarget}
              emptyNote={items.length > 0 && { zh: '从上面一排元件里选一条规则放上来，再从卡片右侧的圆点连到另一张卡片左侧的圆点。', en: 'Pick a rule from the row above, then wire a dot on the right of a card to a dot on the left of another.' }}
            />
          </div>
        </div>
      }
      tests={<TestTabs tests={tests} states={states} index={tests.indexOf(test)} onSelect={setTestIndex} />}
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

// Under a card's ports: its settings, and what it proves (or why it cannot yet); a folded box, how much it holds.
function CardBody({ node, parts, circuit, view, goal, setParam, text, choices }) {
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
      {node.fold && <span className="lg-held">{held ? tr(`框里 ${held} 步`, held === 1 ? '1 step inside' : `${held} steps inside`) : tr('框里是空的', 'Nothing inside yet')}</span>}
      {role === 'source' && <Formula j={value} text={text} bare />}
      {role !== 'source' && (problem || (multi ? multi.map((o) => (
        <span key={o.key} className="lg-out"><em>{L(o.short)}</em><Formula j={view.values.get(srcOf(node, o.key))} text={text} /></span>
      )) : <Formula j={value} text={text} />))}
    </div>
  )
}

// The proof on a phone: the shared slot board, a sheet per block and the run bar. A block in a box says so, and its
// sheet moves it into a box's region or back onto the board.
function PhoneProof({ parts, lemmas, circuit, view, goal, result, setParam, text, choices, brief, items, foldedItems, dock, change, addNode, reset, scope, testTabs }) {
  const [sheet, setSheet] = useState(null) // { node } or { slot }
  const root = useRef(null)
  const scroller = useRef(null)
  const editing = useSlotEditing({
    graph: circuit,
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
  const node = sheet?.node && circuit.nodes.find((n) => n.id === sheet.node)
  // Every region on the board, named by its box and itself.
  const regionName = (key) => {
    const [id, name] = key.split('/')
    const box = circuit.nodes.find((n) => n.id === id)
    const r = parts.frames(box).find((x) => x.name === name)
    return parts.frames(box).length > 1 ? `${editing.nameOf(box)} · ${L(r.label)}` : editing.nameOf(box)
  }
  const regions = circuit.nodes.flatMap((n) => parts.frames(n).map((r) => `${n.id}/${r.name}`))
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
  const moveTo = (region) => {
    const [x, y] = spotIn(circuit, region)
    change(moveInto(circuit, parts, node.id, region, x, y))
  }
  return (
    <div className="level-phone is-split lg-phone" ref={root}>
      {testTabs}
      <div className="lg-scroll" ref={scroller}>
        <TaskCard>{brief}</TaskCard>
        <SlotBoard dense graph={circuit} parts={parts} nameOf={editing.nameOf} thumb={thumb} sinkBody={sinkBody} sinkClass={(n) => (n.type === 'goal' && result ? (result.pass ? 'is-pass' : 'is-fail') : '')} tileExtra={(n) => n.in && tr(`在「${regionName(n.in)}」里`, `in “${regionName(n.in)}”`)} picking={editing.picking} canLand={editing.canLand} onPort={editing.onPort} onNode={editing.onNode} onSlot={editing.onSlot} history={editing.history} />
        {result && <p className={`lg-verdict ${result.pass ? 'is-pass' : 'is-fail'}`}>{result.pass ? tr('目标证出来了，没有留下开着的假设。', 'The goal is proved, with no hypothesis left open.') : L(result.reason)}</p>}
      </div>
      <Tray items={items} folded={foldedItems} onPick={editing.placeFirstFree} />
      <footer className="run-foot">{dock}</footer>
      <Notice editing={editing} />
      {node && (
        <Sheet title={editing.nameOf(node)} onClose={() => setSheet(null)}>
          <div className="lg-sheet">
            {parts.role(node) === 'part' && <p className="lg-desc">{L(descOf(lemmas, node.type))}</p>}
            <CardBody node={node} parts={parts} circuit={circuit} view={view} goal={goal} text={text} choices={choices} setParam={setParam} />
            {parts.role(node) === 'part' && regions.length > 0 && (
              <div className="lg-place" role="group" aria-label={tr('放在哪里', 'Where it sits')}>
                <span>{tr('放在', 'Sits')}</span>
                {[null, ...regions.filter((r) => { const id = r.split('/')[0]; return id !== node.id && !within(circuit, node.id).has(id) })].map((r) => (
                  <button key={r ?? ''} type="button" aria-pressed={(node.in ?? null) === r} onClick={() => moveTo(r)}>{r ? regionName(r) : tr('整块板', 'The board')}</button>
                ))}
              </div>
            )}
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
