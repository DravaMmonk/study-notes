import { L } from './i18n.js'

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


/** One of a few values, in a cell: a button that steps to the next; with none chosen yet it says `unset`. */
export function InlineChoice({ value, options, onChange, unset }) {
  const at = options.findIndex((o) => o.value === value)
  return (
    <button type="button" className={`ff-inline-choice ${at < 0 ? 'is-unset' : ''}`} onClick={(e) => { e.stopPropagation(); onChange(options[(at + 1) % options.length].value) }}>{at < 0 ? L(unset) : L(options[at].label)}</button>
  )
}
