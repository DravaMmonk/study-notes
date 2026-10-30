import { useMemo, useState } from 'react'
import { Brief, PhonePage, RunDock, Workbench } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { StripTools } from '../../../strip/index.js'
import { useHistory } from '../../../circuit/useHistory.js'
import { check, fold, foldRefusal, mark, say, targetRefusal, unfold, units } from '../engine/sentence.js'
import { ROLES, TYPES, roleKey } from '../engine/types.js'

// A sentence-analysis level (engine/sentence.js), the same on every screen: the sentence as it stands, each folded
// modifier one piece hung on its word; a tray to mark what is selected as a role of the skeleton or to fold it; the
// check against the answer. Tap a word (or a folded piece) to start a stretch, another to end it; a third tap starts
// again. Folding asks for the word the piece hangs on: the next tap.

const EMPTY = { folds: [], roles: {} }

export default function Analyze({ game, level, saved, save, solve, phone }) {
  const spec = level.source
  const { gold } = spec
  const { tokens } = gold
  const given = gold.given
  const [analysis, setAnalysis] = useState(() => saved?.analysis ?? EMPTY)
  const [tries, setTries] = useState(saved?.tries ?? 0)
  const [selection, setSelection] = useState(null) // { a, b }
  const [pending, setPending] = useState(null) // { a, b, type }: waiting for the word it hangs on
  const [note, setNote] = useState(null) // { text, bad }
  const [result, setResult] = useState(saved?.passed ? check(gold, { ...(saved.analysis ?? EMPTY), folds: [...given, ...(saved.analysis?.folds ?? [])] }) : null)

  const all = useMemo(() => ({ ...analysis, folds: [...given, ...analysis.folds] }), [analysis, given])
  const change = (next) => {
    setAnalysis(next)
    save({ analysis: next, tries })
    setResult(null)
    setNote(null)
  }
  const history = useHistory(analysis, change, `${level.id}:${spec.step ?? ''}`, 0)
  const roles = Object.keys(ROLES).filter((r) => level.palette.includes(roleKey(r)))
  const types = Object.keys(TYPES).filter((t) => level.palette.includes(t))
  const list = units(tokens, all.folds)
  const isGiven = (f) => given.some((g) => g.a === f.a && g.b === f.b)
  const single = selection && list.find((u) => u.a === selection.a && u.b === selection.b)

  const tap = (u) => {
    if (pending) {
      if (u.kind !== 'word') return setNote({ text: { zh: '要点一个词。', en: 'Tap a word.' }, bad: true })
      const why = targetRefusal(tokens, all, pending.a, pending.b, u.a)
      if (why) return setNote({ text: why, bad: true })
      change(fold(analysis, pending.a, pending.b, pending.type, u.a))
      setPending(null)
      setSelection(null)
      return null
    }
    setNote(null)
    // Nothing chosen, or a whole stretch: start afresh. One piece chosen: the same again lets go, another ends the stretch.
    if (!selection || !single) return setSelection({ a: u.a, b: u.b })
    if (single.a === u.a && single.b === u.b) return setSelection(null)
    return setSelection({ a: Math.min(selection.a, u.a), b: Math.max(selection.b, u.b) })
  }
  const pickType = (type) => {
    const why = foldRefusal(all, selection.a, selection.b)
    if (why) return setNote({ text: why, bad: true })
    setPending({ ...selection, type })
    setNote({ text: { zh: `点${TYPES[type].name.zh}修饰的那个词。`, en: `Tap the word the ${TYPES[type].name.en} modifies.` } })
    return null
  }
  const pickRole = (role) => {
    change(mark(analysis, role, selection.a, selection.b))
    setSelection(null)
  }
  const cancel = () => {
    setPending(null)
    setSelection(null)
    setNote(null)
  }
  const go = () => {
    cancel()
    const r = check(gold, all)
    const n = tries + 1
    setTries(n)
    setResult(r)
    save({ analysis, tries: n, passed: r.pass })
    if (r.pass) solve({ tries: n, star: n === 1 })
  }

  // How each unit is drawn: selected, waiting to be hung, the word a selected piece hangs on, marked by a finding.
  const span = pending ?? selection
  const anchor = !pending && single?.kind === 'fold' ? single.fold.to : -1
  const bad = (u) => result && result.findings.some((f) => f.at && f.at[0] <= u.b && u.a <= f.at[1])
  const roleOf = (u) => roles.find((r) => all.roles[r] && all.roles[r][0] <= u.a && u.b <= all.roles[r][1])
  const roleStart = (u, r) => r && all.roles[r] && list.find((x) => x.kind !== 'punct' && x.a >= all.roles[r][0])?.a === u.a

  const line = list.map((u, k) => {
    const gap = k > 0 && u.kind !== 'punct' ? ' ' : ''
    if (u.kind === 'punct') return <span key={k} className="sx-punct">{tokens[u.a].text}</span>
    const r = roleOf(u)
    const cls = [
      span && span.a <= u.a && u.b <= span.b ? 'is-on' : '',
      pending && span.a <= u.a && u.b <= span.b ? 'is-pending' : '',
      anchor === u.a ? 'is-anchor' : '',
      bad(u) ? 'is-bad' : '',
    ].join(' ')
    const body = u.kind === 'fold'
      ? (
        <button type="button" className={`sx-fold ${isGiven(u.fold) ? 'is-given' : ''} ${cls}`} data-type={u.fold.type} title={say(tokens, u.a, u.b)} onClick={() => tap(u)}>
          {L(TYPES[u.fold.type].name)}<span className="sx-arrow">→</span><i>{tokens[u.fold.to].text}</i>
        </button>
      )
      : <button type="button" className={`sx-word ${cls}`} onClick={() => tap(u)}>{tokens[u.a].text}</button>
    return (
      <span key={k} className="sx-unit" data-role={r ?? undefined}>
        {gap}
        <span className="sx-stack">
          {body}
          {roleStart(u, r) && <small className="sx-role-label">{L(ROLES[r].name)}</small>}
        </span>
      </span>
    )
  })

  const markedAs = (role) => all.roles[role] && selection && all.roles[role][0] === selection.a && all.roles[role][1] === selection.b
  const tray = pending ? (
    <div className="sx-tray">
      <button type="button" className="sx-act is-quiet" onClick={cancel}>{tr('取消', 'Cancel')}</button>
    </div>
  ) : selection ? (
    <div className="sx-tray">
      <div className="sx-group">
        {roles.map((role) => (
          <button key={role} type="button" className={`sx-act ${markedAs(role) ? 'is-active' : ''}`} data-role={role} onClick={() => pickRole(role)}>{L(ROLES[role].name)}</button>
        ))}
      </div>
      {types.length > 0 && (
        <div className="sx-group">
          {types.map((type) => (
            <button key={type} type="button" className="sx-act" data-type={type} onClick={() => pickType(type)}>{tr('折成', 'Fold as')} {L(TYPES[type].name)}</button>
          ))}
        </div>
      )}
      <div className="sx-group">
        {single?.kind === 'fold' && !isGiven(single.fold) && <button type="button" className="sx-act" onClick={() => { change(unfold(analysis, single.fold)); setSelection(null) }}>{tr('拆开', 'Unfold')}</button>}
        <button type="button" className="sx-act is-quiet" onClick={cancel}>{tr('取消', 'Cancel')}</button>
      </div>
    </div>
  ) : null

  const status = note
    ? <p className={`sx-note ${note.bad ? 'is-bad' : ''}`} role="status">{L(note.text)}</p>
    : !result && !selection && !analysis.folds.length && !Object.keys(analysis.roles).length ? <p className="sx-note">{tr('点一个词开始选一段，再点一个词结束。', 'Tap a word to start a stretch, and another to end it.')}</p> : null

  const brief = <Brief game={game} level={level} hint={spec.hint} />
  const stage = (
    <div className="sx-stage">
      <StripTools history={history} onClear={() => change(EMPTY)} empty={!analysis.folds.length && !Object.keys(analysis.roles).length} />
      <p className={`sx-sentence ${pending ? 'is-picking' : ''}`} lang="en">{line}</p>
      {status}
      {tray}
      {result && (
        <div className={`sx-result ${result.pass ? 'is-pass' : 'is-fail'}`} role="status">
          {result.pass
            ? <p>{tr('拆对了。', 'Taken apart right.')}</p>
            : <ul>{result.findings.map((f, k) => <li key={k} dangerouslySetInnerHTML={{ __html: L(f) }} />)}</ul>}
        </div>
      )}
      <footer className="run-foot">
        <RunDock go={{ label: result?.pass ? tr('拆对了', 'Right') : tr('对照', 'Check'), pass: Boolean(result?.pass), onClick: go }} />
      </footer>
    </div>
  )
  if (phone) return <PhonePage brief={brief} className="sx-level">{stage}</PhonePage>
  return <Workbench className="sx-level" brief={brief} stage={stage} scroll />
}
