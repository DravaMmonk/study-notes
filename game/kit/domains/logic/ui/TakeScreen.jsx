import { useMemo, useState } from 'react'
import { SquareSplitHorizontal } from 'lucide-react'
import { Brief, CircuitLayout, RunDock, TestStatus, usePlayback } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { CanvasEditor, Palette } from '../../../circuit/index.js'
import FormulaField from './FormulaField.jsx'
import { say } from '../notation.js'
import { hypCard, sentenceOf, thingCard } from '../iso.js'
import { ANY, TAKE, TAKE_PARTS, checkTake, ruleOfCard, rulesOn, settleTake, startTake, takeInputs } from '../take.js'
import { ruleText } from '../schematic.js'
import { PhoneCards, TRAY, spotLeft } from './IsoScreen.jsx'

// A declaration's elimination rule written by hand (take.js) on the shared circuit editor: the declaration board's
// assumption cards, chained into the cases of an elimination rule card, whose first premise is always the declared
// sentence and whose conclusion is picked on it. The table under the board is the check, one row a line of it: for
// each way in, the rules give no more than it handed in; last, together they give no less than every way in does.
// Running goes down the rows (../../../shell/usePlayback.jsx) and stops on the first one that is wrong.

const T = (zh, en) => ({ zh, en })
const CASE = ['1', '2', '3']
const RULE = { type: TAKE, label: T('消去规则', 'Elimination rule'), desc: T('一条消去规则：第一条前提是声明的那句话；接进来的每一串假设是一种情况（假设这一串，推出结论）；结论在卡上选。几张卡就是一组消去规则。', 'An elimination rule: its first premise is the declared sentence; each chain wired in is a case (assume the chain, reach the conclusion); the conclusion is picked on the card. Several cards make a set of elimination rules.'), icon: SquareSplitHorizontal, family: 'lemma' }

/** The editor's description of the board (../../../circuit/model.js). */
function takePartsFor() {
  return {
    inputs: (node) => (node.type === TAKE ? takeInputs(node) : node.type === 'none' ? [] : ['before']),
    role: (node) => (node.type === TAKE ? 'sink' : 'part'),
    label: (node) => (node.type === TAKE ? RULE.label : TRAY[node.type].label),
    portLabel: (node, port) => (node.type === TAKE ? T(`情况 ${CASE[Number(port.slice(1)) - 1]}`, `Case ${CASE[Number(port.slice(1)) - 1]}`) : T('先假设', 'Assumed first')),
    family: (node) => (node.type === TAKE ? 'lemma' : 'box'),
    icon: (node) => (node.type === TAKE ? RULE.icon : TRAY[node.type].icon),
    cardWidth: (node) => (node.type === TAKE ? 260 : 220),
    rules: TAKE_PARTS,
  }
}
const fits = (circuit) => circuit.nodes.some((n) => n.id === TAKE) && circuit.nodes.every((n) => TAKE_PARTS[n.type])

