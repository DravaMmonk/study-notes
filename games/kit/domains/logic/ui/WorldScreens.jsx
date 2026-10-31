import { useMemo } from 'react'
import { Brief, CircuitLayout, RunDock, TaskCard, TestStatus, TestTabs, useBoardCases } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { CanvasEditor, SlotBoard } from '../../../circuit/index.js'
import { parse } from '../formula.js'
import { say } from '../notation.js'
import { builtWorld, claimBoard, claimCards } from '../fol.js'
import { DECL, listText, runIso, waysIn, wayRule, wayText } from '../iso.js'
import { isoPartsFor } from './IsoScreen.jsx'

// Worlds in 《证明完毕》's first-order levels: a world in words (WorldText, for the translation and query screens in
// FormulaScreen.jsx), and the counterexample level (ModelScreen). That one is the shared play of finding the fault in a
// board (../../../shell/useBoardCases.js 'audit'), as a declaration's is: above, someone's wrong declaration on the
// declaration board's own cards (fol.js claimBoard), locked, its intro rule the inference; below, the world the player builds against it (how many things, which thing each name
// stands for, what holds of each; a relation of two as a grid). A run goes through the cards, premises first, showing
// each card's truth in the world, and stops at the first that is not as a counterexample needs it.

const T = (zh, en) => ({ zh, en })
const MARKS = ['①', '②', '③', '④']

/** What a thing is called: a named world's thing by its words, a built world's by its mark. */
export const thingName = (notation, world) => (k) => (world ? L(notation.words?.[world.things[k]] ?? { zh: world.things[k], en: world.things[k] }) : MARKS[k])

/** A world in words: how many things, and every atom true in it, as sentences. */
export function WorldText({ model, notation, preds, world = null, spell = false }) {
  const name = thingName(notation, world)
  const sayAtom = (p, args) => (notation.words?.[p] ? L(notation.words[p]) : `${p}({0})`).replace(/\{(\d)\}/g, (_, k) => name(args[Number(k)]))
  const atoms = preds.flatMap(([p, n]) => {
    const ext = model.preds[p]
    if (n === 0) return ext ? [L(say({ op: 'atom', pred: p, args: [] }, notation))] : []
    return [...(ext ?? [])].map((key) => sayAtom(p, key.split(',').map(Number)))
  })
  // A countermodel spells out what does not hold too: what is left out is easy to miss, and it is often the point.
  const tuples = (n) => (n === 0 ? [[]] : tuples(n - 1).flatMap((t) => model.domain.map((d) => [...t, d])))
  const missing = spell ? preds.filter(([p]) => p in model.preds).flatMap(([p, n]) => (n === 0
    ? (model.preds[p] ? [] : [L(say({ op: 'atom', pred: p, args: [] }, notation))])
    : tuples(n).filter((args) => !model.preds[p]?.has(args.join(','))).map((args) => sayAtom(p, args)))) : []
  // A named world's things are their own names: only other names need saying.
  const consts = Object.entries(model.fns).filter(([c, m]) => m.has('') && !world?.things.includes(c)).map(([c, m]) => `${L(notation.words?.[c] ?? T(c, c))} = ${name(m.get(''))}`)
  return (
    <div className="fo-world">
      <p>{tr(`这个世界有 ${model.domain.length} 样东西：`, `This world has ${model.domain.length} thing${model.domain.length === 1 ? '' : 's'}: `)}<b>{model.domain.map(name).join(tr('、', ', '))}</b></p>
      {consts.length > 0 && <p>{consts.join(tr('；', '; '))}</p>}
      <p>{atoms.length ? atoms.join(tr('；', '; ')) : tr('什么都不成立。', 'Nothing holds.')}</p>
      {missing.length > 0 && atoms.length > 0 && <p className="fo-not">{tr('不成立：', 'False: ')}{missing.join(tr('；', '; '))}</p>}
    </div>
  )
}

