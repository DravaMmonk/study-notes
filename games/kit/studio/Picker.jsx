// Choosing among what the vocabulary or the game offers: a searchable list in a popover (each option with what it is,
// its parameters, its group), a row of buttons when there are only a few short options, and chips for a list of
// choices. Options: [{ value, label?, title?, about?, group?, params? }] (label: what the value shows as, a level's
// number; title: its name; about: the vocabulary's words for it).
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Plus, X } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'
import { useOverlay } from '../shell/useOverlay.js'
import { useListCursor } from './useListCursor.js'

const words = (v) => (v && typeof v === 'object' ? `${v.zh ?? ''} ${v.en ?? ''}` : String(v ?? ''))
/** What an option shows: its label (or value) and its title. */
const head = (o) => (o ? `${o.label ?? String(o.value)}${o.title ? ` ${L(o.title)}` : ''}` : '')
const paramsOf = (o) => (o.params?.type === 'obj' ? Object.keys(o.params.fields) : o.params ? [o.params.type] : [])

/** The popover's list: a search box (starting at `query`) over every word of each option, arrows and Enter to pick, Escape to leave. */
export function OptionList({ options, value, onPick, onClose, anchor, onOutside = onClose, floating = false, autoFocus = true, query: first = '' }) {
  const [query, setQuery] = useState(first)
  const overlay = useOverlay(onClose, { onOutside, anchor: () => anchor.current })
  useLayoutEffect(() => {
    if (!floating) return undefined
    const node = overlay.current
    const trigger = anchor.current
    const position = () => {
      const rect = trigger.getBoundingClientRect()
      const panel = trigger.closest('.studio-tree, .studio-side')?.getBoundingClientRect()
      const width = Math.min(460, (panel?.width ?? window.innerWidth) - 16)
      const spaceBelow = window.innerHeight - rect.bottom - 8
      const openAbove = spaceBelow < 220 && rect.top > spaceBelow
      Object.assign(node.style, {
        width: `${width}px`,
        left: `${Math.max(8, Math.min(rect.left, (panel?.right ?? window.innerWidth) - width - 8))}px`,
        top: openAbove ? 'auto' : `${rect.bottom + 4}px`,
        bottom: openAbove ? `${window.innerHeight - rect.top + 4}px` : 'auto',
        maxHeight: `${Math.min(360, openAbove ? rect.top - 8 : spaceBelow)}px`,
      })
    }
    position()
    window.addEventListener('resize', position)
    window.addEventListener('scroll', position, true)
    return () => {
      window.removeEventListener('resize', position)
      window.removeEventListener('scroll', position, true)
    }
  }, [anchor, floating, overlay])
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? options.filter((o) => `${o.value} ${o.label ?? ''} ${words(o.title)} ${words(o.about)} ${words(o.group)}`.toLowerCase().includes(q)) : options
  }, [options, query])
  const { at, setAt, list, onKeyDown } = useListCursor(shown, {
    initial: Math.max(0, shown.findIndex((o) => o.value === value)),
    onConfirm: (option) => { if (option) onPick(option.value) },
  })
  let group = null
  return (
    <div ref={overlay} className={`pick-pop ${floating ? 'is-floating' : ''}`} role="dialog">
      <input className="pick-search" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onKeyDown} autoFocus={autoFocus} placeholder={tr('搜索')} aria-label={tr('搜索')} />
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
export function Picker({ options, value, onPick, label = '', placeholder = '—', add = false }) {
  const [open, setOpen] = useState(false)
  const [submenu, setSubmenu] = useState(null)
  const box = useRef(null)
  const picked = options.find((o) => o.value === value)
  const close = () => { setOpen(false); setSubmenu(null) }
  const choose = (key) => {
    const choice = (submenu ?? options).find((o) => o.value === key)
    if (choice?.children) setSubmenu(choice.children)
    else { close(); onPick(key) }
  }
  return (
    <div className="pick" ref={box}>
      <button
        type="button" className={`pick-button ${value !== undefined && !picked ? 'is-unknown' : ''}`} aria-haspopup="listbox" aria-expanded={open} aria-label={label}
        onClick={() => open ? close() : setOpen(true)} onKeyDown={(e) => { if (e.key === 'ArrowDown' || (e.key.length === 1 && /\w/.test(e.key))) setOpen(true) }}
      >
        {add && <Plus size={13} aria-hidden="true" />}
        <span className="pick-name"><b>{picked ? picked.label ?? String(picked.value) : value === undefined ? placeholder : String(value)}</b>{picked?.title && <span>{L(picked.title)}</span>}</span>
        {picked?.about && <span className="pick-about">{L(picked.about)}</span>}
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && <OptionList key={submenu ? 'submenu' : 'menu'} floating anchor={box} options={submenu ?? options} value={submenu ? undefined : value}
        onPick={choose} onClose={close} />}
    </div>
  )
}

/** The shared creation button, with the same overlay for its available actions. */
export function AddMenu({ label = tr('新增', 'Add'), options, onPick }) {
  if (!options.length) return null
  return <Picker add options={options} onPick={onPick} label={label} placeholder={label} />
}

/** Add a key with a name entered by the author. */
export function AddKey({ taken, onAdd, label = tr('新键', 'New key') }) {
  const [editing, setEditing] = useState(false)
  const cancel = () => setEditing(false)
  if (!editing) return <AddMenu options={[{ value: 'key', label }]} onPick={() => setEditing(true)} />
  return (
    <form className="field-row new-key" onSubmit={(event) => {
      event.preventDefault()
      const key = event.currentTarget.elements.key.value.trim()
      if (!key || taken.includes(key)) return
      onAdd(key)
      cancel()
    }}>
      <input className="field-input is-key" name="key" autoFocus required aria-label={label} placeholder={label} onKeyDown={(event) => {
        if (event.key === 'Escape') { event.stopPropagation(); cancel() }
      }} />
      <button type="submit" className="kit-btn is-label">{tr('添加', 'Add')}</button>
      <button type="button" className="kit-btn is-label" onClick={cancel}>{tr('取消', 'Cancel')}</button>
    </form>
  )
}

/** Several choices (a list of items, of levels): chips to remove, a picker to add one more. */
export function Chips({ options, values, onSet, label }) {
  const byValue = new Map(options.map((o) => [o.value, o]))
  return (
    <div className="chips">
      {values.map((v, k) => (
        <span key={`${v}-${k}`} className={`chip ${byValue.has(v) ? '' : 'is-unknown'}`} title={byValue.get(v)?.about ? L(byValue.get(v).about) : undefined}>
          {head(byValue.get(v)) || String(v)}
          <button type="button" onClick={() => onSet(values.filter((_, i) => i !== k))} aria-label={tr('去掉')}><X size={11} /></button>
        </span>
      ))}
      <AddMenu label={label ? `${tr('新增', 'Add')} · ${label}` : undefined} options={options.filter((o) => !values.includes(o.value))} onPick={(v) => onSet([...values, v])} />
    </div>
  )
}
