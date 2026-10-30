import { X } from 'lucide-react'
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
 * Several values in order, in a cell: each with ×, and a drop-down adding the rest. With none yet the drop-down says
 * what it adds; once there is one, it is a small 「添加…」 button on the last value's line.
 */
export function InlineList({ value, options, onChange, addLabel }) {
  const name = (v) => L(options.find((o) => o.value === v)?.label ?? v)
  const rest = options.filter((o) => !value.includes(o.value))
  const select = (className, first) => (
    <select className={className} value="" aria-label={L(addLabel)} onClick={(e) => e.stopPropagation()} onChange={(e) => e.target.value && onChange([...value, e.target.value])}>
      <option value="">{first}</option>
      {rest.map((o) => <option key={o.value} value={o.value}>{L(o.label)}</option>)}
    </select>
  )
  // The small button is its words, with the drop-down laid invisibly over them (a drop-down is as wide as its longest
  // choice).
  const adding = (small) => rest.length > 0 && (small
    ? <label className="ff-inline-add"><span>{tr('添加…', 'Add…')}</span>{select('', tr('添加…', 'Add…'))}</label>
    : select('ff-inline-select', L(addLabel)))
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
