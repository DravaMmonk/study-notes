import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, X } from 'lucide-react'
import { L, tr } from './i18n.js'

// The fields of a row's form (RowTable.jsx), the same in every game. Each is a labelled block; values are the game's
// own (sentences, names…), options [{ value, label }] with labels as { zh, en } pairs or strings.

/** A labelled block of a form. */
export function Field({ label, children }) {
  return (
    <div className="ff-field">
      <span className="ff-label">{L(label)}</span>
      {children}
    </div>
  )
}

/** Several values chosen in order: each listed (numbered) with × to take it off, and a drop-down adding the rest. */
export function ListField({ label, value, options, onChange, addLabel, none }) {
  const name = (v) => L(options.find((o) => o.value === v)?.label ?? v)
  const rest = options.filter((o) => !value.includes(o.value))
  return (
    <Field label={label}>
      <ol className="ff-list">
        {value.map((v, i) => (
          <li key={v}>
            <span>{`${i + 1}. ${name(v)}`}</span>
            <button type="button" aria-label={tr('移除', 'Remove')} onClick={() => onChange(value.filter((x) => x !== v))}><X size={15} /></button>
          </li>
        ))}
        {!value.length && none && <li className="ff-none">{L(none)}</li>}
      </ol>
      {rest.length > 0 && (
        <select className="ff-select" value="" onChange={(e) => e.target.value && onChange([...value, e.target.value])}>
          <option value="">{L(addLabel)}</option>
          {rest.map((o) => <option key={o.value} value={o.value}>{L(o.label)}</option>)}
        </select>
      )}
    </Field>
  )
}

/** One value from a drop-down. */
export function SelectField({ label, value, options, onChange }) {
  return (
    <Field label={label}>
      <select className="ff-select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{L(o.label)}</option>)}
      </select>
    </Field>
  )
}

/** One of a few values, as buttons side by side. */
export function ChoiceField({ label, value, options, onChange }) {
  return (
    <Field label={label}>
      <div className="ff-choice" role="radiogroup">
        {options.map((o) => (
          <button key={String(o.value)} type="button" role="radio" aria-checked={o.value === value} className={o.value === value ? 'is-on' : ''} onClick={() => onChange(o.value)}>{L(o.label)}</button>
        ))}
      </div>
    </Field>
  )
}

// The same fields small, inside a table cell (RowTable on a desktop, editing in place): no label of their own.

/**
 * A menu of choices under a button, the same wherever it opens (a native drop-down opens up or down as the system
 * places it): picking one calls onPick(value); a click elsewhere or Escape closes it.
 */
export function AddMenu({ label, options, onPick, small = false }) {
  const [open, setOpen] = useState(null) // where the list goes: under the button, { top, left, width }
  const box = useRef(null)
  const list = useRef(null)
  // The list floats over the page (a table scrolls inside its own window, which would cut it off), always under the
  // button, scrolling when the page leaves it little room.
  const toggle = () => {
    if (open) return setOpen(null)
    const r = box.current.getBoundingClientRect()
    return setOpen({ top: r.bottom + 4, left: r.left, width: r.width })
  }
  useEffect(() => {
    if (!open) return undefined
    const away = (e) => !box.current?.contains(e.target) && !list.current?.contains(e.target) && setOpen(null)
    const key = (e) => e.key === 'Escape' && setOpen(null)
    const shut = () => setOpen(null)
    window.addEventListener('pointerdown', away)
    window.addEventListener('keydown', key)
    window.addEventListener('scroll', shut, true)
    window.addEventListener('resize', shut)
    return () => {
      window.removeEventListener('pointerdown', away)
      window.removeEventListener('keydown', key)
      window.removeEventListener('scroll', shut, true)
      window.removeEventListener('resize', shut)
    }
  }, [open])
  return (
    <span className={`ff-menu ${small ? 'is-small' : ''}`} ref={box}>
      <button type="button" className="ff-menu-button" aria-haspopup="listbox" aria-expanded={Boolean(open)} onClick={(e) => { e.stopPropagation(); toggle() }}>
        {L(label)}<ChevronDown size={small ? 11 : 13} />
      </button>
      {open && createPortal(
        <ul className="ff-menu-list" role="listbox" ref={list} style={{ top: open.top, left: open.left, minWidth: open.width, maxHeight: Math.max(120, window.innerHeight - open.top - 8) }}>
          {options.map((o) => (
            <li key={o.value} role="option" aria-selected={false}>
              <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(null); onPick(o.value) }}>{L(o.label)}</button>
            </li>
          ))}
        </ul>,
        document.body,
      )}
    </span>
  )
}

/**
 * Several values in order, in a cell: each with ×, and a menu adding the rest. With none yet the menu says what it
 * adds; once there is one, it is a small 「添加…」 button on the last value's line. Both open the same way.
 */
export function InlineList({ value, options, onChange, addLabel }) {
  const name = (v) => L(options.find((o) => o.value === v)?.label ?? v)
  const rest = options.filter((o) => !value.includes(o.value))
  const adding = (small) => rest.length > 0 && <AddMenu small={small} label={small ? { zh: '添加…', en: 'Add…' } : addLabel} options={rest} onPick={(v) => onChange([...value, v])} />
  return (
    <div className="ff-inline-list">
      {value.map((v, i) => (
        <span key={v}>
          {`${i + 1}. ${name(v)}`}
          <button type="button" aria-label={tr('移除', 'Remove')} onClick={(e) => { e.stopPropagation(); onChange(value.filter((x) => x !== v)) }}><X size={12} /></button>
          {i === value.length - 1 && adding(true)}
        </span>
      ))}
      {!value.length && adding(false)}
    </div>
  )
}

/** One value from a drop-down, in a cell. */
export function InlineSelect({ value, options, onChange }) {
  return (
    <select className="ff-inline-select" value={value} onClick={(e) => e.stopPropagation()} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => <option key={o.value} value={o.value}>{L(o.label)}</option>)}
    </select>
  )
}

/** One of a few values, in a cell: a button that steps to the next. */
export function InlineChoice({ value, options, onChange }) {
  const at = Math.max(0, options.findIndex((o) => o.value === value))
  return (
    <button type="button" className="ff-inline-choice" onClick={(e) => { e.stopPropagation(); onChange(options[(at + 1) % options.length].value) }}>{L(options[at].label)}</button>
  )
}
