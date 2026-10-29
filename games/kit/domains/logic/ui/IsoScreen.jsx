import { useMemo, useRef, useState } from 'react'
import { CircleDashed, CircleDot, FileSignature, SquareDashedText } from 'lucide-react'
import { Brief, CircuitLayout, RunDock, TaskCard, TestStatus, usePlayback } from '../../../shell/index.js'
import Sheet from '../../../shell/Sheet.jsx'
import { L, tr } from '../../../shell/i18n.js'
import { CanvasEditor, Notice, Palette, PartActions, SlotBoard, Tray, freeSpot, useSlotEditing } from '../../../circuit/index.js'
import FormulaField from './FormulaField.jsx'
import { say } from '../notation.js'
import { DECL, ISO_PARTS, checkIso, declInputs, declaredRules, hypCard, runIso, sentenceOf, settle, startIso, thingCard, wayOf, wayRule, wayText, waysIn } from '../iso.js'
import { generateElim, syncOwn } from '../machine.js'
import { takenRules } from '../take.js'
import Entries from '../../../shell/Entries.jsx'
import { PROOF } from './boards.jsx'

// A connective declared by its ways to make it (iso.js) on the shared circuit editor: assumption cards from the tray,
// each picking the sentence it assumes, chained to write each way as a rule, and the connective's card, the board's
// output, whose inputs grow as ways are wired. Each test is a situation, one row of the table under the board: which
// proofs are at hand, whether the connective is proved and by which way, and what its case (the kernel's, one for each
// way) gets back. Running goes down the rows (../../../shell/usePlayback.jsx) and stops on the first one that is wrong.

const T = (zh, en) => ({ zh, en })
// Ways and their cases are numbered 1 2 3, apart from the board's own part numbers (①②…); on a card a way is "1.".
const WAY = ['1', '2', '3']

