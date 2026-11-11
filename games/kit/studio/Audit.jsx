// The audit drawer under the form (DIRECTION decision 6): a bar that says how the check stands and folds the drawer
// open or shut, and in the drawer a worklist: npm run check's lines for the game as the pending changeset
// leaves it, recomputed on every edit, one row a line (worklist.js) — filtered by severity, rule, the level selected
// and words; F8 and Shift+F8 step through them, each step going to the field the line is about (or its level). While
// the whole check of the latest edit is still running, the last one shows faded.
import { useEffect, useMemo, useState } from 'react'
import { ChevronUp } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'
import { SEVERITIES, filterItems, stepIn, tally } from './worklist.js'
import { usePref } from './prefs.js'

const SEVERITY = { fail: ['不过', 'failing'], open: ['待办', 'open'], report: ['报告', 'reported'], pass: ['通过', 'passing'] }
const SHOWN = 400 // rows drawn at most; the rest summed up

export default function Audit({ items, fresh, last, at, busy, ops, migration, open, onToggle, onJump, onReview }) {
  const [filter, setFilter] = usePref('audit-filter', { severities: ['fail', 'open', 'report'], rule: '', mine: false })
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(-1)
  const { rules, severities } = useMemo(() => tally(items), [items])
  const shown = useMemo(() => filterItems(items, { severities: filter.severities, rules: filter.rule ? [filter.rule] : [], level: filter.mine ? at?.level ?? null : null, query }), [items, filter, at, query])
  useEffect(() => setCursor(-1), [filter, query])
  const go = (k) => {
    setCursor(k)
    if (shown[k]) onJump(shown[k])
  }
  // F8 / Shift+F8, or the palette's next and previous finding.
  useEffect(() => {
    const step = (s) => {
      if (!open) onToggle()
      go(stepIn(shown.length, Math.min(cursor, shown.length - 1), s))
    }
    const key = (e) => { if (e.key === 'F8') { e.preventDefault(); step(e.shiftKey ? -1 : 1) } }
    const asked = (e) => step(e.detail)
    window.addEventListener('keydown', key)
    window.addEventListener('studio:finding', asked)
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('studio:finding', asked) }
  })
  useEffect(() => { document.querySelector('.audit-row.is-at')?.scrollIntoView({ block: 'nearest' }) }, [cursor])
  const set = (patch) => setFilter((f) => ({ ...f, ...patch }))
  const toggle = (s) => set({ severities: filter.severities.includes(s) ? filter.severities.filter((x) => x !== s) : [...filter.severities, s] })
  const fails = severities.get('fail') ?? 0
  const failedOp = last && last.failed !== null && last.failed !== undefined
  return (
    <div className={`audit ${open ? 'is-open' : ''} ${busy || !fresh ? 'is-busy' : ''}`} aria-busy={!fresh}>
      <div className={`audit-bar ${fails || failedOp ? 'is-fail' : 'is-ok'}`}>
        <button type="button" className="audit-sum" onClick={onToggle} aria-expanded={open} title="Alt+]">
          <ChevronUp size={14} aria-hidden="true" />
          <b>{failedOp ? tr('操作失败') : fails ? tr(`${fails} 处不过`, `${fails} failing`) : tr('全部通过', 'All clear')}</b>
          {!fresh && <i className="audit-wait" title={tr('检查中')} />}
        </button>
        {ops.length > 0 && <button type="button" className="audit-pending" onClick={onReview}>{tr(`${ops.length} 个待定`, `${ops.length} pending`)}{migration ? ` · v${migration.version}` : ''}</button>}
        {open && <Filters filter={filter} set={set} toggle={toggle} severities={severities} rules={rules} at={at} query={query} setQuery={setQuery} />}
      </div>
      {open && (
        <div className="audit-body">
          {failedOp && <ul className="audit-lines">{last.problems.map((p) => <li key={p} className="audit-row is-fail is-wide">{p}</li>)}</ul>}
          <Lines shown={shown} cursor={cursor} go={go} />
        </div>
      )}
    </div>
  )
}

/** The worklist's filters: severity (with counts), the level selected, a rule, words. */
function Filters({ filter, set, toggle, severities, rules, at, query, setQuery }) {
  return (
    <div className="audit-filter">
      <div className="seg is-small" role="group" aria-label={tr('严重程度')}>
        {SEVERITIES.map((s) => (
          <button key={s} type="button" className={`is-${s} ${filter.severities.includes(s) ? 'is-on' : ''}`} aria-pressed={filter.severities.includes(s)} onClick={() => toggle(s)} title={tr(...SEVERITY[s])}>
            <i />{severities.get(s) ?? 0}
          </button>
        ))}
      </div>
      <button type="button" className={`audit-mine ${filter.mine ? 'is-on' : ''}`} aria-pressed={filter.mine} onClick={() => set({ mine: !filter.mine })} disabled={!at?.level} title={tr('只看选中的关')}>{at?.level ?? '—'}</button>
      <select className="audit-rule" value={filter.rule} onChange={(e) => set({ rule: e.target.value })} aria-label={tr('规则', 'Rule')}>
        <option value="">{tr('全部规则')}</option>
        {[...rules].sort(([a], [b]) => a.localeCompare(b)).map(([r, n]) => <option key={r} value={r}>{r} · {n}</option>)}
      </select>
      <input className="audit-query" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tr('筛选')} aria-label={tr('筛选')} />
    </div>
  )
}

/** The check's lines as rows, each going to what it is about. */
function Lines({ shown, cursor, go }) {
  return (
    <ol className="audit-lines" aria-label={tr('检查')}>
      {shown.slice(0, SHOWN).map((it, k) => (
        <li key={`${k} ${it.text}`} className={`audit-row is-${it.severity} ${k === cursor ? 'is-at' : ''}`}>
          <button type="button" onClick={() => go(k)} title={it.text}>
            <code>{it.levels[0] ?? it.rule}</code>
            <span>{it.text}</span>
          </button>
        </li>
      ))}
      {shown.length > SHOWN && <li className="audit-more">{tr(`还有 ${shown.length - SHOWN} 行`, `${shown.length - SHOWN} more`)}</li>}
      {!shown.length && <li className="audit-more">—</li>}
    </ol>
  )
}
