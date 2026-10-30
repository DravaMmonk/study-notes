import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { CircleDashed, CircleDot, FileSignature, SquareDashedText } from 'lucide-react'
import { Brief, CircuitLayout, RunDock, TaskCard, TestStatus, TestTabs, useBoardCases, usePlayback } from '../../../shell/index.js'
import Sheet from '../../../shell/Sheet.jsx'
import { L, tr } from '../../../shell/i18n.js'
import { CanvasEditor, Notice, Palette, PartActions, SlotBoard, Tray, freeSpot, useSlotEditing } from '../../../circuit/index.js'
import FormulaField from './FormulaField.jsx'
import { say } from '../notation.js'
import { DECL, ISO_PARTS, checkIso, derives, declInputs, declaredRules, hypCard, runIso, sentenceOf, settle, startIso, thingCard, typeOf, wayOf, wayRule, wayText, waysIn } from '../iso.js'
import { constructorsOf, datatypeRules } from '../datatype.js'
import { atom, fn, tvar } from '../formula.js'
import { ruleText } from '../schematic.js'
import Entries from '../../../shell/Entries.jsx'
import { PROOF } from './boards.jsx'
import FaultScreen from './IsoFaultScreen.jsx'
import CaseTable from './IsoCases.jsx'

// A connective declared by its ways to make it (iso.js) on the shared circuit editor: assumption cards from the tray,
// each picking the sentence it assumes, chained to write each way as a rule, and the connective's card, the board's
// output, whose inputs grow as ways are wired. Each test is a test case (检验条例), one row of the table under the board
// (ui/IsoCases.jsx): what is given, the goal, and whether it is derivable. Running goes down the rows
// (../../../shell/usePlayback.jsx) and stops on the first one that is wrong.

const T = (zh, en) => ({ zh, en })
// Ways are numbered 1 2 3, apart from the board's own part numbers (①②…); on a card a way is "1.".
export const WAY = ['1', '2', '3']

/** The editor's description of the board (../../circuit/model.js), with the level's words for its sentences. */
export function isoPartsFor(level, words) {
  return {
    inputs: (node) => (node.type === 'hyp' || node.type === 'thing' ? ['before'] : node.type === DECL ? declInputs(node) : []),
    role: (node) => (node.type === DECL ? 'sink' : 'part'),
    label: (node) => (node.type === 'hyp' ? T('假设', 'Assume') : node.type === 'none' ? NONE.label : node.type === 'thing' ? THING.label
      : T(`「${level.declare.zh}」`, `“${level.declare.en}”`)),
    portLabel: (node, port) => (node.type === DECL ? T(`引入规则 ${WAY[Number(port.slice(1)) - 1]}`, `Intro rule ${WAY[Number(port.slice(1)) - 1]}`) : node.type === 'hyp' || node.type === 'thing' ? T('先假设', 'Assumed first') : ''),
    family: (node) => (node.type === DECL ? 'lemma' : 'box'),
    icon: (node) => (node.type === 'hyp' ? SquareDashedText : node.type === 'none' ? CircleDashed : node.type === 'thing' ? CircleDot : FileSignature),
    cardWidth: () => 220,
    rules: ISO_PARTS,
  }
}

