import { useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Brief, PhonePage, RunDock, Workbench, useKeptVerdict } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { parse, show } from '../formula.js'
import { say } from '../notation.js'
import { checkScript, depthsOf, methodText, methodsOf, namesOf, sentencesOf } from '../script.js'

// Script tasks (《证明完毕》 chapter 15): a structured proof written as rows, each a sentence and how it is proved, as
// Isar writes it (script.js). A row is chosen, not typed: its sentence from the level's, the facts it uses by name,
// and after by a rule (named as its card is) or a tactic built before, or a block of rows (proof … qed).
//
//   level  { kind: 'script', premises: { name: formula text }, goal, consts?, sentences: [formula text] (what a row
//            may state, beside the goal and premises), things?: [name] (what fix and obtain may name), given?: [row]
//            (rows to start from), locked?: true (only each row's by may change), answer: [row], naive?: [row],
//            simp?: [rewrite key] (the simp set) }

const T = (zh, en) => ({ zh, en })
const KINDS = ['have', 'show', 'assume', 'fix', 'obtain']

/** A script read only, as Isar prints it (proof … qed around a block), in the level's notation. */
export function ScriptView({ rows, text }) {
  return <pre className="sc-view">{scriptLines(rows, text).map(([d, line]) => `${'  '.repeat(d)}${line}`).join('\n')}</pre>
}

// A script's lines: each row, and proof / qed around each block, with their depths.
function scriptLines(rows, text) {
  const names = namesOf(rows)
  const depths = depthsOf(rows)
  const out = []
  rows.forEach((r, i) => {
    const d = depths[i]
    const stmt = r.stmt ? `“${text(r.stmt)}”` : '…'
    const using = r.using?.length ? ` using ${r.using.join(' ')}` : ''
    if (r.k === 'assume') out.push([d, `assume ${names[i]}: ${stmt}`])
    else if (r.k === 'fix') out.push([d, `fix ${r.thing ?? '…'}`])
    else if (r.k === 'obtain') out.push([d, `obtain ${r.thing ?? '…'} where ${names[i]}: ${stmt}${using}`])
    else {
      const head = `${r.k}${names[i] ? ` ${names[i]}:` : ''} ${stmt}`
      if (r.by === 'proof') out.push([d, head], [d, 'proof'])
      else out.push([d, `${head}${using} by ${methodText(r.by)}`])
    }
    // A show ends the block it is in: its qed follows.
    if (r.k === 'show' && d > 0) out.push([d - 1, 'qed'])
  })
  return out
}

