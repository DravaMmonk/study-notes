import { useMemo, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import { Brief, PhonePage, RunDock, Workbench } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { parse } from '../formula.js'
import { holds } from '../models.js'
import { say } from '../notation.js'
import { builtWorld, structureOf } from '../fol.js'
import { answersFor, factsOf, hornOf } from '../tactics.js'

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
const CONNECTIVES = ['¬', '∧', '∨', '→', '↔', '(', ')']

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
      {missing.length > 0 && atoms.length > 0 && <p className="fo-not">{tr('不成立的：', 'Not so: ')}{missing.join(tr('；', '; '))}</p>}
    </div>
  )
}

/** The level's vocabulary as buttons that type into the input last used. */
function Vocab({ level, onInsert }) {
  const { notation } = level
  const { preds, consts } = level.vocab
  const vars = level.vars ?? ['x', 'y']
  const tokens = [
    ...preds.map(([p, n]) => ({ label: notation.words?.[p] ? L(notation.words[p]).replace(/\{(\d)\}/g, (_, k) => vars[Number(k)] ?? 'z') : p, text: `${p}(${vars.slice(0, n).join(', ')})` })),
    ...consts.map((c) => ({ label: L(notation.words?.[c] ?? T(c, c)), text: c })),
    ...(level.quantifiers ?? ['∀', '∃']).flatMap((q) => vars.map((v) => ({ label: `${q}${v}.`, text: `${q}${v}. ` }))),
    ...vars.map((v) => ({ label: v, text: v })),
    ...CONNECTIVES.map((c) => ({ label: c, text: ` ${c} `.replace('( ', '(').replace(' )', ')') })),
  ]
  return (
    <div className="fo-vocab" onPointerDown={(e) => e.preventDefault()}>
      {tokens.map((t) => <button key={t.text + t.label} type="button" onClick={() => onInsert(t.text)}>{t.label}</button>)}
    </div>
  )
}

/** One formula to write: the sentence asked for, the input, and what it reads as. */
function FormulaInput({ item, value, onChange, onFocus, inputRef, level, verdict }) {
  const parsed = useMemo(() => {
    if (!value.trim()) return null
    try { return { f: parse(value, { consts: level.vocab.names }) } } catch { return { error: true } }
  }, [value, level])
  return (
    <section className={`fo-item ${verdict ? (verdict.pass ? 'is-pass' : 'is-fail') : ''}`}>
      <p className="fo-say">{verdict && (verdict.pass ? <Check size={14} /> : <X size={14} />)}<span dangerouslySetInnerHTML={{ __html: String(L(item.say)) }} /></p>
      <input ref={inputRef} className="fo-input" value={value} spellCheck={false} autoCapitalize="off" autoComplete="off" onFocus={onFocus} onChange={(e) => onChange(e.target.value)} placeholder={tr('用下面的按钮写，或直接输入', 'Use the buttons below, or type')} />
      <p className="fo-read">{parsed?.f ? <>{tr('读作：', 'Reads: ')}<b>{L(say(parsed.f, level.notation))}</b></> : parsed?.error ? <span className="lg-error">{tr('还不是一句完整的公式', 'Not a whole formula yet')}</span> : null}</p>
      {verdict && !verdict.pass && verdict.body}
    </section>
  )
}