/** The editor's description of the board (../../circuit/model.js), with the level's words for its sentences. */
function isoPartsFor(level, words) {
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
const HYP_DESC = T('假设一句话。一张假设接进它的「先假设」，就是先假设那句、再假设这句；它接进连接词的引入规则口，这一串就是一条引入规则。', 'Assume a sentence. An assumption wired into its “assumed first” is assumed before it; wired into a way of the connective, the chain is one way to make it.')
const HYP = { type: 'hyp', label: T('假设', 'Assume'), desc: HYP_DESC, icon: SquareDashedText, family: 'box' }
const NONE = { type: 'none', label: T('不用假设', 'Assume nothing'), desc: T('什么都不假设。接进连接词的引入规则口，这条引入规则不要任何证明就能造。', 'Assume nothing. Wired into a way of the connective, that way makes it with no proof at all.'), icon: CircleDashed, family: 'box' }
const THING = { type: 'thing', label: T('任取一样东西', 'Any thing'), desc: T('任取一样东西，给它一个名字。接在它后面的假设可以提到这个名字：这样的引入规则对任何东西都成立。', 'Take any thing and give it a name. The assumptions after it may mention the name: such a way holds for any thing at all.'), icon: CircleDot, family: 'box' }
export const TRAY = { hyp: HYP, none: NONE, thing: THING }
// Where a new card goes: the first free spot left of the board's output card (`id`), column by column leftward, so
// what is wired into it reads left to right.
export const spotLeft = (circuit, id = DECL) => {
  const out = circuit.nodes.find((n) => n.id === id)
  return freeSpot({ nodes: circuit.nodes.filter((n) => !n.in) }, { w: 240, h: 150, x0: (out?.x ?? 320) - 260, dx: -260, cols: 3, y0: out?.y ?? 40 })
}

export default function IsoScreen({ game, level: entry, saved, save, solve, lastRun, keepRun, phone }) {
  const level = entry.source
  const words = (sentence) => say(sentenceOf(level, sentence), level.notation)
  const thingWords = (name) => level.notation.words?.[name] ?? T(name, name)
  const parts = useMemo(() => isoPartsFor(level, words), [level])
  const [circuit, setCircuit] = useState(() => (saved?.nodes && fits(saved) ? settle(saved) : startIso()))
  const [testIndex, setTestIndex] = useState(0)
  const test = level.tests[Math.min(testIndex, level.tests.length - 1)]
  const view = useMemo(() => runIso(level, circuit, test), [level, circuit, test])

  // Every change goes through the kernel's bookkeeping: ways renumbered (iso.js settle).
  const change = (next) => {
    const settled = settle(next)
    setCircuit(settled)
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
  const onClear = circuit.wires.some((w) => !w.locked) || circuit.nodes.some((n) => n.in) ? () => change(startIso()) : null
  const checked = useMemo(() => checkIso(level, circuit, words), [level, circuit])
  const ways = circuit.nodes.find((n) => n.id === DECL)?.params.ways ?? 0
  const playback = usePlayback({
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
  const run = playback.run
  const states = playback.states
  const verdict = run?.over ? { pass: playback.passed } : null
  const failed = run?.over && !playback.passed ? checked.results[run.results.length - 1] : null
  // With one intro rule the elim rule gets back what went in; with several it cannot (whoever holds the sentence does
  // not know which rule made it), it only goes into that rule's case, which is handed what went in.
  const several = ways > 1
  const verdictText = !verdict ? null : verdict.pass
    ? (several
      ? tr('每一种情况都对：证得出的时候，消去规则走进造它的那条引入规则的情况，交进去的证明交给那种情况；证不出的时候，哪条引入规则都凑不齐。', 'Every situation is right: when it is proved, the elim rule goes into the case of the intro rule that made it, which is handed the proofs that went in; when it is not, no intro rule has all it needs.')
      : tr('每一种情况都对：证得出的时候，消去规则正好取回交进去的证明；证不出的时候，引入规则凑不齐。', 'Every situation is right: when it is proved, the elim rule gets back the very proofs handed in; when it is not, the intro rule does not have all it needs.'))
    : run.final || L(failed.reason)

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
        {view.made ? <span className="lg-tv is-true">{tr(`证得出：引入规则 ${WAY[view.made.way - 1]}`, `Proved by intro rule ${WAY[view.made.way - 1]}`)}</span> : <i className="lg-mark">{tr('证不出', 'Not proved')}</i>}
      </div>
    )
  }

  const brief = <Brief game={game} level={entry} hint={level.hint} phone={phone} />
  // The table's columns: the sentence each situation asks about (when the declared sentence mentions a thing), and
  // every proof any situation has at hand.
  const goals = level.tests.some((t) => t.goal)
  const backText = (back) => back.map((x) => (x.kind === 'thing' ? L(thingWords(x.name)) : `#${x.n}`)).join(' · ')
  const held = [...new Set(level.tests.flatMap((t) => Object.keys(t.have)))]
  const table = (
    <div className="lg-strip">
      <div className="lg-scroll-x">
        <table className="lg-rows">
          <thead>
            <tr>
              {goals && <th>{tr('要证', 'To prove')}</th>}
              {held.map((l) => <th key={l}>{tr(`手里的「${words(l).zh}」`, `“${words(l).en}” at hand`)}</th>)}
              <th>{tr(`「${level.declare.zh}」`, `“${level.declare.en}”`)}</th>
              <th>{several ? tr('消去规则走的情况', 'Case the elim rule takes') : tr('消去规则取回', 'Elim rule gets back')}</th>
            </tr>
          </thead>
          <tbody>
            {level.tests.map((t, k) => {
              const r = checked.results[k]
              const shownRow = run ? k < run.results.length : t === test
              return (
                <tr key={k} className={`${t === test ? 'is-on' : ''} ${states[k] ? `is-${states[k]}` : ''}`} onClick={() => setTestIndex(k)}>
                  {goals && <td>{t.goal ? L(words(t.goal)) : ''}</td>}
                  {held.map((l) => <td key={l}>{t.have[l] ? `#${t.have[l]}` : '—'}</td>)}
                  <td>{shownRow ? (r.made ? tr(`证得出：${WAY[r.made.way - 1]}`, `Proved: ${WAY[r.made.way - 1]}`) : tr('证不出', 'Not proved')) : ''}</td>
                  <td>{shownRow && r.back ? (several ? tr(`情况 ${WAY[r.made.way - 1]}`, `Case ${WAY[r.made.way - 1]}`) + (r.back.length ? tr(`，交给它 ${backText(r.back)}`, `, handed ${backText(r.back)}`) : '') : r.back.length ? backText(r.back) : tr('什么都没有', 'Nothing')) : ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {verdictText && <p className={`lg-verdict ${verdict.pass ? 'is-pass' : 'is-fail'}`}>{verdictText}</p>}
    </div>
  )
  const dock = <RunDock {...playback.dock({ go: tr('每种情况试一遍', 'Try every situation'), done: tr('每种情况都对', 'Every situation right') })} />

  const items = (level.tray ?? ['hyp']).map((t) => TRAY[t])
  const add = (type) => {
    const [x, y] = spotLeft(circuit)
    change(addPart(type, { x, y }).graph)
  }
  if (phone) return <PhoneCards {...{ circuit, parts, items, addPart, brief, dock, change, onClear, table, body }} spot={() => spotLeft(circuit)} scope={level.id} />

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
              key={level.id}
              scope={level.id}
              graph={circuit}
              onChange={change}
              parts={parts}
              width={220}
              height={120}
              body={body}
              cardClass={() => 'lg-node'}
              wireState={(wire) => (view.values.get(wire.from) ? 'live' : 'dead')}
              emptyNote={{ zh: '从上面拿一张假设，选它假设哪一句；一张假设接进另一张的「先假设」，是同一条引入规则要两样；假设接进连接词的引入规则口，就是一条引入规则。', en: 'Take an assumption from above and pick the sentence it assumes; one wired into another’s “assumed first” is one way needing both; one wired into a way of the connective is one way to make it.' }}
            />
          </div>
        </div>
      }
      status={<TestStatus states={states} />}
      outputsTitle={tr('各种情况', 'Situations')}
      outputs={table}
      actions={<footer className="run-foot">{dock}</footer>}
    />
  )
}

// A board of cards on a phone (this board and the elimination board, TakeScreen.jsx): the shared slot board, the table
// under it, the tray and the run bar. `spot()` is where a new card goes on the desktop canvas.
export function PhoneCards({ circuit, parts, items, addPart, brief, dock, change, onClear, table, body, spot, scope }) {
  const [sheet, setSheet] = useState(null) // { node } or { slot }
  const root = useRef(null)
  const scroller = useRef(null)
  const editing = useSlotEditing({
    graph: circuit,
    onChange: change,
    parts,
    create: (_, type, at) => {
      const [x, y] = spot()
      return addPart(type, { slot: at, x, y })
    },
    label: parts.label,
    openNode: (id) => setSheet({ node: id }),
    openSlot: (at) => setSheet({ slot: at }),
    root,
    scroller,
    scope,
  })
  const node = sheet?.node && circuit.nodes.find((n) => n.id === sheet.node)
  return (
    <div className="level-phone is-split lg-phone" ref={root}>
      <div className="lg-scroll" ref={scroller}>
        <TaskCard>{brief}</TaskCard>
        <SlotBoard dense graph={circuit} parts={parts} nameOf={editing.nameOf} thumb={(n) => body(n, 'tile')} sinkBody={(n) => body(n, 'tile')} picking={editing.picking} moving={editing.moving} canLand={editing.canLand} onPort={editing.onPort} onNode={editing.onNode} onSlot={editing.onSlot} history={editing.history} onClear={onClear} onChange={change} types={items.map((i) => i.type)} />
        {table}
      </div>
      <Tray items={items} onPick={editing.placeFirstFree} />
      <footer className="run-foot">{dock}</footer>
      <Notice editing={editing} />
      {node && (
        <Sheet title={editing.nameOf(node)} onClose={() => setSheet(null)}>
          <div className="lg-sheet">
            {items.find((i) => i.type === node.type)?.desc && <p className="lg-desc">{L(items.find((i) => i.type === node.type).desc)}</p>}
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
 * for each way), and those that take it apart: the ones the player wrote by hand and the check let through (take.js),
 * the level's own (equality, the numbers), or what the player's elimination rule generator makes of the ways once it
 * is built (../machine.js generateElim). `level` is the passed level (its tasks), `progress` the player's. The
 * proof-board parts they are from here on are listed with what the level unlocks (game.jsx unlocked).
 */
export function DeclaredRules({ level, progress }) {
  const tasks = level.tasks ?? [level]
  const declared = tasks.find((t) => t.kind === 'iso')
  const at = tasks.findIndex((t) => t.kind === 'take')
  const text = (f) => L(say(f, declared.notation))
  const rules = declaredRules(declared, waysIn(declared.solution))
  syncOwn(progress?.built)
  const board = at < 0 ? null : (level.tasks ? progress?.data?.[level.id]?.[at] : progress?.data?.[level.id]) ?? tasks[at].solution
  const takes = board ? takenRules(tasks[at], board, text)
    : rules.take ? [wayText(rules.take, text)]
    : progress?.all || progress?.flags?.includes('lemma:elimGen') ? [generateElim(declared, rules.it, rules.make)].filter(Boolean).map((r) => wayText(r, text))
    : []
  return (
    <div className="dialog-note">
      <span className="panel-label">{tr('声明给出的规则', 'The rules it declares')}</span>
      <div className="lg-clauses">
        {rules.make.map((r, k) => <code key={k}>{tr(`引入规则 ${WAY[k]}：`, `Intro rule ${WAY[k]}: `)}{wayText(r, text)}</code>)}
        {takes.map((r, k) => <code key={`t${k}`}>{tr('消去规则：', 'Elim rule: ')}{r}</code>)}
      </div>
    </div>
  )
}
