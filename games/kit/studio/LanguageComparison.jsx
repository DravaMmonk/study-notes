import { memo, useMemo, useState } from 'react'
import { tr } from '../shell/i18n.js'
import { useLang } from '../shell/useLang.js'
import { isText, textIn } from '../engine/i18n.js'
import { showPath } from '../engine/ops/edit.js'
import { allCopyRows, copyLanguages, copyEdit } from './copy.js'
import LanguagePicker from './LanguagePicker.jsx'
import { TextField } from './TextField.jsx'

const Row = memo(function Row({ row, left, right, names, onEdit }) {
  const label = `${row.name} ${showPath(row.path)}`
  return (
    <div className="copy-row i18n-row" title={label}>
      {[left, right].map((lang, column) => <TextField key={`${column}:${lang}`} lang={lang} value={row.value}
        onSet={(text) => onEdit(copyEdit(row, lang, text))} label={`${label} · ${lang}`} field={row.field} names={names} compact />)}
    </div>
  )
}, (a, b) => a.left === b.left && a.right === b.right && a.names === b.names && a.onEdit === b.onEdit
  && JSON.stringify(a.row) === JSON.stringify(b.row))

export default function LanguageComparison({ content, vocabulary, order, names, onEdit }) {
  const uiLang = useLang()
  const [leftChoice, setLeft] = useState(null)
  const [rightChoice, setRight] = useState(null)
  const [missingOnly, setMissingOnly] = useState(false)
  const [query, setQuery] = useState('')
  const left = leftChoice ?? uiLang
  const right = rightChoice ?? (uiLang === 'zh' ? 'en' : 'zh')
  const all = useMemo(() => allCopyRows(content, vocabulary, order).filter((row) => isText(row.value)), [content, vocabulary, order])
  const options = useMemo(() => copyLanguages(all), [all])
  const missing = (row) => !textIn(row.value, left).trim() || !textIn(row.value, right).trim()
  const q = query.trim().toLowerCase()
  const rows = all.filter((row) => (!missingOnly || missing(row))
    && (!q || [left, right].some((lang) => textIn(row.value, lang).toLowerCase().includes(q))))
  return (
    <section className="copy-table">
      <div className="i18n-toolbar">
        <div className="copy-bar">
          <button type="button" className={`kit-btn is-label ${missingOnly ? 'is-on' : ''}`} aria-pressed={missingOnly} onClick={() => setMissingOnly(!missingOnly)}>{tr('缺少文本', 'Missing text')} {all.filter(missing).length}</button>
          <input className="field-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tr('筛选')} aria-label={tr('筛选')} />
          <small>{rows.length}/{all.length}</small>
        </div>
        <div className="i18n-columns">
          <LanguagePicker label={tr('左列语言', 'Left column language')} value={left} options={options} onChange={setLeft} />
          <LanguagePicker label={tr('右列语言', 'Right column language')} value={right} options={options} onChange={setRight} />
        </div>
      </div>
      <div className="copy-rows">
        {rows.map((row) => <Row key={row.key} {...{ row, left, right, names, onEdit }} />)}
      </div>
    </section>
  )
}
