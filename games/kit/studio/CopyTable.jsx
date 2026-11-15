import { sameJson } from '../engine/json-value.js'
import { memo, useMemo, useState } from 'react'
import { L, tr } from '../shell/i18n.js'
import { useLang } from '../shell/useLang.js'
import { showPath } from '../engine/ops/edit.js'
import { textIn } from '../engine/i18n.js'
import { allCopyRows, copyEdit, copyLanguages, copyRows } from './copy.js'
import { usePref } from './prefs.js'
import LanguagePicker from './LanguagePicker.jsx'
import { TextField, textFindings } from './TextField.jsx'

const CopyRow = memo(function CopyRow({ row, first, found, names, onEdit, onJump, left, right }) {
  const path = showPath(row.path)
  const label = `${row.name} ${path}`
  const shared = typeof row.value === 'string'
  return (
    <div role="row" className={`copy-row ${first ? 'is-first' : ''}`} data-path={row.file.game ? path : undefined}>
      <div className="copy-field-name" role="rowheader">
        <button type="button" className="copy-where" onClick={() => onJump(row)} title={label}>
          {first && <b>{row.name}</b>}
          <code>{showPath(row.file.game && row.path[0] === 'eras' ? row.path.slice(2) : row.path)}</code>
        </button>
      </div>
      {(shared ? [left] : [left, right]).map((lang, column) => (
        <div role="cell" aria-colspan={shared ? 2 : undefined} className={shared ? 'copy-shared' : undefined} key={`${column}:${lang}`}>
          <TextField lang={lang} value={row.value} onSet={(text) => onEdit(copyEdit(row, lang, text))}
            label={`${label} · ${shared ? tr('共享文本', 'Shared text') : lang}`} field={row.field} names={names} findings={found} compact />
        </div>
      ))}
    </div>
  )
}, (a, b) => a.left === b.left && a.right === b.right && a.first === b.first && a.names === b.names
  && a.onEdit === b.onEdit && sameJson(a.row, b.row) && a.found.join('\n') === b.found.join('\n'))

export default function CopyTable({ content, vocabulary, scope, setScope, order, names, places, onEdit, onJump }) {
  const uiLang = useLang()
  const [languages, setLanguages] = usePref('copy-languages', { left: null, right: null, added: [] })
  const left = languages.left ?? uiLang
  const right = languages.right ?? (uiLang === 'zh' ? 'en' : 'zh')
  const [field, setField] = useState('')
  const [only, setOnly] = useState(false)
  const [missingOnly, setMissingOnly] = useState(false)
  const [query, setQuery] = useState('')
  const all = useMemo(() => allCopyRows(content, vocabulary, order), [content, vocabulary, order])
  const scoped = useMemo(() => scope === 'all' ? all : copyRows(content, vocabulary, scope, order), [all, content, vocabulary, scope, order])
  const options = useMemo(() => {
    const names = new Intl.DisplayNames([uiLang], { type: 'language' })
    return [...new Set([...copyLanguages(all), ...languages.added, left, right])].sort()
      .map((lang) => ({ value: lang, label: `${names.of(lang)} (${lang})` }))
  }, [all, languages.added, left, right, uiLang])
  const choose = (column, lang, add = false) => setLanguages((previous) => ({
    ...previous, [column]: lang,
    added: add && !previous.added.includes(lang) ? [...previous.added, lang] : previous.added,
  }))
  const foundOf = useMemo(() => {
    const map = new Map()
    for (const p of places) if (p.path) map.set(`${p.level}|${showPath(p.path)}`, [...(map.get(`${p.level}|${showPath(p.path)}`) ?? []), p.says])
    return (row) => map.get(row.key) ?? []
  }, [places])
  const fields = useMemo(() => [...new Set(scoped.map((row) => row.field))].filter(Boolean), [scoped])
  const selectedField = fields.includes(field) ? field : ''
  const { rows, missing } = useMemo(() => {
    const queryText = query.trim().toLowerCase()
    const rows = []
    let missing = 0
    for (const row of scoped) {
      if (selectedField && row.field !== selectedField) continue
      const a = textIn(row.value, left)
      const b = textIn(row.value, right)
      const empty = typeof row.value !== 'string' && (!a.trim() || !b.trim())
      if (queryText && ![a, b, row.name, showPath(row.path)].some((text) => text.toLowerCase().includes(queryText))) continue
      if (only && !foundOf(row).length && !textFindings({ [left]: a }, row.field, names).length
        && !textFindings({ [right]: b }, row.field, names).length) continue
      if (empty) missing++
      if (!missingOnly || empty) rows.push(row)
    }
    return { rows, missing }
  }, [scoped, selectedField, query, only, missingOnly, foundOf, names, left, right])
  return (
    <section className="copy-table" role="table" aria-label={tr('文案', 'Copy')}>
      <div className="copy-head">
        <div className="copy-bar">
          <select value={String(scope)} onChange={(event) => {
            const value = event.target.value
            setField('')
            setScope(/^\d+$/.test(value) ? Number(value) : value)
          }} aria-label={tr('范围')}>
            {(content.eras ?? []).map((era, index) => <option key={index} value={index}>{era.id} {L(era.title ?? era.chapter?.title) ?? ''}</option>)}
            <option value="all">{tr('整款游戏')}</option>
            <option value="glossary">{tr('百科')}</option>
            {content.partDefs && <option value="pieces">{tr('件', 'Pieces')}</option>}
          </select>
          <select value={selectedField} onChange={(event) => setField(event.target.value)} aria-label={tr('字段')}>
            <option value="">{tr('全部字段')}</option>
            {fields.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <button type="button" className={`kit-btn is-label ${only ? 'is-on' : ''}`} aria-pressed={only} aria-label={tr('只看有问题的字段', 'Fields with findings')} onClick={() => setOnly(!only)}><i className="mk-fail">!</i></button>
          <button type="button" className={`kit-btn is-label ${missingOnly ? 'is-on' : ''}`} aria-pressed={missingOnly} onClick={() => setMissingOnly(!missingOnly)}>{tr('缺少文本', 'Missing text')} {missing}</button>
          <input className="field-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tr('筛选')} aria-label={tr('筛选')} />
          <small>{rows.length}/{scoped.length}</small>
        </div>
        <div className="copy-columns" role="row">
          <span className="copy-field-name" role="columnheader">{tr('字段名', 'Field name')}</span>
          <LanguagePicker label={tr('语言 1', 'Language 1')} value={left} options={options} onChange={(lang) => choose('left', lang)} onAdd={(lang) => choose('left', lang, true)} />
          <LanguagePicker label={tr('语言 2', 'Language 2')} value={right} options={options} onChange={(lang) => choose('right', lang)} onAdd={(lang) => choose('right', lang, true)} />
        </div>
      </div>
      <div className="copy-rows" role="rowgroup">
        {rows.map((row, index) => <CopyRow key={row.key} row={row} first={index === 0 || rows[index - 1].name !== row.name}
          {...{ left, right, names, onEdit, onJump }} found={foundOf(row)} />)}
      </div>
    </section>
  )
}
