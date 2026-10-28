import { useMemo, useRef, useState } from 'react'
import { FileSignature, PackageOpen, SquareDashedText } from 'lucide-react'
import { Brief, CircuitLayout, RunDock, TaskCard, TestStatus, usePlayback } from '../../../shell/index.js'
import Sheet from '../../../shell/Sheet.jsx'
import { L, tr } from '../../../shell/i18n.js'
import { CanvasEditor, Notice, Palette, PartActions, SlotBoard, Tray, spotIn, useSlotEditing } from '../../../circuit/index.js'
import FormulaField from './FormulaField.jsx'
import { parse } from '../formula.js'
import { say } from '../notation.js'
import { DECL, ISO_PARTS, checkIso, declInputs, hypCard, ruleFormula, runIso, settle, startIso } from '../iso.js'
import { PROOF } from './boards.jsx'

// A connective declared by its ways to make it (iso.js) on the shared circuit editor: assumption cards from the tray,
// each picking the sentence it assumes, chained to write each way as a rule, and the connective's card, whose inputs grow as ways are wired and
// whose cases (the kernel's, one for each way) appear as the board's outputs. Each test is a situation, one row of the
// table under the board: which proofs are at hand, whether the connective is proved and by which way, and what its
// case gets back. Running goes down the rows (../../../shell/usePlayback.jsx) and stops on the first one that is wrong.

const T = (zh, en) => ({ zh, en })
const CIRCLED = ['①', '②', '③']

/** The editor's description of the board (../../circuit/model.js), with the level's words for its letters. */
function isoPartsFor(level, words) {
  return {
    inputs: (node) => (node.type === 'hyp' ? ['then'] : node.type === DECL ? declInputs(node) : node.type === 'case' ? ['p'] : []),
    role: (node) => (node.type === 'case' ? 'sink' : 'part'),
    label: (node) => (node.type === 'hyp' ? T('假设', 'Assume')
      : node.type === DECL ? T(`「${level.declare.zh}」`, `“${level.declare.en}”`)
      : T(`拆法 ${CIRCLED[node.params.k - 1]}`, `Case ${CIRCLED[node.params.k - 1]}`)),
    portLabel: (node, port) => (node.type === DECL ? T(`造法 ${CIRCLED[Number(port.slice(1)) - 1]}`, `Way ${CIRCLED[Number(port.slice(1)) - 1]}`) : node.type === 'hyp' ? T('再假设', 'Then assume') : ''),
    family: (node) => (node.type === 'hyp' ? 'box' : node.type === DECL ? 'lemma' : 'given'),
    icon: (node) => (node.type === 'hyp' ? SquareDashedText : node.type === DECL ? FileSignature : PackageOpen),
    cardWidth: () => 220,
    rules: ISO_PARTS,
  }
}

const fits = (circuit) => circuit.nodes.some((n) => n.id === DECL) && !circuit.nodes.some((n) => n.type === 'hyp' && n.locked)
const HYP = { type: 'hyp', label: T('假设', 'Assume'), icon: SquareDashedText, family: 'box' }

