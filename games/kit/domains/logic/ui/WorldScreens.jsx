import { useMemo, useState } from 'react'
import { Brief, PhonePage, RunDock, Workbench, usePlayback } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { Strip } from '../../../strip/index.js'
import { parse } from '../formula.js'
import { say } from '../notation.js'
import { builtWorld, claimIn, lemmaBoard, lemmaCard } from '../fol.js'
import { CanvasEditor, SlotBoard } from '../../../circuit/index.js'
import { DECL, listText, runIso } from '../iso.js'
import { isoPartsFor } from './IsoScreen.jsx'
import { ruleText } from '../schematic.js'
import { fixedLine } from './FormulaScreen.jsx'

// Worlds in 《证明完毕》's first-order levels: a world in words (WorldText, for the translation and query screens in
// FormulaScreen.jsx), and the counterexample level (ModelScreen): on top, as a translation level has it, the
// sentence or reasoning in words (`say`); under it, what someone wrote for it, wrong (fol.js claimIn: a lemma that does
// not follow, or a translation unlike what the words mean), on a strip that cannot be changed; below, the world the player builds against it (how many things, which thing each name stands
// for, what holds of each; a relation of two as a grid). A run goes through the sentences, marking each one's truth in
// the world, and passes when the world is a counterexample.

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
  const level = entry.source
  const { notation } = level
  const read = (f) => parse(f, { consts: level.vocab.names })
  const preds = level.vocab.preds
  const max = level.maxSize ?? 3
  const [world, setWorld] = useState(() => saved?.work ?? { size: Math.min(2, max), preds: {}, consts: {} })
  const update = (next) => {
    setWorld(next)
    save({ work: next })
  }
  const model = useMemo(() => builtWorld(world, level.vocab), [world, level])
  const found = useMemo(() => claimIn(level, world), [level, world])
  const truth = (v) => (v ? tr('真', 'true') : tr('假', 'false'))
  const words = (f) => L(say(read(f), notation))
  // A step a sentence: a lemma's premises then its goal, stopping at the first that is not as a counterexample needs
  // it; a translation, then whether it differs from what was meant.
  const why = (row) => (level.meant
    ? tr(`在这个世界里，译文为${truth(row.value)}，原意也为${truth(found.meant)}：两者一致。`, `In this world the translation is ${truth(row.value)}, and so is what was meant: they agree.`)
    : row.premise
      ? tr(`前提「${words(row.f)}」在这个世界里不成立。`, `The premise “${words(row.f)}” does not hold in this world.`)
      : tr(`结论「${words(row.f)}」在这个世界里也成立，这个世界不是反例。`, `The goal “${words(row.f)}” holds in this world too: it is no counterexample.`))
  const playback = usePlayback({
    count: 1,
    stepsOf: () => {
      const steps = []
      for (const row of found.rows) {
        steps.push(row.right ? {} : { failed: why(row) })
        if (!row.right) break
      }
      return steps
    },
    check: () => '',
    onSolve: () => solve(null),
    board: world,
    kept: lastRun,
    onKeep: keepRun,
  })
  const run = playback.run
  const shown = playback.shown(0)
  const reached = shown.list.length
  const failed = run?.over && !playback.passed ? run.results.at(-1)?.reason : null

  const toggle = (p, key) => {
    const has = (world.preds[p] ?? []).includes(key)
    update({ ...world, preds: { ...world.preds, [p]: has ? world.preds[p].filter((k) => k !== key) : [...(world.preds[p] ?? []), key] } })
  }
  const name = (k) => MARKS[k]
  const wordOf = (p, args) => (level.notation.words?.[p] ? L(level.notation.words[p]).replace(/\{(\d)\}/g, (_, k) => args[Number(k)]) : `${p}(${args.join(', ')})`)

  // Each sentence marked with its truth as the run reaches it (a translation, against what was meant).
  const mark = (k) => {
    if (k >= reached) return null
    const row = found.rows[k]
    const text = level.meant ? tr(`译文为${truth(row.value)}，原意为${truth(found.meant)}`, `Translated: ${truth(row.value)}; meant: ${truth(found.meant)}`) : truth(row.value)
    return <span className={row.right ? 'lg-right' : 'lg-wrong'}>{text}</span>
  }
  // A translation, on a strip that cannot be changed.
  const strip = () => (
    <section className="fo-claim">
      {found.rows.map((row, k) => (
        <div key={k} className={`fo-claim-row ${shown.at === k ? 'is-step' : ''}`}>
          <Strip line={fixedLine(read(row.f), notation, `s${k}`)} label={T('句子', 'sentence')} onSlot={() => {}} />
          {mark(k)}
        </div>
      ))}
    </section>
  )
  // A lemma, on the rule board (the cards a declaration is written with: they show a rule's shape): premise cards joined into
  // the lemma's card, which writes the rule out; locked.
  const board = useMemo(() => (level.meant ? null : lemmaBoard(level.given)), [level])
  const lemma = useMemo(() => ({ ...level, target: level.goal, things: level.vocab.names, declare: T('引理', 'Lemma') }), [level])
  const parts = useMemo(() => {
    if (!board) return null
    const iso = isoPartsFor(lemma, (f) => say(read(f), notation))
    return { ...iso, inputs: (node) => (node.id === DECL ? ['c1'] : node.type === 'hyp' ? [] : iso.inputs(node)), label: (node) => (node.id === DECL ? T('引理', 'Lemma') : iso.label(node)), portLabel: (node) => (node.id === DECL ? T('前提', 'Premises') : '') }
  }, [board])
  const values = useMemo(() => (board ? runIso(lemma, board, { given: [] }).values : null), [board])
  const rowOf = (id) => found.rows.findIndex((row, k) => lemmaCard(row, k) === id)
  const text = (f) => L(say(f, notation))
  const body = (node) => {
    if (node.type === 'join') return <div className="lg-card"><code className="lg-made">{listText(values.get(node.id), lemma, text)}</code></div>
    if (node.type !== 'hyp' && node.id !== DECL) return null
    const k = rowOf(node.id)
    const rule = { premises: level.given.map((f) => ({ fixes: [], hyps: [], show: read(f) })), conclusion: read(level.goal) }
    return <div className="lg-card">{node.id === DECL ? <code className="lg-made">{ruleText(rule, text)}</code> : <span className="lg-pick">{words(node.params.name)}</span>}{mark(k)}</div>
  }
  const stepClass = (node) => (shown.at >= 0 && rowOf(node.id) === shown.at ? 'is-step' : '')
  const claim = level.meant ? strip() : phone
    ? <SlotBoard fixed dense graph={board} parts={parts} nameOf={(n) => L(parts.label(n))} thumb={body} sinkBody={body} nodeClass={stepClass} onNode={() => {}} onSlot={() => {}} onPort={() => {}} />
    : <div className="fo-rule-board"><CanvasEditor readOnly scope={level.id} graph={board} onChange={() => {}} parts={parts} width={220} height={120} body={body} cardClass={(n) => `lg-node ${stepClass(n)}`} /></div>

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
  const verdict = playback.passed
    ? (level.meant ? tr('在这个世界里，译文和原意真假不同：这个世界是反例。', 'In this world the translation and what was meant differ: this world is a counterexample.') : tr('前提都成立，结论不成立：这个世界是反例。', 'Every premise holds and the goal fails: this world is a counterexample.'))
    : failed
  const stage = (
    <div className="fo-stage">
      {level.say && <p className="fo-say fo-prompt" dangerouslySetInnerHTML={{ __html: String(L(level.say)) }} />}
      {claim}
      {builder}
      {verdict && <p className={`lg-verdict ${playback.passed ? 'is-pass' : 'is-fail'}`}>{verdict}</p>}
      <footer className="run-foot"><RunDock {...playback.dock({ go: tr('运行', 'Run'), done: tr('找到反例', 'Counterexample found') })} /></footer>
    </div>
  )
  const brief = <Brief game={game} level={entry} hint={level.hint} phone={phone} />
  if (phone) return <PhonePage brief={brief} className="fo-level">{stage}</PhonePage>
  return <Workbench className="fo-level" brief={brief} stage={stage} scroll />
}
