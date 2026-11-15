// The copy table: every text of a chapter, of the whole game or of the encyclopedia in one dense grid — a row a text
// (its level and field), its copy in the selected language, edited in place, the copy rules a machine
// can see marked on the row (TextField's findings, and the check's) — to proofread a chapter in one pass. Filtered by
// field, by rows with findings, by words. Rows off screen are left to the browser to skip (content-visibility).
import { memo, useCallback, useMemo, useState } from 'react'
import { L, tr } from '../shell/i18n.js'
import { useLang } from '../shell/useLang.js'
import { showPath } from '../engine/ops/edit.js'
import { textIn } from '../engine/i18n.js'
import { allCopyRows, copyEdit, copyLanguages, copyRows } from './copy.js'
import LanguagePicker from './LanguagePicker.jsx'
import { TextField, textFindings } from './TextField.jsx'

const CopyRow = memo(function CopyRow({ row, first, found, names, onEdit, onJump, lang }) {
  const onSet = useCallback((text) => onEdit(copyEdit(row, lang, text)), [row, lang, onEdit])
  return (
    <div className={`copy-row ${first ? 'is-first' : ''}`} data-path={row.file.game ? showPath(row.path) : undefined}>
      <button type="button" className="copy-where" onClick={() => onJump(row)} title={`${row.name} ${showPath(row.path)}`}>
        {first && <b>{row.name}</b>}
        <code>{showPath(row.file.game && row.path[0] === 'eras' ? row.path.slice(2) : row.path)}</code>
      </button>
      <TextField key={lang} lang={lang} value={row.value} onSet={onSet} label={`${row.name} ${showPath(row.path)}`} field={row.field} names={names} findings={found} compact />
    </div>
  )
}, (a, b) => a.lang === b.lang && a.first === b.first && a.names === b.names && a.onEdit === b.onEdit && JSON.stringify(a.row) === JSON.stringify(b.row) && a.found.join('\n') === b.found.join('\n'))

export default function CopyTable({ content, vocabulary, scope, setScope = null, order, names, places, onEdit, onJump }) {
  const uiLang = useLang()
  const [choice, setLanguage] = useState(null)
  const lang = choice ?? uiLang
  const [field, setField] = useState('')
  const [only, setOnly] = useState(false)
  const [query, setQuery] = useState('')
  const all = useMemo(() => copyRows(content, vocabulary, scope, order), [content, vocabulary, scope, order])
  const options = useMemo(() => copyLanguages(allCopyRows(content, vocabulary, order)), [content, vocabulary, order])
  const foundOf = useMemo(() => {
    const map = new Map()
    for (const p of places) if (p.path) map.set(`${p.level}|${showPath(p.path)}`, [...(map.get(`${p.level}|${showPath(p.path)}`) ?? []), p.says])
    return (row) => map.get(row.key) ?? []
  }, [places])
  const fields = useMemo(() => [...new Set(all.map((r) => r.field))].filter(Boolean), [all])
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all.filter((r) => (!field || r.field === field)
      && (!q || textIn(r.value, lang).toLowerCase().includes(q))
      && (!only || foundOf(r).length > 0 || textFindings({ [lang]: textIn(r.value, lang) }, r.field, names).length > 0))
  }, [all, field, query, only, foundOf, names, lang])
  return (
    <section className="copy-table">
      <div className="copy-bar">
        <LanguagePicker label={tr('文案语言', 'Copy language')} value={lang} options={options} onChange={setLanguage} />
        {setScope && (
          <select value={String(scope)} onChange={(e) => setScope(/^\d+$/.test(e.target.value) ? Number(e.target.value) : e.target.value)} aria-label={tr('范围')}>
            {(content.eras ?? []).map((era, e) => <option key={e} value={e}>{era.id} {L(era.title ?? era.chapter?.title) ?? ''}</option>)}
            <option value="all">{tr('整款游戏')}</option>
            <option value="glossary">{tr('百科')}</option>
          </select>
        )}
        <select value={field} onChange={(e) => setField(e.target.value)} aria-label={tr('字段')}>
          <option value="">{tr('全部字段')}</option>
          {fields.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <button type="button" className={`kit-btn is-label ${only ? 'is-on' : ''}`} aria-pressed={only} onClick={() => setOnly(!only)}><i className="mk-fail">!</i></button>
        <input className="field-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tr('筛选')} aria-label={tr('筛选')} />
        <small>{rows.length}/{all.length}</small>
      </div>
      <div className="copy-rows">
        {rows.map((row, k) => <CopyRow key={row.key} row={row} lang={lang} first={k === 0 || rows[k - 1].name !== row.name} found={foundOf(row)} names={names} onEdit={onEdit} onJump={onJump} />)}
      </div>
    </section>
  )
}
