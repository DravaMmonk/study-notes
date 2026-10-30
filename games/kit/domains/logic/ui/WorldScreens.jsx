import { useMemo, useState } from 'react'
import { Check, X } from 'lucide-react'
import { Brief, PhonePage, RunDock, Workbench, useKeptVerdict } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { parse } from '../formula.js'
import { holds } from '../models.js'
import { say } from '../notation.js'
import { builtWorld } from '../fol.js'

// The screens of first-order levels (《证明完毕》) that work on worlds rather than boards (translations and queries,
// built from chips, are FormulaScreen.jsx):
//   model      build a world (how many things, what holds of each) where the level's sentences are true or false as
//              asked
//   prolog     write rules (∀… conditions → conclusion) that, with each world's facts, answer the level's queries as its
//              own rules do; solved depth first in the order written (tactics.js), so a rule that asks the wrong thing
//              first loops
// A rule is typed with the level's vocabulary as buttons (a predicate in words, a name, the quantifiers and the
// connectives) and read back in words as it is typed.

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
  const consts = level.vocab.consts
  const wants = useMemo(() => level.want.map((w) => ({ ...w, formula: parse(w.f, { consts: level.vocab.names }) })), [level])
  const preds = level.vocab.preds
  const max = level.maxSize ?? 3
  const [world, setWorld] = useState(() => saved?.size ? saved : { size: Math.min(2, max), preds: {}, consts: {} })
  const model = useMemo(() => builtWorld(world, level.vocab), [world, level])
  const values = wants.map((w) => holds(w.formula, model))
  // Checked: whether the world fits; null before a check.
  const [checked, setChecked] = useKeptVerdict({ lastRun, keepRun }, () => values.every((v, k) => v === wants[k].value))
  const update = (next) => {
    setWorld(next)
    save(next)
    setChecked(null)
  }
  const toggle = (p, key) => {
    const has = (world.preds[p] ?? []).includes(key)
    update({ ...world, preds: { ...world.preds, [p]: has ? world.preds[p].filter((k) => k !== key) : [...(world.preds[p] ?? []), key] } })
  }
  const check = () => {
    const pass = values.every((v, k) => v === wants[k].value)
    setChecked(pass)
    if (pass) solve(null)
  }
  const name = (k) => MARKS[k]
  const wordOf = (p, args) => (level.notation.words?.[p] ? L(level.notation.words[p]).replace(/\{(\d)\}/g, (_, k) => args[Number(k)]) : `${p}(${args.join(', ')})`)
  const stage = (
    <div className="fo-stage">
      <section className="fo-build">
        <div className="fo-size" role="group" aria-label={tr('东西的数目', 'Number of things')}>
          <span>{tr('这个世界有', 'This world has')}</span>
          {Array.from({ length: max }, (_, k) => k + 1).map((n) => <button key={n} type="button" aria-pressed={world.size === n} onClick={() => update({ ...world, size: n })}>{n}</button>)}
          <span>{tr('样东西', 'things')}</span>
        </div>
        {consts.map((c) => (
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
      <section className="fo-wants">
        {wants.map((w, k) => (
          <p key={k} className={`fo-want ${values[k] === w.value ? 'is-pass' : 'is-fail'}`}>
            {values[k] === w.value ? <Check size={14} /> : <X size={14} />}
            <b>{L(say(w.formula, level.notation))}</b>
            <span>{tr(`应为${w.value ? '真' : '假'}，当前为${values[k] ? '真' : '假'}`, `should be ${w.value ? 'true' : 'false'}, is ${values[k] ? 'true' : 'false'}`)}</span>
          </p>
        ))}
        {checked !== null && <p className={`lg-verdict ${checked ? 'is-pass' : 'is-fail'}`}>{checked ? tr('这个结构满足要求。', 'This structure meets the requirements.') : tr('部分命题的真值不符合要求，已标出。', 'Some propositions have the wrong truth value and are marked.')}</p>}
      </section>
      <footer className="run-foot"><RunDock go={{ label: checked ? tr('完成', 'Done') : tr('检查', 'Check'), pass: Boolean(checked), onClick: check }} /></footer>
    </div>
  )
  const brief = <Brief game={game} level={entry} hint={level.hint} phone={phone} />
  if (phone) return <PhonePage brief={brief} className="fo-level">{stage}</PhonePage>
  return <Workbench className="fo-level" brief={brief} stage={stage} scroll />
}