/** Prolog levels: one input per rule; the rules are judged together against every world's queries. */
export function RulesScreen({ game, level: entry, saved, save, solve, phone }) {
  const level = entry.source
  const [texts, setTexts] = useState(() => level.items.map((_, k) => saved?.texts?.[k] ?? ''))
  const [verdicts, setVerdicts] = useState(null)
  const refs = useRef([])
  const [focus, setFocus] = useState(0)
  const preds = level.vocab.preds
  const change = (k, v) => {
    const next = texts.map((t, i) => (i === k ? v : t))
    setTexts(next)
    save({ texts: next })
    setVerdicts(null)
  }
  const insert = (token) => {
    const el = refs.current[focus]
    const [a, b] = el ? [el.selectionStart, el.selectionEnd] : [texts[focus].length, texts[focus].length]
    const v = texts[focus].slice(0, a) + token + texts[focus].slice(b)
    change(focus, v)
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(a + token.length, a + token.length) })
  }
  // Rules are judged together: each must be a rule, and together they must answer every query in every world.
  const judgeRules = () => {
    const rules = []
    for (const [k, text] of texts.entries()) {
      let f
      try { f = parse(text, { consts: level.vocab.names }) } catch { return level.items.map((_, i) => (i === k ? { pass: false, body: <p className="lg-error">{tr('还不是一句完整的公式。', 'Not a whole formula yet.')}</p> } : null)) }
      const rule = hornOf(f)
      if (!rule) return level.items.map((_, i) => (i === k ? { pass: false, body: <p className="lg-error">{tr('规则要写成「∀x. … 条件 ∧ … → 结论」，结论是一个谓词。', 'A rule must read “∀x. … condition ∧ … → conclusion”, its conclusion one predicate.')}</p> } : null))
      rules.push(rule)
    }
    const reference = level.items.map((item) => hornOf(parse(item.target, { consts: level.vocab.names })))
    for (const world of level.worlds) {
      const facts = factsOf(world)
      for (const q of level.queries) {
        const query = parse(q, { consts: level.vocab.names })
        const got = answersFor(query, [...facts, ...rules])
        const want = answersFor(query, [...facts, ...reference])
        const fault = got.loop
          ? tr(`问「${L(say(query, level.notation))}」时绕起了圈：规则一直在问同一个问题，停不下来。`, `Asking “${L(say(query, level.notation))}” goes round in circles: the rules keep asking the same question and never stop.`)
          : got.join(';') !== want.join(';') ? tr(`问「${L(say(query, level.notation))}」，答案不对。`, `Asking “${L(say(query, level.notation))}” gets the wrong answer.`) : null
        if (fault) return level.items.map(() => ({ pass: false, body: <div className="fo-why"><p>{L(world.title)}{tr('：', ': ')}{fault}</p></div> }))
      }
    }
    return level.items.map(() => ({ pass: true }))
  }
  const check = () => {
    const vs = judgeRules()
    setVerdicts(vs)
    if (vs.every((v) => v?.pass)) solve(null)
  }
  const passed = verdicts?.every((v) => v?.pass)
  const stage = (
    <div className="fo-stage">
      <div className="fo-worlds">
        {level.worlds.map((world, k) => (
          <details key={k} open={k === 0}>
            <summary>{L(world.title)}</summary>
            <WorldText model={structureOf(world, level.items.map((i) => parse(i.target, { consts: level.vocab.names })))} notation={level.notation} preds={preds} world={world} />
          </details>
        ))}
      </div>
      {level.items.map((item, k) => (
        <FormulaInput key={k} item={item} value={texts[k]} onChange={(v) => change(k, v)} onFocus={() => setFocus(k)} inputRef={(el) => { refs.current[k] = el }} level={level} verdict={verdicts?.[k]} />
      ))}
      <Vocab level={level} onInsert={insert} />
      <footer className="run-foot"><RunDock go={{ label: passed ? tr('全对', 'All correct') : tr('检查', 'Check'), pass: Boolean(passed), onClick: check }} /></footer>
    </div>
  )
  const brief = <Brief game={game} level={entry} hint={level.hint} phone={phone} />
  if (phone) return <PhonePage brief={brief} className="fo-level">{stage}</PhonePage>
  return <Workbench className="fo-level" brief={brief} stage={stage} scroll />
}

/** Model levels: build a world where each sentence is true or false as asked. */
export function ModelScreen({ game, level: entry, saved, save, solve, phone }) {
  const level = entry.source
  const consts = level.vocab.consts
  const wants = useMemo(() => level.want.map((w) => ({ ...w, formula: parse(w.f, { consts: level.vocab.names }) })), [level])
  const preds = level.vocab.preds
  const max = level.maxSize ?? 3
  const [world, setWorld] = useState(() => saved?.size ? saved : { size: Math.min(2, max), preds: {}, consts: {} })
  const [checked, setChecked] = useState(null)
  const update = (next) => {
    setWorld(next)
    save(next)
    setChecked(null)
  }
  const model = useMemo(() => builtWorld(world, level.vocab), [world, level])
  const values = wants.map((w) => holds(w.formula, model))
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
        <div className="fo-size" role="group" aria-label={tr('有几样东西', 'How many things')}>
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
            <span>{tr(`要${w.value ? '真' : '假'}，现在${values[k] ? '真' : '假'}`, `want ${w.value ? 'true' : 'false'}, now ${values[k] ? 'true' : 'false'}`)}</span>
          </p>
        ))}
        {checked !== null && <p className={`lg-verdict ${checked ? 'is-pass' : 'is-fail'}`}>{checked ? tr('这个世界正合要求。', 'This world fits.') : tr('还有句子的真假不对，打了叉。', 'Some sentences are not yet as asked; they are crossed.')}</p>}
      </section>
      <footer className="run-foot"><RunDock go={{ label: checked ? tr('造好了', 'Built') : tr('检查', 'Check'), pass: Boolean(checked), onClick: check }} /></footer>
    </div>
  )
  const brief = <Brief game={game} level={entry} hint={level.hint} phone={phone} />
  if (phone) return <PhonePage brief={brief} className="fo-level">{stage}</PhonePage>
  return <Workbench className="fo-level" brief={brief} stage={stage} scroll />
}