const fits = (circuit) => circuit.nodes.some((n) => n.id === DECL) && !circuit.nodes.some((n) => (n.type === 'hyp' && n.locked) || n.type === 'case') && circuit.wires.every((w) => !w.to.startsWith('hyp-') || w.port === 'before')
const HYP_DESC = T('假设一句话。另一个假设接入它的「先假设」口时，先作那个假设，再作这个假设；它接入连接词的引入规则口时，这一串假设构成一条引入规则。', 'Assumes a sentence. An assumption wired into its “assumed first” port is made before it; wired into one of the connective’s intro-rule ports, the chain forms an intro rule.')
const HYP = { type: 'hyp', label: T('假设', 'Assume'), desc: HYP_DESC, icon: SquareDashedText, family: 'box' }
const NONE = { type: 'none', label: T('不用假设', 'Assume nothing'), desc: T('不作任何假设。接入连接词的引入规则口时，这条引入规则不需要任何前提。', 'Assumes nothing. Wired into one of the connective’s intro-rule ports, that intro rule needs no premises.'), icon: CircleDashed, family: 'box' }
const THING = { type: 'thing', label: T('任取一样东西', 'Any thing'), desc: T('任取一样东西并为它命名。接在它后面的假设可以提到这个名字，这样的引入规则对任何东西都成立。', 'Takes an arbitrary thing and names it. Assumptions after it may mention the name, so the intro rule holds for every thing.'), icon: CircleDot, family: 'box' }
const TRAY = { hyp: HYP, none: NONE, thing: THING }
// Where a new card goes: the first free spot left of the declared card (the board's output), column by column
// leftward, so what is wired into it reads left to right.
const spotLeft = (circuit) => {
  const decl = circuit.nodes.find((n) => n.id === DECL)
  return freeSpot({ nodes: circuit.nodes.filter((n) => !n.in) }, { w: 240, h: 150, x0: (decl?.x ?? 320) - 260, dx: -260, cols: 3, y0: decl?.y ?? 40 })
}

/**
 * A declaration to write; or, by the shared play of checking or correcting by the diagram (`play`,
 * ../../../shell/useBoardCases.js), someone's wrong ones to find the fault in by writing the situations ('audit'), or
 * to correct ('repair').
 */
export default function IsoScreen(props) {
  const play = props.level.source.play
  return play === 'audit' ? <FaultScreen {...props} /> : play === 'repair' ? <RepairScreen {...props} /> : <DeclareScreen {...props} />
}

// Correcting someone's declarations: each test case is one of their boards, the player's to change; a board passes
// when every situation is right on it.
function RepairScreen(props) {
  const level = props.level.source
  const words = (sentence) => say(sentenceOf(level, sentence), level.notation)
  const cases = useBoardCases({
    level,
    saved: props.saved,
    save: props.save,
    judge: (k, board) => {
      const checked = checkIso(level, board, words)
      return checked.pass ? '' : L(checked.ways ?? checked.results.find((r) => !r.pass).reason)
    },
    onSolve: () => props.solve({ steps: cases.boards.reduce((n, b) => n + (b.nodes.find((x) => x.id === DECL)?.params.ways ?? 0), 0) }),
    lastRun: props.lastRun,
    keepRun: props.keepRun,
  })
  return <DeclareScreen {...props} cases={cases} />
}

