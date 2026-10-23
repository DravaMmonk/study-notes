import { useMemo, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import { Brief, PhonePage, RunDock, Workbench } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { parse } from '../formula.js'
import { say } from '../notation.js'
import { checkTerm, parseTerm, printTerm } from '../pterm.js'

// Term levels (《证明完毕》 chapter 6): the player writes a short proof term, as Lean writes one, for each sentence to
// prove from named premises, and the machine checks the term's type is that sentence (pterm.js). The buttons type
// the pieces a term is made of; what is typed is read back as the machine understands it.
//
//   level  { kind: 'term', items: [{ premises: { name: formula text }, goal: formula text, answer: term text }], consts? }

const PIECES = ['fun h => ', '⟨', ', ', '⟩', '.1', '.2', 'Or.inl ', 'Or.inr ', '.elim ', 'False.elim ', '(', ')']

/** One term to write: what is given, what to prove, the input and what it reads as. */
function TermInput({ item, value, onChange, onFocus, inputRef, level, verdict }) {
  const text = (f) => L(say(parse(f, { consts: level.consts ?? [] }), level.notation))
  const read = useMemo(() => {
    if (!value.trim()) return null
    try { return { t: printTerm(parseTerm(value)) } } catch { return { error: true } }
  }, [value])
  return (
    <section className={`fo-item ${verdict ? (verdict.pass ? 'is-pass' : 'is-fail') : ''}`}>
      <p className="fo-say">
        {verdict && (verdict.pass ? <Check size={14} /> : <X size={14} />)}
        <span>
          {Object.keys(item.premises ?? {}).length > 0 && <>{tr('已知', 'Given')} {Object.entries(item.premises).map(([name, f]) => <span key={name} className="tm-given"><code>{name}</code>：{text(f)}</span>)} · </>}
          {tr('要证', 'Prove')} <b>{text(item.goal)}</b>
        </span>
      </p>
      <input ref={inputRef} className="fo-input" value={value} spellCheck={false} autoCapitalize="off" autoComplete="off" onFocus={onFocus} onChange={(e) => onChange(e.target.value)} placeholder={tr('写一个项，比如 fun h => h', 'Write a term, such as fun h => h')} />
      <p className="fo-read">{read?.t ? <>{tr('读作：', 'Reads: ')}<code className="lg-term">{read.t}</code></> : read?.error ? <span className="lg-error">{tr('还不是一个完整的项', 'Not a whole term yet')}</span> : null}</p>
      {verdict && !verdict.pass && <p className="lg-error">{L(verdict.reason)}</p>}
    </section>
  )
}

export default function TermScreen({ game, level: entry, saved, save, solve, phone }) {
  const level = entry.source
  const [texts, setTexts] = useState(() => level.items.map((_, k) => saved?.texts?.[k] ?? ''))
  const [verdicts, setVerdicts] = useState(null)
  const [focus, setFocus] = useState(0)
  const refs = useRef([])
  const consts = level.consts ?? []
  const change = (k, v) => {
    const next = texts.map((t, i) => (i === k ? v : t))
    setTexts(next)
    save({ texts: next })
    setVerdicts(null)
  }
  const insert = (piece) => {
    const el = refs.current[focus]
    const [a, b] = el ? [el.selectionStart, el.selectionEnd] : [texts[focus].length, texts[focus].length]
    const v = texts[focus].slice(0, a) + piece + texts[focus].slice(b)
    change(focus, v)
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(a + piece.length, a + piece.length) })
  }
  const judge = (item, value) => {
    let term
    try { term = parseTerm(value) } catch { return { pass: false, reason: { zh: '还不是一个完整的项。', en: 'Not a whole term yet.' } } }
    const hyps = Object.fromEntries(Object.entries(item.premises ?? {}).map(([name, f]) => [name, parse(f, { consts })]))
    const reason = checkTerm(term, parse(item.goal, { consts }), { hyps, consts, notation: level.notation })
    return { pass: !reason, reason }
  }
  const check = () => {
    const vs = level.items.map((item, k) => judge(item, texts[k]))
    setVerdicts(vs)
    if (vs.every((v) => v.pass)) solve(null)
  }
  const passed = verdicts?.every((v) => v.pass)
  // The premises' names are pieces too.
  const names = [...new Set(level.items.flatMap((item) => Object.keys(item.premises ?? {})))]
  const stage = (
    <div className="fo-stage">
      {level.items.map((item, k) => (
        <TermInput key={k} item={item} value={texts[k]} onChange={(v) => change(k, v)} onFocus={() => setFocus(k)} inputRef={(el) => { refs.current[k] = el }} level={level} verdict={verdicts?.[k]} />
      ))}
      <div className="fo-vocab" onPointerDown={(e) => e.preventDefault()}>
        {[...names, ...PIECES].map((p) => <button key={p} type="button" onClick={() => insert(p)}><code>{p.trim() || p}</code></button>)}
      </div>
      <footer className="run-foot"><RunDock go={{ label: passed ? tr('全对', 'All correct') : tr('检查', 'Check'), pass: Boolean(passed), onClick: check }} /></footer>
    </div>
  )
  const brief = <Brief game={game} level={entry} hint={level.hint} phone={phone} />
  if (phone) return <PhonePage brief={brief} className="fo-level">{stage}</PhonePage>
  return <Workbench className="fo-level" brief={brief} stage={stage} scroll />
}