export default function ScriptScreen({ game, level: entry, saved, save, solve, lastRun, keepRun, phone }) {
  const level = entry.source
  const consts = [...(level.consts ?? []), ...(level.things ?? [])]
  const read = (f) => parse(f, { consts })
  const text = (f) => L(say(typeof f === 'string' ? read(f) : f, level.notation))
  // A sentence as the choices key it: however it was written.
  const keyOf = (t) => { try { return show(read(t)) } catch { return t } }
  const [rows, setRows] = useState(() => saved?.rows ?? level.given ?? [])
  const [at, setAt] = useState(null)
  const [verdict, setVerdict] = useKeptVerdict({ lastRun, keepRun }, () => checkScript(level, rows))
  const change = (next) => {
    setRows(next)
    save({ rows: next })
    setVerdict(null)
  }
  const set = (i, patch) => change(rows.map((r, k) => (k === i ? { ...r, ...patch } : r)))
  const add = (k) => {
    const row = { k, using: [], ...(k === 'have' || k === 'show' ? { by: '' } : {}) }
    const where = at === null ? rows.length : at + 1
    change([...rows.slice(0, where), row, ...rows.slice(where)])
    setAt(where)
  }
  const remove = (i) => { change(rows.filter((_, k) => k !== i)); setAt(null) }
  const check = () => {
    const v = checkScript(level, rows)
    setVerdict(v)
    if (v.pass) solve(null)
  }

  const sentences = useMemo(() => sentencesOf(level), [level])
  const methods = useMemo(() => methodsOf(level), [level])
  const names = namesOf(rows)
  const depths = depthsOf(rows)
  const premises = Object.entries(level.premises ?? {})
  const lock = Boolean(level.locked)

  const stage = (
    <div className="fo-stage sc-stage">
      <section className="tm-given">
        {premises.length > 0 && <p>{tr('已知', 'Given')} {premises.map(([name, f]) => <span key={name} className="tm-premise"><code>{name}</code>：{text(f)}</span>)}</p>}
        <p className="fo-say fo-prompt">{tr('要证', 'Prove')} <b>{text(level.goal)}</b></p>
      </section>
      <ol className="sc-rows">
        {rows.map((r, i) => {
          const why = verdict?.rows[i]
          // Facts a row may use: the premises and the rows before it that name one.
          const scope = [...premises.map(([n]) => n), ...names.slice(0, i).filter(Boolean)]
          return (
            <li key={i} className={`sc-row ${at === i ? 'is-on' : ''} ${why ? 'is-fail' : ''}`} style={{ '--depth': depths[i] }} onClick={() => !lock && setAt(i)}>
              <div className="sc-line">
                <b className="sc-kw">{r.k}</b>
                {names[i] && <code className="sc-name">{names[i]}</code>}
                {(r.k === 'fix' || r.k === 'obtain') && (
                  <select disabled={lock} value={r.thing ?? ''} onChange={(e) => set(i, { thing: e.target.value })} aria-label={tr('取的名字', 'Name taken')}>
                    <option value="">…</option>
                    {(level.things ?? []).map((x) => <option key={x} value={x}>{L(level.notation.words?.[x] ?? T(x, x))}</option>)}
                  </select>
                )}
                {r.k !== 'fix' && (
                  <select className="sc-stmt" disabled={lock} value={r.stmt ? keyOf(r.stmt) : ''} onChange={(e) => set(i, { stmt: e.target.value })} aria-label={tr('这一句', 'Sentence')}>
                    <option value="">{tr('选择句子', 'Choose a sentence')}</option>
                    {sentences.map((f) => <option key={show(f)} value={show(f)}>{text(f)}</option>)}
                  </select>
                )}
                {(r.k === 'have' || r.k === 'show' || r.k === 'obtain') && r.by !== 'proof' && (
                  <span className="sc-using">
                    <span className="sc-kw">using</span>
                    {scope.map((n) => {
                      const on = (r.using ?? []).includes(n)
                      return <button key={n} type="button" disabled={lock} aria-pressed={on} onClick={(e) => { e.stopPropagation(); set(i, { using: on ? r.using.filter((x) => x !== n) : [...(r.using ?? []), n] }) }}>{n}</button>
                    })}
                  </span>
                )}
                {(r.k === 'have' || r.k === 'show') && (
                  <label className="sc-by">
                    <span className="sc-kw">by</span>
                    <select disabled={lock && r.by === 'proof'} value={r.by ?? ''} onChange={(e) => set(i, { by: e.target.value })}>
                      <option value="">…</option>
                      <option value="proof">{tr('证明块（proof … qed）', 'a proof block (proof … qed)')}</option>
                      <optgroup label={tr('规则', 'Rules')}>
                        {methods.rules.map((m) => <option key={m.key} value={m.key}>{`${L(m.rule.name)} · ${m.key.slice(5)}`}</option>)}
                      </optgroup>
                      {methods.tactics.length > 0 && (
                        <optgroup label={tr('自建策略', 'Your tactics')}>
                          {methods.tactics.map((t) => <option key={t} value={t}>{methodText(t)}</option>)}
                        </optgroup>
                      )}
                    </select>
                  </label>
                )}
                {!lock && <button type="button" className="sc-remove" aria-label={tr('删除这一行', 'Remove this row')} onClick={(e) => { e.stopPropagation(); remove(i) }}><X size={14} /></button>}
              </div>
              {why && <p className="lg-error">{L(why)}</p>}
            </li>
          )
        })}
      </ol>
      {!lock && (
        <div className="sc-add">
          {KINDS.map((k) => <button key={k} type="button" onClick={() => add(k)}><Plus size={13} />{k}</button>)}
        </div>
      )}
      {verdict && <p className={`lg-verdict ${verdict.pass ? 'is-pass' : 'is-fail'}`} role="status">{verdict.pass ? tr('核已检查每一行。证明完毕。', 'The kernel has checked every row. Q.E.D.') : L(verdict.reason)}</p>}
      <footer className="run-foot">
        <RunDock go={{ label: verdict?.pass ? tr('通过', 'Passed') : tr('检查', 'Check'), pass: Boolean(verdict?.pass), onClick: check }} />
      </footer>
    </div>
  )
  const brief = <Brief game={game} level={entry} hint={level.hint} phone={phone} />
  if (phone) return <PhonePage brief={brief} className="fo-level sc-level">{stage}</PhonePage>
  return <Workbench className="fo-level sc-level" brief={brief} stage={stage} scroll />
}
