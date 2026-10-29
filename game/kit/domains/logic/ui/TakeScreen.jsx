import { useMemo, useState } from 'react'
import { Inbox, Package, PackageOpen, SquareSplitHorizontal } from 'lucide-react'
import { Brief, CircuitLayout, RunDock, TestStatus, usePlayback } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { CanvasEditor, Palette, regionsFit, spotIn } from '../../../circuit/index.js'
import FormulaField from './FormulaField.jsx'
import { say } from '../notation.js'
import { sentenceOf } from '../iso.js'
import { ANY, IT, MOST, TAKE, TAKE_PARTS, addFrame, casesOf, checkTake, ruleOfCard, rulesOn, startTake } from '../take.js'
import { ruleText } from '../schematic.js'
import { PhoneCards } from './IsoScreen.jsx'

// A declaration's elimination rule written by hand (take.js), the other way round from the declaration board: the
// sealed proof on the left wired into an elimination rule frame, whose regions are its cases, each holding what that
// case receives. The table under the board is the check: sealed proofs opened one by one (which way made each, what it
// holds, which case it goes into, or where it is stuck), and last whether the rules give no less than every way in.
// Running goes down the rows (../../../shell/usePlayback.jsx) and stops on the first one that is wrong.

const T = (zh, en) => ({ zh, en })
const CASE = ['1', '2', '3']
const FRAME = { type: TAKE, label: T('消去规则', 'Elimination rule'), desc: T('一条消去规则：左边的「它」接进来；框上选有几种情况、结论是什么；每种情况是框里的一块区域，放进去的是这种情况打开时收到的东西。几个框就是一组消去规则。', 'An elimination rule: “it” comes in on the left; on the frame, pick how many cases and the conclusion; each case is a region of the frame, and what is put in it is what that case receives when opened. Several frames make a set of elimination rules.'), icon: SquareSplitHorizontal, family: 'lemma' }
const GET = { type: 'get', label: T('收到', 'Receive'), desc: T('这一种情况打开时，手里收到这一句话的证明。卡上选是哪一句。', 'When this case is opened, a proof of this sentence is in hand. Pick the sentence on the card.'), icon: Inbox, family: 'box' }
const GET_THING = { type: 'getThing', label: T('收到一样东西', 'Receive a thing'), desc: T('这一种情况打开时，收到一样东西，不知道是哪一样，叫它一个名字；同一种情况里的「收到」可以提到它。', 'When this case is opened, a thing comes in, which one unknown, given a name; the Receive cards of this case may mention it.'), icon: PackageOpen, family: 'box' }
const ITEMS = { get: GET, getThing: GET_THING, [TAKE]: FRAME }

/** The editor's description of the board (../../../circuit/model.js), with the declared sentence's words. */
function takePartsFor(level, words) {
  return {
    inputs: (node) => (node.type === TAKE ? ['it'] : []),
    role: (node) => (node.type === IT ? 'source' : node.type === TAKE ? 'sink' : 'part'),
    label: (node) => (node.type === IT ? T(`封好的「${words(level.target).zh}」`, `A sealed “${words(level.target).en}”`) : ITEMS[node.type].label),
    portLabel: (node) => (node.type === TAKE ? T('它', 'It') : ''),
    family: (node) => (node.type === IT ? 'given' : ITEMS[node.type].family),
    icon: (node) => (node.type === IT ? Package : ITEMS[node.type].icon),
    cardWidth: (node) => (node.type === TAKE ? 300 : 220),
    frames: (node) => (node.type === TAKE ? casesOf(node).map((r, k) => ({ ...r, label: T(`情况 ${CASE[k]}`, `Case ${CASE[k]}`) })) : []),
    rules: TAKE_PARTS,
  }
}
const fits = (circuit, parts) => circuit.nodes.some((n) => n.id === TAKE) && circuit.nodes.every((n) => TAKE_PARTS[n.type]) && regionsFit(circuit, parts)

