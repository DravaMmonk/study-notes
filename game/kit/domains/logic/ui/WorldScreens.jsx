import { useMemo } from 'react'
import { Brief, CircuitLayout, RunDock, TaskCard, TestStatus, TestTabs, useBoardCases } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { CanvasEditor, SlotBoard } from '../../../circuit/index.js'
import { freeVars, parse } from '../formula.js'
import { say } from '../notation.js'
import { builtWorld, declaredIn } from '../fol.js'
import { holds } from '../models.js'
import { DECL, listText, runIso, waysIn, wayRule, wayText } from '../iso.js'
import { isoPartsFor } from './IsoScreen.jsx'

// Worlds in 《证明完毕》's first-order levels: a world in words (WorldText, for the translation and query screens in
// FormulaScreen.jsx), and the counterexample level (ModelScreen). That one is the shared play of finding the fault in a
// board (../../../shell/useBoardCases.js 'audit'), as a declaration's is: above, someone's wrong declaration of a
// first-order sentence on the declaration board (fol.js declaredIn), locked; below, the world the player builds against it (how many things, which thing each name
// stands for, what holds of each; a relation of two as a grid). A run goes through the intro rules, showing whether
// each makes the sentence in the world, then sets the declaration against what the sentence says: the world is a
// counterexample when they differ.

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
  const level = useMemo(() => ({ ...entry.source, play: 'audit', boards: [{ board: entry.source.board }] }), [entry.source])
  const words = (sentence) => say(parse(sentence, { consts: level.vocab.names }), level.notation)
  // The level as a declaration (iso.js): its things are the level's names.
  const declared = useMemo(() => ({ ...level, things: level.vocab.names, declare: words(level.target) }), [level])
  const parts = useMemo(() => isoPartsFor(declared, words), [declared])
  const ways = useMemo(() => waysIn(level.board), [level])
  const preds = level.vocab.preds
  const max = level.maxSize ?? 3
  const truth = (v) => (v ? tr('真', 'true') : tr('假', 'false'))
  const cases = useBoardCases({
    level,
    saved,
    save,
    empty: { size: Math.min(2, max), preds: {}, consts: {} },
    judge: () => '',
    // A step for each intro rule, whether it makes the sentence in the world; then the declaration against what the
    // sentence says, the run failing where they agree.
    stepsOf: (_, world) => {
      const d = declaredIn(level, world)
      const same = d.declared === d.meant
      return [...ways.map(() => ({})), same ? { failed: tr(`在这个世界里，按声明「${L(words(level.target))}」为${truth(d.declared)}，它本来也为${truth(d.meant)}：声明和需求一致。`, `In this world the declaration makes “${L(words(level.target))}” ${truth(d.declared)}, and it is ${truth(d.meant)} indeed: the declaration meets the requirement here.`) } : {}]
    },
    onSolve: () => solve(null),
    lastRun,
    keepRun,
  })
  const world = cases.work
  const update = cases.setWork
  const model = useMemo(() => builtWorld(world, level.vocab), [world, level])
  const found = useMemo(() => declaredIn(level, world), [level, world])
  const { playback } = cases
  const run = playback.run
  const reached = playback.shown(0).list.length
  const failed = run?.over && !playback.passed ? run.results.at(-1)?.reason : null

  const toggle = (p, key) => {
    const has = (world.preds[p] ?? []).includes(key)
    update({ ...world, preds: { ...world.preds, [p]: has ? world.preds[p].filter((k) => k !== key) : [...(world.preds[p] ?? []), key] } })
  }
  const name = (k) => MARKS[k]
  const wordOf = (p, args) => (level.notation.words?.[p] ? L(level.notation.words[p]).replace(/\{(\d)\}/g, (_, k) => args[Number(k)]) : `${p}(${args.join(', ')})`)

  // A premise card its sentence (its truth too, once a run starts, when it names no thing a rule takes), Join what it
  // has made, the declared card its intro rules, each marked as the run reaches it, and at the end the declaration
  // against what the sentence says.
  const text = (f) => L(say(f, level.notation))
  const values = useMemo(() => runIso(declared, level.board, { given: [] }).values, [declared])
  const mark = (v) => <span className="lg-mark">{v ? tr('成立', 'holds') : tr('不成立', 'fails')}</span>
  const body = (node) => {
    if (node.type === 'hyp') {
      const f = parse(node.params.name, { consts: level.vocab.names })
      return <div className="lg-card"><span className="lg-pick">{text(f)}</span>{reached > 0 && !freeVars(f).size && mark(holds(f, model))}</div>
    }
    if (node.type === 'join' || node.type === 'thing') return <div className="lg-card">{node.type === 'thing' ? <span className="lg-taken">{tr('任取的是', 'Taken:')} <b>{node.params.name}</b></span> : <code className="lg-made">{listText(values.get(node.id), declared, text)}</code>}</div>
    if (node.id !== DECL) return null
    const end = reached > ways.length
    return (
      <div className="lg-card">
        {ways.map((way, k) => <code key={k} className="lg-made">{tr(`引入${k + 1}：`, `Intro ${k + 1}: `)}{wayText(wayRule(way, declared), text)} {k < reached && mark(found.ways[k])}</code>)}
        {!ways.length && <span className="lg-mark">{tr('没有引入规则', 'No intro rule')}</span>}
        {end && <span className={found.declared !== found.meant ? 'lg-right' : 'lg-wrong'}>{tr(`按声明为${truth(found.declared)}，本意为${truth(found.meant)}`, `Declared ${truth(found.declared)}, meant ${truth(found.meant)}`)}</span>}
      </div>
    )
  }
  const stepClass = (node) => (run && !run.over && node.id === DECL ? 'is-step' : '')

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
  const verdict = playback.passed ? tr(`按声明「${L(words(level.target))}」为${truth(found.declared)}，它本来却为${truth(found.meant)}：这个世界是反例。`, `The declaration makes “${L(words(level.target))}” ${truth(found.declared)}, yet it is ${truth(found.meant)}: this world is a counterexample.`) : failed
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