function DeclareScreen({ game, level: entry, saved, save, solve, lastRun, keepRun, phone, cases = null }) {
  const level = entry.source
  // The board it opens on: the declared card alone, or, correcting, the case on view as it was given.
  const begin = () => (cases ? level.boards[cases.at].board : startIso())
  const words = (sentence) => say(sentenceOf(level, sentence), level.notation)
  const parts = useMemo(() => isoPartsFor(level, words), [level])
  const [own, setOwn] = useState(() => (saved?.nodes && fits(saved) ? settle(saved) : startIso()))
  const circuit = cases ? cases.board : own
  const [testIndex, setTestIndex] = useState(0)
  const test = level.tests[Math.min(testIndex, level.tests.length - 1)]
  // The case picked, on the board: the values of its cards, and whether its goal is derived (and by which intro rule).
  const view = useMemo(() => ({ ...runIso(level, circuit, test), ...derives(level, circuit, test) }), [level, circuit, test])

  // Every change goes through the kernel's bookkeeping: ways renumbered (iso.js settle).
  const change = (next) => {
    const settled = settle(next)
    if (cases) return cases.setBoard(settled)
    setOwn(settled)
    save(settled)
  }
  // A card from the tray; an assumption assumes, to begin with, the first sentence no card on the board assumes yet.
  const addPart = (type, at) => {
    const taken = new Set(circuit.nodes.map((n) => n.id))
    let k = 1
    while (taken.has(`${type}-${k}`)) k += 1
    const id = `${type}-${k}`
    const used = new Set(circuit.nodes.filter((n) => n.type === 'hyp').map((n) => n.params.name))
    const node = type === 'hyp' ? hypCard(id, level.sentences.find((l) => !used.has(l)) ?? level.sentences[0], at) : type === 'thing' ? thingCard(id, level.binder ?? 'x', at) : { id, type, params: {}, ...at }
    return { id, graph: { ...circuit, nodes: [...circuit.nodes, node] } }
  }
  const pick = (node, name) => change({ ...circuit, nodes: circuit.nodes.map((n) => (n.id === node.id ? { ...n, params: { ...n.params, name } } : n)) })
  const choices = level.sentences.map((l) => ({ value: l, label: L(words(l)) }))
  const onClear = circuit.wires.some((w) => !w.locked) || circuit.nodes.some((n) => n.in) ? () => change(begin()) : null
  const checked = useMemo(() => checkIso(level, circuit, words), [level, circuit])
  const ways = circuit.nodes.find((n) => n.id === DECL)?.params.ways ?? 0
  const situations = usePlayback({
    count: level.tests.length,
    stepsOf: () => [],
    check: (k) => (checked.results[k].pass ? '' : L(checked.results[k].reason)),
    final: () => (checked.ways ? L(checked.ways) : ''),
    onSolve: () => solve({ steps: ways }),
    onTest: setTestIndex,
    board: circuit,
    kept: lastRun,
    onKeep: keepRun,
  })
  // Correcting, a run goes through the boards, each judged on every situation.
  const playback = cases ? cases.playback : situations
  const run = playback.run
  const states = playback.states
  const verdict = run?.over ? { pass: playback.passed } : null
  const failed = run?.over && !playback.passed ? (cases ? run.results.at(-1) : checked.results[run.results.length - 1]) : null
  const verdictText = !verdict ? null : verdict.pass
    ? tr('所有检验条例都正确：应当可推导的目标，这份声明都推导得出；不应当可推导的，都推导不出。', 'Every test case is right: each goal that should be derivable is derived by this declaration, and none that should not be is.')
    : run.final || (cases ? failed.reason : L(failed.reason))

  // What each card says in the situation picked.
  const ruleInto = (k) => {
    const wire = circuit.wires.find((w) => w.to === DECL && w.port === `c${k}`)
    return wire && view.values.get(wire.from)
  }
  // What a card shows, as the other boards show sentences and rules, saying each thing once: an assumption card its
  // sentence (picked on the card, or in its sheet), the connective its ways as rules (written as every rule is,
  // ⟦A; B⟧ ⟹ A ∧ B), numbered as its inputs, and whether it is proved. `at` is where: 'card' (the desktop's), 'tile'
  // (a phone's) or 'sheet'.
  const text = (f) => L(say(f, level.notation))
  const Value = ({ f }) => <PROOF.Value v={{ formula: f, hyps: new Map() }} text={text} />
  const body = (node, at = 'card') => {
    if (node.type === 'none') return null
    if (node.type === 'thing') return <div className="lg-card"><span className="lg-taken">{tr('任取的是', 'Taken:')} <b>{node.params.name}</b></span></div>
    if (node.type === 'hyp') {
      if (at === 'tile') return <div className="lg-card"><Value f={sentenceOf(level, node.params.name)} /></div>
      return <div className="lg-card"><FormulaField label={T('假设', 'Assume')} value={node.params.name} onChange={(name) => pick(node, name)} choices={choices} required /></div>
    }
    const way = (k) => (at === 'sheet' ? tr(`引入规则 ${WAY[k]}：`, `Intro rule ${WAY[k]}:`) : `${WAY[k]}.`)
    return (
      <div className="lg-card">
        {ways > 0 && <Entries className="lg-clauses">{Array.from({ length: ways }, (_, k) => ruleInto(k + 1)).map((rule, k) => rule && <code key={k}>{`${way(k)} ${wayText(wayRule(wayOf(rule), level), text)}`}</code>)}</Entries>}
        {view.made ? <span className="lg-tv is-true">{tr(`由引入规则 ${WAY[view.made.way - 1]} 推导出`, `Derived by intro rule ${WAY[view.made.way - 1]}`)}</span> : view.derived ? <span className="lg-tv is-true">{tr('可推导', 'Derivable')}</span> : <i className="lg-mark">{tr('不可推导', 'Not derivable')}</i>}
      </div>
    )
  }

  const brief = <Brief game={game} level={entry} hint={level.hint} phone={phone} />
  // One table of test cases. Correcting, every case shows its result once the board on view is judged; and a row is
  // lit by the case picked, not by the run.
  const shown = (k) => (cases ? Boolean(states[cases.at]) : run ? k < run.results.length : false)
  const rowClass = (k) => `${k === testIndex ? 'is-on' : ''} ${!cases && states[k] ? `is-${states[k]}` : ''}`
  const result = (k) => (shown(k) ? { derived: checked.results[k].derived, wrong: !checked.results[k].pass } : null)
  const table = (
    <div className="lg-strip is-tables">
      <CaseTable cases={level.tests} words={words} level={level} rowClass={rowClass} onPick={setTestIndex} result={result} />
      {verdictText && <p className={`lg-verdict ${verdict.pass ? 'is-pass' : 'is-fail'}`}>{verdictText}</p>}
    </div>
  )
  const dock = <RunDock {...playback.dock({ go: tr('运行检验条例', 'Run the test cases'), done: tr('所有条例均正确', 'All cases correct') })} />

  const items = (level.tray ?? ['hyp']).map((t) => TRAY[t])
  const add = (type) => {
    const [x, y] = spotLeft(circuit)
    change(addPart(type, { x, y }).graph)
  }
  const began = Boolean(run && (run.step >= 0 || run.results.length > 0 || run.test > 0))
  const stepKey = run ? `${run.test}:${run.step}:${run.results.length}` : ''
  // Correcting, the boards are the test cases: their tabs put one on the canvas.
  const tabs = (onPhone) => cases && level.boards.length > 1 && <TestTabs tests={cases.tests} states={states} index={cases.at} onSelect={cases.select} phone={onPhone} />
  if (phone) return <PhoneIso {...{ circuit, parts, items, addPart, brief, dock, change, onClear, table, body, began, stepKey }} tabs={tabs(true)} scope={cases ? `${level.id}-${cases.at}` : level.id} />

  return (
    <CircuitLayout
      className="lg-level"
      brief={brief}
      parts={<Palette compact items={items} onAdd={add} />}
      canvas={
        <div className="lg-stage">
          <div className="lg-board">
            <CanvasEditor
              onClear={onClear}
              types={items.map((i) => i.type)}
              key={cases ? `${level.id}-${cases.at}` : level.id}
              scope={level.id}
              graph={circuit}
              onChange={change}
              parts={parts}
              width={220}
              height={120}
              body={body}
              cardClass={() => 'lg-node'}
              wireState={(wire) => (view.values.get(wire.from) ? 'live' : 'dead')}
              emptyNote={{ zh: '从上方取出假设元件，选择它假设的句子。假设接入另一个假设的「先假设」口时，同一条引入规则需要这两个前提；假设接入连接词的引入规则口时，构成一条引入规则。', en: 'Take an assumption from above and choose the sentence it assumes. Wired into another assumption’s “assumed first” port, both belong to one intro rule; wired into one of the connective’s intro-rule ports, it forms an intro rule.' }}
            />
          </div>
        </div>
      }
      tests={tabs(false)}
      status={<TestStatus states={states} />}
      outputsTitle={tr('检验条例', 'Test cases')}
      outputs={table}
      actions={<footer className="run-foot">{dock}</footer>}
    />
  )
}