export default function TakeScreen({ game, level: entry, saved, save, solve, lastRun, keepRun, phone }) {
  const level = entry.source
  const words = (sentence) => say(sentenceOf(level, sentence), level.notation)
  const text = (f) => L(say(f, level.notation))
  const parts = useMemo(() => takePartsFor(level, words), [level])
  const [circuit, setCircuit] = useState(() => (saved?.nodes && fits(saved, parts) ? saved : startTake()))
  const change = (next) => {
    setCircuit(next)
    save(next)
  }
  // The region a new card goes into: the one chosen last (CanvasEditor onTarget), or the first case on the board.
  const [target, setTarget] = useState(null)
  const firstCase = () => {
    const f = circuit.nodes.find((n) => n.type === TAKE && casesOf(n).length)
    return f ? `${f.id}/c1` : null
  }
  const freshId = (type) => {
    const taken = new Set(circuit.nodes.map((n) => n.id))
    let k = 1
    while (taken.has(`${type}-${k}`)) k += 1
    return `${type}-${k}`
  }
  const addPart = (type, at) => {
    const id = freshId(type)
    if (type === TAKE) return { id, graph: addFrame(circuit, id, at) }
    const node = { id, type, params: { name: type === 'get' ? level.sentences[0] : level.binder ?? 'x' }, ...at }
    return { id, graph: { ...circuit, nodes: [...circuit.nodes, node] } }
  }
  const add = (type) => {
    const into = type === TAKE ? null : (target && circuit.nodes.some((n) => n.id === target.split('/')[0]) ? target : firstCase())
    const [x, y] = spotIn(circuit, into)
    change(addPart(type, { x, y, ...(into ? { in: into } : {}) }).graph)
  }
  // Fewer cases: what sat in the cases taken away goes with them.
  const setParam = (node, key, value) => {
    const nodes = circuit.nodes.map((n) => (n.id === node.id ? { ...n, params: { ...n.params, [key]: value } } : n))
    const kept = key === 'ways' ? new Set(casesOf({ params: { ways: value } }).map((r) => `${node.id}/${r.name}`)) : null
    const gone = kept ? new Set(nodes.filter((n) => n.in?.startsWith(`${node.id}/`) && !kept.has(n.in)).map((n) => n.id)) : new Set()
    change({ ...circuit, nodes: nodes.filter((n) => !gone.has(n.id)), wires: circuit.wires.filter((w) => !gone.has(w.from) && !gone.has(w.to)) })
  }
  const choices = level.sentences.map((l) => ({ value: l, label: L(words(l)) }))
  const ends = [{ value: ANY, label: tr('任意一句 ?R', 'Any sentence ?R') }, ...choices]
  const counts = Array.from({ length: MOST + 1 }, (_, k) => ({ value: String(k), label: tr(`${k} 种`, `${k}`) }))
  const onClear = circuit.nodes.length > 2 || circuit.nodes.some((n) => n.type === TAKE && casesOf(n).length) ? () => change(startTake()) : null

  const checked = useMemo(() => checkTake(level, circuit, words), [level, circuit])
  const rows = checked.rows
  const [rowIndex, setRowIndex] = useState(0)
  const rules = rulesOn(circuit)
  const playback = usePlayback({
    count: rows.length,
    stepsOf: () => [],
    check: (k) => (rows[k].pass ? '' : L(rows[k].reason)),
    onSolve: () => solve({ steps: rules.reduce((n, r) => n + r.cases.length, 0) }),
    onTest: setRowIndex,
    board: circuit,
    kept: lastRun,
    onKeep: keepRun,
  })
  const run = playback.run
  const states = playback.states
  const verdict = run?.over ? { pass: playback.passed } : null
  const verdictText = !verdict ? null : verdict.pass
    ? tr('不多给，也不少给：每一份封好的证明打开时，都走进收得下它的那种情况，交出的正是它装着的东西。', 'No more, no less: every sealed proof, opened, goes into the case that takes it and hands over just what it holds.')
    : L(rows[run.results.length - 1].reason)

  // A card shows: the sealed proof its sentence, a Receive card the sentence it receives (picked on it), a frame how
  // many cases and its conclusion (picked) and itself written out as every rule is.
  const body = (node, at = 'card') => {
    if (node.type === IT) return null
    if (node.type === 'getThing') return <div className="lg-card"><span className="lg-taken">{tr('叫它', 'Called')} <b>{node.params.name}</b></span></div>
    if (node.type === 'get') {
      if (at === 'tile') return <div className="lg-card"><span className="lg-formula"><b>{L(words(node.params.name))}</b></span></div>
      return <div className="lg-card"><FormulaField label={T('收到', 'Receive')} value={node.params.name} onChange={(name) => setParam(node, 'name', name)} choices={choices} required /></div>
    }
    const rule = rules.find((r) => r.id === node.id)
    return (
      <div className="lg-card">
        {at !== 'tile' && <FormulaField label={T('情况', 'Cases')} value={String(node.params.ways ?? 0)} onChange={(ways) => setParam(node, 'ways', Number(ways))} choices={counts} required />}
        {at !== 'tile' && <FormulaField label={T('结论', 'Conclusion')} value={node.params.to ?? ANY} onChange={(to) => setParam(node, 'to', to)} choices={ends} required />}
        {rule && <code className="lg-rule">{ruleText(ruleOfCard(level, rule, (f) => f), text)}</code>}
      </div>
    )
  }

  const brief = <Brief game={game} level={entry} hint={level.hint} phone={phone} />
  // What a sealed proof holds, and what each rule does with it once opened.
  const holds = (r) => [...r.takes.map((x) => tr(`一样东西 ${x}`, `a thing ${x}`)), ...r.gives.map((s) => L(words(s)))].join(tr('、', ', ')) || tr('什么都没有', 'nothing')
  const did = (o, j) => {
    const who = rules.length > 1 ? tr(`规则 ${j + 1}：`, `Rule ${j + 1}: `) : ''
    if (o.took) return `${who}${tr(`直接得出${L(words(o.took))}`, `gives ${L(words(o.took))} as it is`)}`
    if (o.stuck) return `${who}${tr('卡住：没有一种情况收得下', 'stuck: no case takes it')}`
    return `${who}${tr(`走进情况 ${CASE[o.case]}`, `into case ${CASE[o.case]}`)}`
  }
  const table = (
    <div className="lg-strip">
      <div className="lg-scroll-x">
        <table className="lg-rows">
          <thead>
            <tr><th>{tr('检查', 'Check')}</th><th>{tr('盒子里', 'Inside')}</th><th>{tr('打开以后', 'Opened')}</th><th>{tr('结果', 'Result')}</th></tr>
          </thead>
          <tbody>
            {rows.map((r, k) => {
              const open = run && k < run.results.length
              return (
                <tr key={k} className={`${k === rowIndex ? 'is-on' : ''} ${states[k] ? `is-${states[k]}` : ''}`} onClick={() => setRowIndex(k)}>
                  <td>{r.kind === 'way' ? tr(`封好的证明 ${k + 1}`, `Sealed proof ${k + 1}`) : tr('用的人要推出任意一句 ?R', 'Its user wants any sentence ?R')}</td>
                  <td>{r.kind === 'way' ? (open ? tr(`引入规则 ${r.way + 1} 造的：${holds(r)}`, `made by intro rule ${r.way + 1}: ${holds(r)}`) : '？') : '—'}</td>
                  <td>{r.kind === 'way' ? (open ? r.opens.map(did).join(tr('；', '; ')) : '') : (open ? tr('每种造法都推得出 ?R 时', 'when every way in reaches ?R') : '')}</td>
                  <td>{open ? (r.pass ? (r.kind === 'way' ? tr('不多给', 'No more') : tr('不少给', 'No less')) : L(r.reason)) : ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {verdictText && <p className={`lg-verdict ${verdict.pass ? 'is-pass' : 'is-fail'}`}>{verdictText}</p>}
    </div>
  )
  const dock = <RunDock {...playback.dock({ go: tr('一份份打开', 'Open them one by one'), done: tr('不多给，不少给', 'No more, no less') })} />

  const items = [GET, ...((level.tray ?? []).includes('thing') ? [GET_THING] : []), FRAME]
  // On a phone a card goes into the slot picked, inside a case or on the board; a frame beside the last one.
  const spot = () => spotIn(circuit, null)
  if (phone) return <PhoneCards {...{ circuit, parts, items, addPart, brief, dock, change, onClear, table, body, spot }} scope={level.id} />

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
              height={110}
              body={body}
              onTarget={setTarget}
              cardClass={() => 'lg-node'}
              wireState={() => 'live'}
              emptyNote={{ zh: '在消去规则框上选有几种情况，再把「收到」卡放进每一种情况里。', en: 'Pick on the elimination rule frame how many cases it has, then put Receive cards into each case.' }}
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
