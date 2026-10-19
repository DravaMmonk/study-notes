import { useState } from 'react'
import { Choice } from '../../../../games/kit/circuit/index.js'
import { L, tr } from '../../../../games/kit/shell/i18n.js'

// The controls for a part's settings on the desktop board: a choice (a menu, or buttons), a number, or a 3×3 grid of
// weights.
// Number fields keep what is being typed (a lone "-", "0.") until it reads as a number and accept the
// full-width and typographic minus signs that Chinese keyboards produce, so a minus is simply typed.
// (Phones edit numbers on their own keypad, which has a ± key.)

const stop = (event) => event.stopPropagation()
const parse = (text) => {
  const clean = text.trim().replace(/[−－–—]/g, '-').replace(/。/g, '.')
  if (clean === '' || clean === '-' || clean === '.' || clean === '-.') return null
  const n = Number(clean)
  return Number.isFinite(n) ? n : null
}
const show = (v) => String(Number(Number(v).toFixed(4)))

export function NumberInput({ value, onChange, label, className, onFocus }) {
  const [draft, setDraft] = useState(null)
  return (
    <input
      className={className}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      enterKeyHint="done"
      value={draft ?? show(value)}
      aria-label={label}
      onPointerDown={stop}
      onFocus={(event) => {
        event.target.select()
        onFocus?.()
      }}
      onChange={(event) => {
        setDraft(event.target.value)
        const n = parse(event.target.value)
        if (n !== null) onChange(n)
      }}
      onBlur={() => setDraft(null)}
    />
  )
}

export default function ParamControl({ param, value, onChange, roomy, style }) {
  if (param.kind === 'select' && param.buttons) return <Choice options={param.options} value={value ?? param.default} onChange={onChange} label={param.label} layout={param.buttons} style={style} />
  if (param.kind === 'select') {
    return (
      <label className={`param ${roomy ? 'is-roomy' : ''}`}>
        <span>{L(param.label)}</span>
        <select value={value} onChange={(e) => onChange(typeof param.options[0][0] === 'number' ? Number(e.target.value) : e.target.value)} onPointerDown={stop}>
          {param.options.map(([v, text]) => <option key={v} value={v}>{L(text)}</option>)}
        </select>
      </label>
    )
  }
  if (param.kind === 'kernel') {
    if (param.learnable) {
      return (
        <div className={`param-kernel is-learned ${roomy ? 'is-roomy' : ''}`} onPointerDown={stop}>
          {value.map((w, i) => <output key={i} style={{ '--w': Math.max(-1, Math.min(1, w)) }}>{w.toFixed(2)}</output>)}
        </div>
      )
    }
    const setCell = (i, v) => onChange(value.map((x, j) => (j === i ? v : x)))
    return (
      <div className={`param-kernel-wrap ${roomy ? 'is-roomy' : ''}`} onPointerDown={stop}>
        <div className="param-kernel">
          {value.map((w, i) => (
            <NumberInput key={i} value={w} onChange={(v) => setCell(i, v)} label={tr(`权重 ${Math.floor(i / 3) + 1} 行 ${(i % 3) + 1} 列`, `Weight, row ${Math.floor(i / 3) + 1}, column ${(i % 3) + 1}`)} />
          ))}
        </div>
      </div>
    )
  }
  return (
    <label className={`param ${roomy ? 'is-roomy' : ''}`}>
      <span>{L(param.label)}</span>
      <span className="param-number">
        <NumberInput value={value ?? 0} onChange={onChange} label={L(param.label)} />
      </span>
    </label>
  )
}
