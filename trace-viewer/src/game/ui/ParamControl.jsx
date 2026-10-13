import { useState } from 'react'

// The controls for a part's settings: a choice, a number, or a 3×3 grid of weights. Number fields
// keep what is being typed (a lone "-", "0.") until it reads as a number, accept the full-width and
// typographic minus signs that Chinese and phone keyboards produce, and have a ± button because the
// numeric keypad on phones has no minus key.

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

const SignButton = ({ onClick, label = '正负号' }) => (
  <button type="button" className="param-sign" aria-label={label} title={label} onPointerDown={stop} onClick={onClick}>±</button>
)

export default function ParamControl({ param, value, onChange, roomy }) {
  const [focused, setFocused] = useState(4)
  if (param.kind === 'select') {
    return (
      <label className={`param ${roomy ? 'is-roomy' : ''}`}>
        <span>{param.label}</span>
        <select value={value} onChange={(e) => onChange(typeof param.options[0][0] === 'number' ? Number(e.target.value) : e.target.value)} onPointerDown={stop}>
          {param.options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
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
            <NumberInput key={i} className={i === focused ? 'is-focused' : ''} value={w} onChange={(v) => setCell(i, v)} onFocus={() => setFocused(i)} label={`权重 ${Math.floor(i / 3) + 1} 行 ${(i % 3) + 1} 列`} />
          ))}
        </div>
        <button type="button" className="param-kernel-sign" onClick={() => setCell(focused, -value[focused])}>± 选中格</button>
      </div>
    )
  }
  return (
    <label className={`param ${roomy ? 'is-roomy' : ''}`}>
      <span>{param.label}</span>
      <span className="param-number">
        <NumberInput value={value ?? 0} onChange={onChange} label={param.label} />
        <SignButton onClick={() => onChange(-(value ?? 0))} />
      </span>
    </label>
  )
}
