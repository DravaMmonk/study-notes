import { useMemo, useRef, useState } from 'react'
import { ArrowLeftToLine, ArrowRightFromLine, FileSignature, PackageOpen, PackagePlus } from 'lucide-react'
import { Brief, CircuitLayout, RunDock, TaskCard, TestStatus, usePlayback } from '../../../shell/index.js'
import Sheet from '../../../shell/Sheet.jsx'
import { L, tr } from '../../../shell/i18n.js'
import { CanvasEditor, Notice, Palette, PartActions, SlotBoard, Tray, spotIn, useSlotEditing } from '../../../circuit/index.js'
import { MISSING } from '../../../engine/circuit.js'
import { parse } from '../formula.js'
import { say } from '../notation.js'
import { DECL, ISO_TEXT, checkIso, countCards, runIso, showEvidence, startIso } from '../iso.js'

// A connective declared by its two ways round (iso.js) on the shared circuit editor: the evidence at hand on the
// left, the connective's card in the middle, the outputs that take the evidence back on the right. Each test is a
// situation, one row of the table under the board: which proofs are at hand, whether the connective is proved, and
// what comes back. Running goes down the rows (../../../shell/usePlayback.jsx, each a test of no steps) and stops on
// the first one that is wrong.

const T = (zh, en) => ({ zh, en })
const ITEM = (k) => T(`第 ${k} 份`, ['1st', '2nd', '3rd'][k - 1])
const PORTS = { f1: T('交', 'In'), f2: T('交', 'In'), f3: T('交', 'In'), c1: T('证法 1', 'Way 1'), c2: T('证法 2', 'Way 2'), c3: T('证法 3', 'Way 3'), card: T('一份证明', 'A proof'), in: T('取回', 'Back') }

/** The editor's description of the board (../../circuit/model.js), with the level's words for its letters. */
function isoPartsFor(level, wordOf) {
  const inputs = { ev: [], exit: ['in'], pack: ['f1', 'f2', 'f3'], [DECL]: ['c1', 'c2', 'c3'], unpack: ['card'] }
  return {
    inputs: (node) => inputs[node.type] ?? [],
    role: (node) => (node.type === 'ev' ? 'source' : node.type === 'exit' ? 'sink' : 'part'),
    label: (node) => (node.type === 'ev' ? T(`手里的「${wordOf(node.params.name).zh}」`, `“${wordOf(node.params.name).en}” at hand`)
      : node.type === 'exit' ? T(`取回「${wordOf(node.params.name).zh}」`, `“${wordOf(node.params.name).en}” back`)
      : node.type === DECL ? T(`「${level.declare.zh}」`, `“${level.declare.en}”`)
      : ISO_TEXT[node.type].name),
    portLabel: (node, port) => (node.type === 'exit' ? '' : PORTS[port] ?? ''),
    outputs: (node) => (node.type === 'unpack' ? [1, 2, 3].map((k) => ({ key: String(k), label: ITEM(k), short: ITEM(k) })) : null),
    family: (node) => (node.type === 'ev' ? 'given' : node.type === 'exit' ? 'end' : node.type === DECL ? 'lemma' : 'gate'),
    icon: (node) => (node.type === 'ev' ? ArrowRightFromLine : node.type === 'exit' ? ArrowLeftToLine : node.type === DECL ? FileSignature : node.type === 'pack' ? PackagePlus : PackageOpen),
    cardWidth: (node) => (node.type === DECL ? 200 : 170),
    rules: ISO_TEXT,
  }
}

const fits = (circuit, level) => circuit.nodes.some((n) => n.type === DECL) && level.letters.every((l) => circuit.nodes.some((n) => n.id === `in-${l}`) && circuit.nodes.some((n) => n.id === `out-${l}`))