export function ModelScreen({ game, level: entry, saved, save, solve, lastRun, keepRun, phone }) {
  const level = useMemo(() => ({ ...entry.source, play: 'audit', boards: [{ board: claimBoard(entry.source.given) }] }), [entry.source])
  // The level as a declaration (iso.js): it declares its conclusion, its things the level's names.
  const declared = useMemo(() => ({ ...level, target: level.goal, things: level.vocab.names, declare: say(parse(level.goal, { consts: level.vocab.names }), level.notation) }), [level])
  const words = (sentence) => say(parse(sentence, { consts: level.vocab.names }), level.notation)
  const parts = useMemo(() => isoPartsFor(declared, words), [declared])
  const preds = level.vocab.preds
  const max = level.maxSize ?? 3
  const why = (card) => (card.premise
    ? T(`前提「${L(words(card.f))}」在这个世界里不成立。`, `The premise “${L(words(card.f))}” does not hold in this world.`)
    : T(`结论「${L(words(card.f))}」在这个世界里也成立，这个世界不是反例。`, `The conclusion “${L(words(card.f))}” holds in this world too: it is no counterexample.`))
  const cases = useBoardCases({
    level,
    saved,
    save,
    empty: { size: Math.min(2, max), preds: {}, consts: {} },
    judge: () => '',
    // One step a card, stopping at the first that is not as a counterexample needs it.
    stepsOf: (_, world) => {
      const steps = []
      for (const card of claimCards(level, world)) {
        steps.push(card.right ? {} : { failed: L(why(card)) })
        if (!card.right) break
      }
      return steps
    },
    onSolve: () => solve(null),
    lastRun,
    keepRun,
  })
  const world = cases.work
  const update = cases.setWork
  const model = useMemo(() => builtWorld(world, level.vocab), [world, level])
  const cards = useMemo(() => claimCards(level, world), [level, world])
  const { playback } = cases
  const run = playback.run
  const shown = playback.shown(0)
  const reached = shown.list.length
  const step = shown.at >= 0 ? cards[shown.at]?.id : null
  const failed = run?.over && !playback.passed ? run.results.at(-1)?.reason : null

  const toggle = (p, key) => {
    const has = (world.preds[p] ?? []).includes(key)
    update({ ...world, preds: { ...world.preds, [p]: has ? world.preds[p].filter((k) => k !== key) : [...(world.preds[p] ?? []), key] } })
  }
  const name = (k) => MARKS[k]
  const wordOf = (p, args) => (level.notation.words?.[p] ? L(level.notation.words[p]).replace(/\{(\d)\}/g, (_, k) => args[Number(k)]) : `${p}(${args.join(', ')})`)

  // A card shows its sentence, and its truth once the run reaches it.
  const truth = (id) => {
    const k = cards.findIndex((c) => c.id === id)
    if (k < 0 || k >= reached) return null
    return <span className={cards[k].right ? 'lg-right' : 'lg-wrong'}>{cards[k].value ? tr('真', 'True') : tr('假', 'False')}</span>
  }
  // A premise card its sentence, Join what it has made, the declared card its intro rule; a premise or the declared
  // sentence its truth too, once the run reaches it.
  const text = (f) => L(say(f, level.notation))
  const values = useMemo(() => runIso(declared, cases.board, { given: [] }).values, [declared, cases.board])
  const body = (node) => {
    if (node.type === 'hyp') return <div className="lg-card"><span className="lg-pick">{L(words(node.params.name))}</span>{truth(node.id)}</div>
    if (node.type === 'join') return <div className="lg-card"><code className="lg-made">{listText(values.get(node.id), declared, text)}</code></div>
    if (node.id !== DECL) return null
    const way = waysIn(cases.board)[0]
    return <div className="lg-card"><code className="lg-made">{tr('引入1：', 'Intro 1: ')}{wayText(wayRule(way, declared), text)}</code>{truth(DECL)}</div>
  }
  const stepClass = (node) => (node.id === step ? (cards.find((c) => c.id === step)?.right ? 'is-step' : 'is-step is-step-fail') : '')

  const builder = (
    <section className="fo-build">
      <div className="fo-size" role="group" aria-label={tr('东西的数目', 'Number of things')}>
        <span>{tr('这个世界有', 'This world has')}</span>
        {Array.from({ length: max }, (_, k) => k + 1).map((n) => <button key={n} type="button" aria-pressed={world.size === n} onClick={() => update({ ...world, size: n })}>{n}</button>)}
        <span>{tr('样东西', 'things')}</span>
      </div>
      {level.vocab.consts.map((c) => (
        <div key={c} className="fo-const">
          <span>{L(level.notation.words?.[c] ?? T(c, c))} =</span>
          {model.domain.map((k) => <button key={k} type="button" aria-pressed={model.fns[c].get('') === k} onClick={() => update({ ...world, consts: { ...world.consts, [c]: k } })}>{name(k)}</button>)}
        </div>
      ))}
      {preds.map(([p, n]) => (
        <div key={p} className="fo-pred">
          {n === 0 && <button type="button" aria-pressed={model.preds[p]} onClick={() => update({ ...world, preds: { ...world.preds, [p]: !world.preds[p] } })}>{L(say({ op: 'atom', pred: p, args: [] }, level.notation))}</button>}
          {n === 1 && (
            <>
              <span className="fo-pred-name">{wordOf(p, ['…'])}</span>
              <span className="fo-cells">{model.domain.map((k) => <button key={k} type="button" aria-pressed={model.preds[p].has(String(k))} onClick={() => toggle(p, String(k))}>{name(k)}</button>)}</span>
            </>
          )}
          {n === 2 && (
            <>
              <span className="fo-pred-name">{wordOf(p, ['…', '…'])}</span>
              <table className="fo-grid"><tbody>
                {model.domain.map((a) => (
                  <tr key={a}>{model.domain.map((b) => <td key={b}><button type="button" aria-pressed={model.preds[p].has(`${a},${b}`)} onClick={() => toggle(p, `${a},${b}`)} title={wordOf(p, [name(a), name(b)])}>{name(a)}{name(b)}</button></td>)}</tr>
                ))}
              </tbody></table>
            </>
          )}
        </div>
      ))}
    </section>
  )
  const verdict = playback.passed ? tr('前提都成立，结论不成立：这个世界是反例。', 'Every premise holds and the conclusion fails: this world is a counterexample.') : failed
  const panel = (
    <div className="lg-strip is-tables">
      {builder}
      {verdict && <p className={`lg-verdict ${playback.passed ? 'is-pass' : 'is-fail'}`}>{verdict}</p>}
    </div>
  )
  const dock = <RunDock {...playback.dock({ go: tr('运行', 'Run'), done: tr('找到反例', 'Counterexample found') })} />
  const tabs = (onPhone) => <TestTabs tests={cases.tests} states={playback.states} index={cases.at} onSelect={cases.select} phone={onPhone} />
  const brief = <Brief game={game} level={entry} hint={level.hint} phone={phone} />

  if (phone) {
    return (
      <div className="level-phone is-split lg-phone fo-level">
        {tabs(true)}
        <div className="lg-scroll">
          <TaskCard>{brief}</TaskCard>
          <SlotBoard fixed dense graph={cases.board} parts={parts} nameOf={(n) => L(parts.label(n))} thumb={body} sinkBody={body} nodeClass={stepClass} onNode={() => {}} onSlot={() => {}} onPort={() => {}} />
          {panel}
        </div>
        <footer className="run-foot">{dock}</footer>
      </div>
    )
  }
  return (
    <CircuitLayout
      className="lg-level fo-level"
      brief={brief}
      canvas={
        <div className="lg-stage">
          <div className="lg-board">
            <CanvasEditor readOnly key={level.id} scope={level.id} graph={cases.board} onChange={() => {}} parts={parts} width={220} height={120} body={body} cardClass={(n) => `lg-node ${stepClass(n)}`} />
          </div>
        </div>
      }
      tests={tabs(false)}
      status={<TestStatus states={playback.states} />}
      outputsTitle={tr('世界', 'World')}
      outputs={panel}
      actions={<footer className="run-foot">{dock}</footer>}
    />
  )
}
