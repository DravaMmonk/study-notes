// The translation table (games/DESIGN.md 6.10): a language's overlay against the game's text — a row a base text, read
// on the left, its translation written on the right (i18n.set). Filtered to what is missing, what cannot stand, what
// no text reads any more, or by words; a language is added by naming it. Making a game never comes here.
import { memo, useCallback, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { tr } from '../shell/i18n.js'
import { REF } from '../engine/text.js'
import { TextField } from './TextField.jsx'
import { translationOp, translationRows } from './translations.js'

// The base text as it is written, each link as the id it points at: what the translation has to carry.
const written = (text) => text.replace(REF, (_, kind, id) => `⟦${id}⟧`)

const STATES = [['missing', '未译', 'Missing'], ['wrong', '有误', 'Wrong'], ['done', '已译', 'Done'], ['unused', '无人读', 'Unused']]

const Row = memo(function Row({ row, lang, names, onEdit }) {
  const onSet = useCallback(({ zh }) => { const op = translationOp(lang, row, zh); if (op) onEdit(op) }, [lang, row, onEdit])
  return (
    <div className={`copy-row i18n-row is-${row.state}`}>
      <div className="i18n-from" title={row.where}>{written(row.from)}{row.kind && <small>{row.kind}</small>}</div>
      {row.state === 'unused'
        ? <div className="i18n-unused"><span>{row.to}</span><button type="button" className="kit-btn is-icon" onClick={() => { const op = translationOp(lang, row, ''); if (op) onEdit(op) }} aria-label={tr('去掉这一条')}><X size={13} aria-hidden="true" /></button></div>
        : <TextField value={{ zh: row.to }} onSet={onSet} label={row.where} names={names} findings={row.why ? [row.why] : []} compact />}
    </div>
  )
}, (a, b) => a.lang === b.lang && a.names === b.names && a.onEdit === b.onEdit && JSON.stringify(a.row) === JSON.stringify(b.row))

export default function Translations({ content, vocabulary, order, names, onEdit }) {
  const langs = Object.keys(content.i18n ?? {})
  const [lang, setLang] = useState(langs[0] ?? '')
  const [state, setState] = useState('')
  const [query, setQuery] = useState('')
  const all = useMemo(() => (lang ? translationRows(content, vocabulary, order, lang) : []), [content, vocabulary, order, lang])
  const count = (s) => all.filter((r) => r.state === s).length
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all.filter((r) => (!state || r.state === state) && (!q || `${r.from}\n${r.to}`.toLowerCase().includes(q)))
  }, [all, state, query])
  return (
    <section className="copy-table">
      <div className="copy-bar">
        <input className="field-input i18n-lang" list="i18n-langs" value={lang} onChange={(e) => setLang(e.target.value.trim())} placeholder="en" aria-label={tr('语言')} />
        <datalist id="i18n-langs">{langs.map((l) => <option key={l} value={l} />)}</datalist>
        {STATES.map(([s, zh, en]) => (
          <button key={s} type="button" className={`kit-btn is-label ${state === s ? 'is-on' : ''}`} aria-pressed={state === s} onClick={() => setState(state === s ? '' : s)}>{tr(zh, en)} {count(s)}</button>
        ))}
        <input className="field-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tr('筛选')} aria-label={tr('筛选')} />
        <small>{rows.length}/{all.length}</small>
      </div>
      <div className="copy-rows">
        {rows.map((row) => <Row key={`${row.state === 'unused' ? 'u' : 't'}${row.from}:${row.kind ?? ''}`} row={row} lang={lang} names={names} onEdit={onEdit} />)}
      </div>
    </section>
  )
}
