import { sameJson } from '../engine/json-value.js'
import { memo, useMemo, useState } from 'react'
import { L, tr } from '../shell/i18n.js'
import { useLang } from '../shell/useLang.js'
import { showPath } from '../engine/ops/edit.js'
import { textIn } from '../engine/i18n.js'
import { RotateCcw } from 'lucide-react'
import { allCopyRows, copyEdit, copyLanguages, copyRows, packageWording } from './copy.js'
import { usePref } from './prefs.js'
import LanguagePicker from './LanguagePicker.jsx'
import { TextField, textFindings } from './TextField.jsx'

const NONE = [undefined, undefined]
const CopyRow = memo(function CopyRow({ row, first, found, names, side, wording, onEdit, onJump, left, right }) {
  const path = showPath(row.path)
  const label = `${row.name} ${path}`
  const shared = typeof row.value === 'string'
  // In the game workspace a package text in no language is the package's alone: nothing to put over it.
  const fixed = shared && side === 'game' && row.own === 'package'
  return (
    <div role="row" className={`copy-row ${first ? 'is-first' : ''}`} data-path={row.file.game ? path : undefined}>
      <div className="copy-field-name" role="rowheader">
        <button type="button" className="copy-where" onClick={() => onJump(row)} title={label}>
          {first && <b>{row.name}</b>}
          <code>{showPath(row.file.game && row.path[0] === 'eras' ? row.path.slice(2) : row.path)}</code>
        </button>
      </div>
      {(shared ? [left] : [left, right]).map((lang, column) => {
        const was = wording[column]
        return (
          <div role="cell" aria-colspan={shared ? 2 : undefined} className={`${shared ? 'copy-shared' : ''} ${was !== undefined ? 'is-own' : ''}`} key={`${column}:${lang}`} title={was !== undefined ? was : undefined}>
            {fixed ? <span className="copy-fixed">{row.value}</span> : <TextField lang={lang} value={row.value} onSet={(text) => onEdit(copyEdit(row, lang, text, side))}
              label={`${label} · ${shared ? tr('共享文本', 'Shared text') : lang}`} field={row.field} names={names} findings={found} compact />}
            {was !== undefined && <button type="button" className="kit-btn editor-tool copy-restore" title={tr('恢复包里的原文', 'Back to the package’s wording')}
              onClick={() => onEdit(copyEdit(row, lang, null, side))}><RotateCcw size={12} /></button>}
          </div>
        )
      })}
    </div>
  )
}, (a, b) => a.left === b.left && a.right === b.right && a.first === b.first && a.names === b.names && a.side === b.side
  && a.onEdit === b.onEdit && sameJson(a.row, b.row) && sameJson(a.wording, b.wording) && a.found.join('\n') === b.found.join('\n'))

export default function CopyTable({ side = 'package', content, vocabulary, scope, setScope, order, names, places, onEdit, onJump }) {
  const uiLang = useLang()
  const [languages, setLanguages] = usePref('copy-languages', { left: null, right: null, added: [] })
  const left = languages.left ?? uiLang
  const right = languages.right ?? (uiLang === 'zh' ? 'en' : 'zh')
  const [field, setField] = useState('')
  const [only, setOnly] = useState(false)
  const [missingOnly, setMissingOnly] = useState(false)
  const [query, setQuery] = useState('')
  const all = useMemo(() => allCopyRows(content, vocabulary, order, side), [content, vocabulary, order, side])
  const scoped = useMemo(() => scope === 'all' ? all : copyRows(content, vocabulary, scope, order, side), [all, content, vocabulary, scope, order, side])
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
            {side === 'game'
              ? (content.eras ?? []).map((era, index) => <option key={index} value={index}>{era.id} {L(era.title ?? era.chapter?.title) ?? ''}</option>)
              : Object.entries(content.groups ?? {}).map(([id, group]) => <option key={id} value={`group:${id}`}>{L(group.title) || id}</option>)}
            <option value="all">{side === 'game' ? tr('整款游戏') : tr('整个内容包', 'The whole package')}</option>
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
          {...{ left, right, names, side, onEdit, onJump }} found={foundOf(row)}
          wording={side === 'game' && row.own === 'package' ? [packageWording(content, row, left), packageWording(content, row, right)] : NONE} />)}
      </div>
    </section>
  )
}
