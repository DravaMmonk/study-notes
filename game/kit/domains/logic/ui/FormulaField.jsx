import { useRef } from 'react'
import { L } from '../../../shell/i18n.js'

// A formula typed on a card. ASCII becomes the symbols as it is typed (-> → & ∧ | ∨ ~ ¬ <-> ↔); `keys` adds a row of
// symbol keys, for a phone.
const ASCII = [['<->', '↔'], ['->', '→'], ['&', '∧'], ['|', '∨'], ['~', '¬'], ['!', '¬']]
export const symbolize = (text) => ASCII.reduce((s, [a, b]) => s.split(a).join(b), text)
const SYMBOLS = ['→', '∧', '∨', '¬', '↔', '⊥', '(', ')']

export default function FormulaField({ label, value = '', onChange, keys = false }) {
  const input = useRef(null)
  const insert = (sym) => {
    const el = input.current
    const [a, b] = [el.selectionStart ?? value.length, el.selectionEnd ?? value.length]
    onChange(value.slice(0, a) + sym + value.slice(b))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(a + sym.length, a + sym.length)
    })
  }
  return (
    <div className="lg-field" onPointerDown={(e) => e.stopPropagation()}>
      <label>
        <span>{L(label)}</span>
        <input ref={input} value={value} onChange={(e) => onChange(symbolize(e.target.value))} spellCheck={false} autoComplete="off" autoCapitalize="off" />
      </label>
      {keys && (
        <span className="lg-keys">
          {SYMBOLS.map((s) => <button key={s} type="button" onPointerDown={(e) => e.preventDefault()} onClick={() => insert(s)}>{s}</button>)}
        </span>
      )}
    </div>
  )
}
