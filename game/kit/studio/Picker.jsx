// Choosing among what the vocabulary or the game offers: a searchable list in a popover (each option with what it is,
// its parameters, its group), a row of buttons when there are only a few short options, and chips for a list of
// choices. Options: [{ value, label?, title?, about?, group?, params? }] (label: what the value shows as, a level's
// number; title: its name; about: the vocabulary's words for it).
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Plus, X } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'

const words = (v) => (v && typeof v === 'object' ? `${v.zh ?? ''} ${v.en ?? ''}` : String(v ?? ''))
/** What an option shows: its label (or value) and its title. */
const head = (o) => (o ? `${o.label ?? String(o.value)}${o.title ? ` ${L(o.title)}` : ''}` : '')
const paramsOf = (o) => (o.params?.type === 'obj' ? Object.keys(o.params.fields) : o.params ? [o.params.type] : [])

/** Closes when a pointer goes down outside `ref`, or on Escape. */
function useDismiss(ref, open, close) {
  useEffect(() => {
    if (!open) return undefined
    const down = (e) => { if (!ref.current?.contains(e.target)) close() }
    window.addEventListener('pointerdown', down)
    return () => window.removeEventListener('pointerdown', down)
  }, [ref, open, close])
}

/** The popover's list: a search box over every word of each option, arrows and Enter to pick, Escape to leave. */
export function OptionList({ options, value, onPick, onClose, autoFocus = true }) {
  const [query, setQuery] = useState('')
  const [at, setAt] = useState(0)
  const list = useRef(null)
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? options.filter((o) => `${o.value} ${o.label ?? ''} ${words(o.title)} ${words(o.about)} ${words(o.group)}`.toLowerCase().includes(q)) : options
  }, [options, query])
  useEffect(() => { setAt(Math.max(0, shown.findIndex((o) => o.value === value))) }, [shown, value])
  useEffect(() => { list.current?.querySelector('.is-at')?.scrollIntoView({ block: 'nearest' }) }, [at])
  const key = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAt((k) => Math.min(shown.length - 1, k + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAt((k) => Math.max(0, k - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (shown[at]) onPick(shown[at].value) }
    else if (e.key === 'Escape') { e.preventDefault(); onClose() }
  }
  let group = null
  return (
    <div className="pick-pop" role="dialog">
      <input className="pick-search" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={key} autoFocus={autoFocus} placeholder={tr('搜索', 'Search')} aria-label={tr('搜索', 'Search')} />
      <ul className="pick-list" ref={list} role="listbox">
        {shown.map((o, k) => {
          const g = o.group ? L(o.group) : null
          const heading = g && g !== group ? <li key={`g ${g}`} className="pick-group">{g}</li> : null
          group = g
          return [heading, (
            <li
              key={String(o.value)} role="option" aria-selected={o.value === value}
              className={`pick-item ${k === at ? 'is-at' : ''} ${o.value === value ? 'is-on' : ''}`}
              onPointerDown={(e) => { e.preventDefault(); onPick(o.value) }} onPointerEnter={() => setAt(k)}
            >
              <span className="pick-name"><b>{o.label ?? String(o.value)}</b>{o.title && <span>{L(o.title)}</span>}{paramsOf(o).length > 0 && <code>{paramsOf(o).join(', ')}</code>}</span>
              {o.about && <span className="pick-about">{L(o.about)}</span>}
            </li>
          )]
        })}
        {!shown.length && <li className="pick-none">—</li>}
      </ul>
    </div>
  )
}

/** One value among many: a button showing the choice, a popover to search and pick. */
export function Picker({ options, value, onPick, label = '' }) {
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  useDismiss(box, open, () => setOpen(false))
  const picked = options.find((o) => o.value === value)
  return (
    <div className="pick" ref={box}>
      <button
        type="button" className={`pick-button ${picked ? '' : 'is-unknown'}`} aria-haspopup="listbox" aria-expanded={open} aria-label={label}
        onClick={() => setOpen(!open)} onKeyDown={(e) => { if (e.key === 'ArrowDown' || (e.key.length === 1 && /\w/.test(e.key))) setOpen(true) }}
      >
        <span className="pick-name"><b>{picked ? picked.label ?? String(picked.value) : value === undefined ? '—' : String(value)}</b>{picked?.title && <span>{L(picked.title)}</span>}</span>
        {picked?.about && <span className="pick-about">{L(picked.about)}</span>}
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && <OptionList options={options} value={value} onPick={(v) => { setOpen(false); onPick(v) }} onClose={() => setOpen(false)} />}
    </div>
  )
}

/** A few short options side by side. */
const few = (options) => options.length <= 5 && options.every((o) => !o.about && !o.title && String(o.label ?? o.value).length <= 12)

/** One value of a oneOf, a ref or a level: buttons when the options are few and short, else the picker. */
export function Choice({ options, value, onPick, label }) {
  if (!few(options)) return <Picker options={options} value={value} onPick={onPick} label={label} />
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" role="radio" aria-checked={o.value === value} className={o.value === value ? 'is-on' : ''} onClick={() => onPick(o.value)}>
          {o.value === null ? '—' : o.label ?? String(o.value)}
        </button>
      ))}
    </div>
  )
}

/** Several choices (a list of items, of levels): chips to remove, a picker to add one more. */
export function Chips({ options, values, onSet, label }) {
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  useDismiss(box, open, () => setOpen(false))
  const byValue = new Map(options.map((o) => [o.value, o]))
  return (
    <div className="chips" ref={box}>
      {values.map((v, k) => (
        <span key={`${v}-${k}`} className={`chip ${byValue.has(v) ? '' : 'is-unknown'}`} title={byValue.get(v)?.about ? L(byValue.get(v).about) : undefined}>
          {head(byValue.get(v)) || String(v)}
          <button type="button" onClick={() => onSet(values.filter((_, i) => i !== k))} aria-label={tr('去掉', 'Remove')}><X size={11} /></button>
        </span>
      ))}
      <button type="button" className="chip-add" onClick={() => setOpen(!open)} aria-label={`${label} +`}><Plus size={13} aria-hidden="true" /></button>
      {open && <OptionList options={options.filter((o) => !values.includes(o.value))} value={null} onPick={(v) => { setOpen(false); onSet([...values, v]) }} onClose={() => setOpen(false)} />}
    </div>
  )
}