export default function IsoScreen({ game, level: entry, saved, save, solve, lastRun, keepRun, flags, phone }) {
  const level = entry.source
  const word = (letter) => say(parse(letter), level.notation)
  const parts = useMemo(() => isoPartsFor(level, word), [level])
  const [circuit, setCircuit] = useState(() => (saved?.nodes && fits(saved, level) ? saved : startIso(level)))
  const [testIndex, setTestIndex] = useState(0)
  const test = level.tests[Math.min(testIndex, level.tests.length - 1)]
  const view = useMemo(() => runIso(level, circuit, test), [level, circuit, test])
  const { shown: palette, folded } = useMemo(() => game.logic.offerIn(level, flags), [game, level, flags])

  const change = (next) => {
    setCircuit(next)
    save(next)
  }
  const onClear = circuit.nodes.some((n) => parts.role(n) === 'part' && !n.locked) ? () => change(startIso(level)) : null
  const checked = useMemo(() => checkIso(level, circuit, word), [level, circuit])
  const playback = usePlayback({
    count: level.tests.length,
    stepsOf: () => [],
    check: (k) => (checked.results[k].pass ? '' : L(checked.results[k].reason)),
    onSolve: () => solve({ steps: checked.cards }),
    onTest: setTestIndex,
    board: circuit,
    kept: lastRun,
    onKeep: keepRun,
  })
  const run = playback.run
  const addNode = (type, extra = {}) => {
    const taken = new Set(circuit.nodes.map((n) => n.id))
    let k = circuit.nodes.length
    while (taken.has(`${type}-${k}`)) k += 1
    const id = `${type}-${k}`
    return { id, graph: { ...circuit, nodes: [...circuit.nodes, { id, type, params: {}, ...extra }] } }
  }
  const add = (type) => {
    const [x, y] = spotIn(circuit, null)
    change(addNode(type, { x, y }).graph)
  }

  const states = playback.states
  const verdict = run?.over ? { pass: playback.passed } : null
  const failed = run?.over && !playback.passed ? checked.results[run.results.length - 1] : null
  const verdictText = !verdict ? null : verdict.pass
    ? tr('每一种情况都对：证得出的时候，拆开拿回的正是交进去的那几份；证不出的时候，它就是证不出。', 'Every situation is right: when it is proved, taking it apart gives back the very proofs handed in; when it cannot be, it is not.')
    : L(failed.reason)
  const valueOf = (node) => (node.type === DECL ? view.made : node.type === 'exit' ? view.back[node.params.name] : view.values.get(node.id))
  const errorOf = (node) => view.errors.get(node.id)

  const itemOf = (type) => ({ type, label: ISO_TEXT[type].name, desc: ISO_TEXT[type].desc, icon: parts.icon({ type }), family: parts.family({ type }), fresh: entry.fresh?.includes(type) })
  const items = palette.filter((t) => ISO_TEXT[t]).map(itemOf)
  const foldedItems = folded.filter((t) => ISO_TEXT[t]).map(itemOf)
  const types = [...palette, ...folded].filter((t) => ISO_TEXT[t])
  const brief = (
    <Brief game={game} level={entry} hint={level.hint} phone={phone}>
      <section className="lg-score">
        <div className="stat-row">
          <div className="stat"><b>{countCards(circuit)}</b><span>{tr('元件', 'Cards')}</span></div>
        </div>
      </section>
    </Brief>
  )
  // A proof that came back as the letter it stands for shows by its number; anything else in full.
  const backText = (letter, v) => (v?.kind === 'ev' && v.letter === letter ? `#${v.n}` : L(showEvidence(v, word)))
  const table = (
    <div className="lg-strip">
      <div className="lg-scroll-x">
      <table className="lg-rows">
        <thead>
          <tr>
            {level.letters.map((l) => <th key={l}>{tr(`手里的「${word(l).zh}」`, `“${word(l).en}” at hand`)}</th>)}
            <th>{tr(`「${level.declare.zh}」`, `“${level.declare.en}”`)}</th>
            {level.letters.map((l) => <th key={`b-${l}`}>{tr(`取回「${word(l).zh}」`, `“${word(l).en}” back`)}</th>)}
          </tr>
        </thead>
        <tbody>
          {level.tests.map((t, k) => {
            const r = checked.results[k]
            const shownRow = run ? k < run.results.length : k === level.tests.indexOf(test)
            return (
              <tr key={k} className={`${t === test ? 'is-on' : ''} ${states[k] ? `is-${states[k]}` : ''}`} onClick={() => setTestIndex(k)}>
                {level.letters.map((l) => <td key={l}>{t.have[l] ? `#${t.have[l]}` : '—'}</td>)}
                <td>{shownRow ? (r.made !== undefined ? tr('证得出', 'Proved') : tr('证不出', 'Not proved')) : ''}</td>
                {level.letters.map((l) => <td key={`b-${l}`}>{shownRow && r.back[l] ? backText(l, r.back[l]) : ''}</td>)}
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
  const body = (node) => <div className="lg-card"><CardValue value={valueOf(node)} error={errorOf(node)} say={word} /></div>

  if (phone) return <PhoneIso {...{ circuit, parts, items, foldedItems, brief, dock, change, addNode, onClear, table, body, valueOf, errorOf, types, word }} scope={level.id} />

  return (
    <CircuitLayout
      className="lg-level"
      brief={brief}
      parts={items.length + foldedItems.length > 0 && <Palette compact items={items} folded={foldedItems} onAdd={add} />}
      canvas={
        <div className="lg-stage">
          <div className="lg-board">
            <CanvasEditor
              onClear={onClear}
              types={types}
              key={level.id}
              scope={level.id}
              graph={circuit}
              onChange={change}
              parts={parts}
              width={170}
              height={110}
              body={body}
              cardClass={(node) => `lg-node ${node.type === 'exit' && verdict ? (verdict.pass ? 'is-pass' : 'is-fail') : ''}`}
              wireState={(wire) => (view.values.get(wire.from) !== undefined ? 'live' : 'dead')}
              emptyNote={{ zh: '放一张「一种证法」，把它要交的证明接进去，再接进中间的连接词；放一张「拆开」，把取出的证明接到右边。', en: 'Place a way to prove it, wire in the proofs it needs and wire it into the connective; place Take apart, and wire what it takes out to the right.' }}
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

/** What a card holds in the situation picked: a numbered proof, the connective's proof, or why it holds nothing. */
function CardValue({ value, error, say: wordOf }) {
  if (value !== undefined) return <span className="lg-tv is-true">{L(showEvidence(value, wordOf))}</span>
  return <span className={`lg-error ${error === MISSING || !error ? 'is-missing' : ''}`}>{!error || error === MISSING ? tr('没有', 'None') : L(error)}</span>
}

// The board on a phone: the shared slot board, the situations under it, and the run bar.
function PhoneIso({ circuit, parts, items, foldedItems, brief, dock, change, addNode, onClear, table, body, valueOf, errorOf, types, word, scope }) {
  const [sheet, setSheet] = useState(null) // { node } or { slot }
  const root = useRef(null)
  const scroller = useRef(null)
  const editing = useSlotEditing({
    graph: circuit,
    onChange: change,
    parts,
    create: (_, type, at) => {
      const [x, y] = spotIn(circuit, null)
      return addNode(type, { slot: at, x, y })
    },
    label: parts.label,
    openNode: (id) => setSheet({ node: id }),
    openSlot: (at) => items.length + foldedItems.length > 0 && setSheet({ slot: at }),
    root,
    scroller,
    scope,
  })
  const node = sheet?.node && circuit.nodes.find((n) => n.id === sheet.node)
  return (
    <div className="level-phone is-split lg-phone" ref={root}>
      <div className="lg-scroll" ref={scroller}>
        <TaskCard>{brief}</TaskCard>
        <SlotBoard dense graph={circuit} parts={parts} nameOf={editing.nameOf} thumb={(n) => <CardValue value={valueOf(n)} error={errorOf(n)} say={word} />} sinkBody={(n) => body(n)} picking={editing.picking} moving={editing.moving} canLand={editing.canLand} onPort={editing.onPort} onNode={editing.onNode} onSlot={editing.onSlot} history={editing.history} onClear={onClear} onChange={change} types={types} />
        {table}
      </div>
      <Tray items={items} folded={foldedItems} onPick={editing.placeFirstFree} />
      <footer className="run-foot">{dock}</footer>
      <Notice editing={editing} />
      {node && (
        <Sheet title={editing.nameOf(node)} onClose={() => setSheet(null)}>
          <div className="lg-sheet">
            {ISO_TEXT[node.type] && <p className="lg-desc">{L(ISO_TEXT[node.type].desc)}</p>}
            {body(node)}
            {parts.role(node) === 'part' && <PartActions onMove={() => { editing.startMove(node.id); setSheet(null) }} onRemove={node.locked ? null : () => { editing.remove(node.id); setSheet(null) }} />}
          </div>
        </Sheet>
      )}
      {sheet?.slot !== undefined && (
        <Sheet title={tr('放在这一格', 'Place in this slot')} onClose={() => setSheet(null)}>
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
