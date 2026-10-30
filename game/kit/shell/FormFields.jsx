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