// The board on a phone: the shared slot board, the situations under it, the tray and the run bar.
function PhoneIso({ circuit, parts, items, addPart, brief, dock, change, onClear, table, body, began, stepKey, scope, tabs }) {
  const [sheet, setSheet] = useState(null) // { node } or { slot }
  const root = useRef(null)
  const scroller = useRef(null)
  const editing = useSlotEditing({
    graph: circuit,
    onChange: change,
    parts,
    create: (_, type, at) => {
      const [x, y] = spotLeft(circuit)
      return addPart(type, { slot: at, x, y })
    },
    label: parts.label,
    openNode: (id) => setSheet({ node: id }),
    openSlot: (at) => setSheet({ slot: at }),
    root,
    scroller,
    scope,
  })
  // As on the machine board (BoardScreen.jsx PhoneBoard): a run brings the page to the tables at its bottom, and keeps
  // it there while the rows fill in, until the player scrolls away.
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
  return (
    <div className="level-phone is-split lg-phone" ref={root}>
      <div className="lg-scroll" ref={scroller} onScroll={onScroll}>
        <TaskCard>{brief}</TaskCard>
        {tabs}
        <SlotBoard dense graph={circuit} parts={parts} nameOf={editing.nameOf} thumb={(n) => body(n, 'tile')} sinkBody={(n) => body(n, 'tile')} picking={editing.picking} moving={editing.moving} canLand={editing.canLand} onPort={editing.onPort} onNode={editing.onNode} onSlot={editing.onSlot} history={editing.history} onClear={onClear} onChange={change} types={items.map((i) => i.type)} />
        {table}
      </div>
      <Tray items={items} onPick={editing.placeFirstFree} />
      <footer className="run-foot">{dock}</footer>
      <Notice editing={editing} />
      {node && (
        <Sheet title={editing.nameOf(node)} onClose={() => setSheet(null)}>
          <div className="lg-sheet">
            {TRAY[node.type] && <p className="lg-desc">{L(TRAY[node.type].desc)}</p>}
            {body(node, 'sheet')}
            {parts.role(node) === 'part' && <PartActions onMove={() => { editing.startMove(node.id); setSheet(null) }} onRemove={node.locked ? null : () => { editing.remove(node.id); setSheet(null) }} />}
          </div>
        </Sheet>
      )}
      {sheet?.slot !== undefined && (
        <Sheet title={tr('放在这一格', 'Place in this slot')} onClose={() => setSheet(null)}>
          <div className="lg-add">
            {items.map((item) => (
              <button key={item.type} type="button" data-family={item.family} onClick={() => { editing.place(item.type, sheet.slot); setSheet(null) }}>
                <b>{L(item.label)}</b>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  )
}

/**
 * What passing a declaration gives, shown when it is passed: its rules for any sentences, those that make it (one
 * for each way), and the one that takes it apart, made from them (iso.js declaredRules) or the level's own (equality,
 * the numbers). The proof-board parts they are from here on are listed with what the level unlocks (game.jsx
 * unlocked).
 */
export function DeclaredRules({ level }) {
  const text = (f) => L(say(f, level.notation))
  // A type (chapter 12): its constructors, and the rules the kernel makes of them.
  if (level.datatype) {
    const type = typeOf(level)
    return (
      <div className="dialog-note">
        <span className="panel-label">{tr('声明给出的规则', 'The rules it declares')}</span>
        <div className="lg-clauses">
          <code>{`${level.datatype.type} = ${constructorsOf(type).map((c) => text(atom('=', [fn(c.f, c.args.map(tvar)), fn(c.f, c.args.map(tvar))])).split(' = ')[0]).join(' | ')}`}</code>
          {datatypeRules(level.datatype.type, type).map((r) => <code key={r.key}>{`${L(r.name)}：${ruleText(r, text)}`}</code>)}
        </div>
      </div>
    )
  }
  const rules = declaredRules(level, waysIn(level.solution))
  return (
    <div className="dialog-note">
      <span className="panel-label">{tr('声明给出的规则', 'The rules it declares')}</span>
      <div className="lg-clauses">
        {rules.make.map((r, k) => <code key={k}>{tr(`引入规则 ${WAY[k]}：`, `Intro rule ${WAY[k]}: `)}{wayText(r, text)}</code>)}
        <code>{tr('消去规则：', 'Elim rule: ')}{wayText(rules.take, text)}</code>
      </div>
    </div>
  )
}