export default function IsoScreen({ game, level: entry, saved, save, solve, lastRun, keepRun, phone }) {
  const level = entry.source
  const words = (letter) => say(parse(letter), level.notation)
  const parts = useMemo(() => isoPartsFor(level, words), [level])
  const [circuit, setCircuit] = useState(() => (saved?.nodes && fits(saved) ? settle(saved) : startIso()))
  const [testIndex, setTestIndex] = useState(0)
  const test = level.tests[Math.min(testIndex, level.tests.length - 1)]
  const view = useMemo(() => runIso(level, circuit, test), [level, circuit, test])

  // Every change goes through the kernel's bookkeeping: ways renumbered, a case for each (iso.js settle).
  const change = (next) => {
    const settled = settle(next)
    setCircuit(settled)
    save(settled)
  }
  // A card from the tray assumes, to begin with, the first sentence no card on the board assumes yet.
  const addHyp = (at) => {
    const taken = new Set(circuit.nodes.map((n) => n.id))
    let k = 1
    while (taken.has(`hyp-${k}`)) k += 1
    const used = new Set(circuit.nodes.filter((n) => n.type === 'hyp').map((n) => n.params.name))
    const id = `hyp-${k}`
    return { id, graph: { ...circuit, nodes: [...circuit.nodes, hypCard(id, level.letters.find((l) => !used.has(l)) ?? level.letters[0], at)] } }
  }
  const pick = (node, name) => change({ ...circuit, nodes: circuit.nodes.map((n) => (n.id === node.id ? { ...n, params: { ...n.params, name } } : n)) })
  const choices = level.letters.map((l) => ({ value: l, label: L(words(l)) }))
  const onClear = circuit.wires.some((w) => !w.locked) || circuit.nodes.some((n) => n.in) ? () => change(startIso()) : null
  const checked = useMemo(() => checkIso(level, circuit, words), [level, circuit])
  const ways = circuit.nodes.find((n) => n.id === DECL)?.params.ways ?? 0
  const playback = usePlayback({
    count: level.tests.length,
    stepsOf: () => [],
    check: (k) => (checked.results[k].pass ? '' : L(checked.results[k].reason)),
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
  const verdictText = !verdict ? null : verdict.pass
    ? tr('每一种情况都对：证得出的时候，那种造法的拆法正好取回交进去的证明；证不出的时候，哪种造法都凑不齐。', 'Every situation is right: when it is proved, the case of the way it was made by gets back the very proofs handed in; when it is not, no way has all it needs.')
    : L(failed.reason)

  // What each card says in the situation picked.
  const ruleInto = (k) => {
    const wire = circuit.wires.find((w) => w.to === DECL && w.port === `c${k}`)
    return wire && view.values.get(wire.from)
  }
  // What a card gives is a sentence, shown as the proof board shows one: a rule, the connective, what a case gets back.
  const text = (f) => L(say(f, level.notation))
  const Value = ({ f, small }) => <PROOF.Value v={{ formula: f, hyps: new Map() }} text={text} small={small} />
  const body = (node, edit = true) => {
    if (node.type === 'hyp') {
      const rule = view.values.get(node.id)
      return (
        <div className="lg-card">
          {edit && <FormulaField value={node.params.name} onChange={(name) => pick(node, name)} choices={choices} required />}
          {rule && <Value f={ruleFormula(rule, level)} small={!edit} />}
        </div>
      )
    }
    if (node.type === DECL) {
      return (
        <div className="lg-card">
          {Array.from({ length: ways }, (_, k) => ruleInto(k + 1)).map((rule, k) => rule && <Value key={k} f={ruleFormula(rule, level)} small />)}
          {view.made ? <Value f={parse(level.target)} /> : <i className="lg-mark">{tr('证不出', 'Not proved')}</i>}
        </div>
      )
    }
    const back = view.values.get(node.id)
    return <div className="lg-card">{back ? back.items.map((x, k) => <Value key={k} f={parse(x.letter)} />) : <i className="lg-mark">{tr('没有', 'Nothing')}</i>}</div>
  }

  const brief = <Brief game={game} level={entry} hint={level.hint} phone={phone} />
  const table = (
    <div className="lg-strip">
      <div className="lg-scroll-x">
        <table className="lg-rows">
          <thead>
            <tr>
              {level.letters.map((l) => <th key={l}>{tr(`手里的「${words(l).zh}」`, `“${words(l).en}” at hand`)}</th>)}
              <th>{tr(`「${level.declare.zh}」`, `“${level.declare.en}”`)}</th>
              <th>{tr('拆法取回', 'Case gets back')}</th>
            </tr>
          </thead>
          <tbody>
            {level.tests.map((t, k) => {
              const r = checked.results[k]
              const shownRow = run ? k < run.results.length : t === test
              const back = r.made && r.values.get(`case-${r.made.way}`)
              return (
                <tr key={k} className={`${t === test ? 'is-on' : ''} ${states[k] ? `is-${states[k]}` : ''}`} onClick={() => setTestIndex(k)}>
                  {level.letters.map((l) => <td key={l}>{t.have[l] ? `#${t.have[l]}` : '—'}</td>)}
                  <td>{shownRow ? (r.made ? tr(`证得出 ${CIRCLED[r.made.way - 1]}`, `Proved ${CIRCLED[r.made.way - 1]}`) : tr('证不出', 'Not proved')) : ''}</td>
                  <td>{shownRow && back ? back.items.map((x) => `#${x.n}`).join(' · ') : ''}</td>
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

  const items = [HYP]
  const add = () => {
    const [x, y] = spotIn(circuit, null)
    change(addHyp({ x, y }).graph)
  }
  if (phone) return <PhoneIso {...{ circuit, parts, items, addHyp, brief, dock, change, onClear, table, body }} scope={level.id} />

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
              types={['hyp']}
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
              emptyNote={{ zh: '从上面拿一张假设，选它假设哪一句；一张假设接进另一张的「再假设」，是同一种造法要两样；假设接进连接词的造法口，就是一种造法。', en: 'Take an assumption from above and pick the sentence it assumes; one wired into another’s “then assume” is one way needing both; one wired into a way of the connective is one way to make it.' }}
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

// The board on a phone: the shared slot board, the situations under it, the tray and the run bar.
function PhoneIso({ circuit, parts, items, addHyp, brief, dock, change, onClear, table, body, scope }) {
  const [sheet, setSheet] = useState(null) // { node } or { slot }
  const root = useRef(null)
  const scroller = useRef(null)
  const editing = useSlotEditing({
    graph: circuit,
    onChange: change,
    parts,
    create: (_, type, at) => {
      const [x, y] = spotIn(circuit, null)
      return addHyp({ slot: at, x, y })
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
        <SlotBoard dense graph={circuit} parts={parts} nameOf={editing.nameOf} thumb={(n) => body(n, false)} sinkBody={body} picking={editing.picking} moving={editing.moving} canLand={editing.canLand} onPort={editing.onPort} onNode={editing.onNode} onSlot={editing.onSlot} history={editing.history} onClear={onClear} onChange={change} types={['hyp']} />
        {table}
      </div>
      <Tray items={items} onPick={editing.placeFirstFree} />
      <footer className="run-foot">{dock}</footer>
      <Notice editing={editing} />
      {node && (
        <Sheet title={editing.nameOf(node)} onClose={() => setSheet(null)}>
          <div className="lg-sheet">
            {body(node)}
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