export default function TakeScreen({ game, level: entry, saved, save, solve, lastRun, keepRun, phone }) {
  const level = entry.source
  const words = (sentence) => say(sentenceOf(level, sentence), level.notation)
  const text = (f) => L(say(f, level.notation))
  const parts = useMemo(() => takePartsFor(), [])
  const [circuit, setCircuit] = useState(() => (saved?.nodes && fits(saved) ? settleTake(saved) : startTake()))
  const change = (next) => {
    const settled = settleTake(next)
    setCircuit(settled)
    save(settled)
  }
  const addPart = (type, at) => {
    const taken = new Set(circuit.nodes.map((n) => n.id))
    let k = 1
    while (taken.has(`${type}-${k}`)) k += 1
    const id = `${type}-${k}`
    const used = new Set(circuit.nodes.filter((n) => n.type === 'hyp').map((n) => n.params.name))
    const node = type === 'hyp' ? hypCard(id, level.sentences.find((l) => !used.has(l)) ?? level.sentences[0], at)
      : type === 'thing' ? thingCard(id, level.binder ?? 'x', at)
      : type === TAKE ? { id, type, params: { to: ANY, cases: 0 }, ...at }
      : { id, type, params: {}, ...at }
    return { id, graph: { ...circuit, nodes: [...circuit.nodes, node] } }
  }
  const setParam = (node, key, value) => change({ ...circuit, nodes: circuit.nodes.map((n) => (n.id === node.id ? { ...n, params: { ...n.params, [key]: value } } : n)) })
  const choices = level.sentences.map((l) => ({ value: l, label: L(words(l)) }))
  const ends = [{ value: ANY, label: tr('任意一句 ?R', 'Any sentence ?R') }, ...choices]
  const onClear = circuit.nodes.length > 1 ? () => change(startTake()) : null

  const checked = useMemo(() => checkTake(level, circuit, words), [level, circuit])
  const rows = checked.rows
  const [rowIndex, setRowIndex] = useState(0)
  const playback = usePlayback({
    count: rows.length,
    stepsOf: () => [],
    check: (k) => (rows[k].pass ? '' : L(rows[k].reason)),
    onSolve: () => solve({ steps: rulesOn(circuit).reduce((n, r) => n + r.cases.length, 0) }),
    onTest: setRowIndex,
    board: circuit,
    kept: lastRun,
    onKeep: keepRun,
  })
  const run = playback.run
  const states = playback.states
  const verdict = run?.over ? { pass: playback.passed } : null
  const verdictText = !verdict ? null : verdict.pass
    ? tr('不多给，也不少给：每一种造法交进去的东西，消去时都正好交还。', 'No more, no less: whatever each way to make it hands in, eliminating it hands back exactly that.')
    : L(rows[run.results.length - 1].reason)

  // A card shows: an assumption its sentence (picked on it), an elimination rule its conclusion (picked) and itself
  // written out as every rule is.
  const rules = rulesOn(circuit)
  const body = (node, at = 'card') => {
    if (node.type === 'none') return null
    if (node.type === 'thing') return <div className="lg-card"><span className="lg-taken">{tr('任取的是', 'Taken:')} <b>{node.params.name}</b></span></div>
    if (node.type === 'hyp') {
      if (at === 'tile') return <div className="lg-card"><span className="lg-formula"><b>{L(words(node.params.name))}</b></span></div>
      return <div className="lg-card"><FormulaField label={T('假设', 'Assume')} value={node.params.name} onChange={(name) => setParam(node, 'name', name)} choices={choices} required /></div>
    }
    const rule = rules.find((r) => r.id === node.id)
    return (
      <div className="lg-card">
        {at !== 'tile' && <FormulaField label={T('结论', 'Conclusion')} value={node.params.to ?? ANY} onChange={(to) => setParam(node, 'to', to)} choices={ends} required />}
        {rule && <code className="lg-rule">{ruleText(ruleOfCard(level, rule, (f) => f), text)}</code>}
      </div>
    )
  }

  const brief = <Brief game={game} level={entry} hint={level.hint} phone={phone} />
  const wayText = (k) => tr(`用引入规则 ${k + 1} 造的`, `Made by intro rule ${k + 1}`)
  const table = (
    <div className="lg-strip">
      <div className="lg-scroll-x">
        <table className="lg-rows">
          <thead>
            <tr><th>{tr('检查', 'Check')}</th><th>{tr('交进去的', 'Handed in')}</th><th>{tr('结果', 'Result')}</th></tr>
          </thead>
          <tbody>
            {rows.map((r, k) => {
              const shown = run ? k < run.results.length : k === rowIndex
              return (
                <tr key={k} className={`${k === rowIndex ? 'is-on' : ''} ${states[k] ? `is-${states[k]}` : ''}`} onClick={() => setRowIndex(k)}>
                  <td>{r.kind === 'way' ? wayText(r.way) : tr('每条来路都推得出 ?R', 'Every way in reaches ?R')}</td>
                  <td>{r.kind === 'way' ? ([...r.takes.map((x) => tr(`一样东西 ${x}`, `a thing ${x}`)), ...r.gives.map((s) => L(words(s)))].join(tr('、', ', ')) || tr('什么都没有', 'Nothing')) : tr(`「${level.declare.zh}」`, `“${level.declare.en}”`)}</td>
                  <td>{shown ? (r.pass ? (r.kind === 'way' ? tr('不多给', 'No more') : tr('不少给', 'No less')) : L(r.reason)) : ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {verdictText && <p className={`lg-verdict ${verdict.pass ? 'is-pass' : 'is-fail'}`}>{verdictText}</p>}
    </div>
  )
  const dock = <RunDock {...playback.dock({ go: tr('逐项检查', 'Check each line'), done: tr('不多给，不少给', 'No more, no less') })} />

  const items = [...(level.tray ?? ['hyp']).map((t) => TRAY[t]), RULE]
  const add = (type) => {
    const [x, y] = spotLeft(circuit, TAKE)
    change(addPart(type, { x, y }).graph)
  }
  if (phone) return <PhoneCards {...{ circuit, parts, items, addPart, brief, dock, change, onClear, table, body }} spot={() => spotLeft(circuit, TAKE)} scope={level.id} />

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
              wireState={() => 'live'}
              emptyNote={{ zh: '从上面拿假设卡，串成一串接进消去规则的一个情况口；在消去规则卡上选它的结论。', en: 'Take assumption cards from above, chain them into a case of the elimination rule; pick its conclusion on the card.' }}
            />
          </div>
        </div>
      }
      status={<TestStatus states={states} />}
      outputsTitle={tr('检查', 'Check')}
      outputs={table}
      actions={<footer className="run-foot">{dock}</footer>}
    />
  )
}
