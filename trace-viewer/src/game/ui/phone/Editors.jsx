import { useState } from 'react'
import { Delete } from 'lucide-react'
import { L, tr } from '../../i18n.js'

// Setting editors for the phone. Numbers are typed on the game's own keypad (it has the minus key
// the phone's numeric keyboard lacks) or nudged by the slider and the step keys; choices are big
// buttons; a 3×3 kernel is nine big cells sharing one keypad.

const show = (v) => String(Number(Number(v ?? 0).toFixed(4)))
const decimals = (step) => (String(step).split('.')[1] ?? '').length
const buzz = () => navigator.vibrate?.(6)

export function Keypad({ value, onChange, step = 0.1, min, max }) {
  const [draft, setDraft] = useState(show(value))
  // Like a calculator, the first digit typed replaces the value shown; later ones extend it.
  const [fresh, setFresh] = useState(true)
  const commit = (text) => {
    setDraft(text)
    setFresh(false)
    const n = Number(text)
    if (text !== '-' && text !== '' && text !== '-0.' && Number.isFinite(n)) onChange(n)
  }
  const press = (key) => {
    buzz()
    if (/\d/.test(key)) return commit(fresh || draft === '0' ? key : draft === '-0' ? `-${key}` : draft + key)
    if (key === '.') return commit(fresh ? '0.' : draft.includes('.') ? draft : `${draft || '0'}.`)
    if (key === '±') return commit(draft.startsWith('-') ? draft.slice(1) : `-${draft}`)
    if (key === 'back') return commit(draft.length > 1 && draft !== '-0' ? draft.slice(0, -1).replace(/^-$/, '-0') : '0')
    if (key === 'clear') return commit('0')
    const next = Number(((Number(draft) || 0) + (key === '+' ? step : -step)).toFixed(decimals(step) + 1))
    const bounded = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, next))
    return commit(show(bounded))
  }
  const keys = ['7', '8', '9', 'back', '4', '5', '6', '±', '1', '2', '3', '.', 'clear', '0', '-', '+']
  const label = { back: <Delete size={20} />, clear: tr('清零', 'Clear'), '-': `−${step}`, '+': `＋${step}`, '±': '±' }
  return (
    <div className="ph-keypad-wrap">
      <output className="ph-keypad-value" aria-live="polite">{draft}</output>
      <div className="ph-keypad" role="group" aria-label={tr('数字键盘', 'Number keypad')}>
        {keys.map((key) => (
          <button key={key} className={`ph-key ${/\d/.test(key) ? '' : 'is-fn'} ${key === '±' ? 'is-sign' : ''}`} onClick={() => press(key)} aria-label={key === 'back' ? tr('删除一位', 'Delete a digit') : key === 'clear' ? tr('清零', 'Clear') : key === '±' ? tr('正负号', 'Change sign') : key === '-' ? tr(`减 ${step}`, `Minus ${step}`) : key === '+' ? tr(`加 ${step}`, `Plus ${step}`) : key}>
            {label[key] ?? key}
          </button>
        ))}
      </div>
    </div>
  )
}

export function NumberEditor({ param, value, onChange }) {
  const has = Number.isFinite(param.min) && Number.isFinite(param.max)
  const step = param.step ?? 0.1
  const [key, setKey] = useState(0)
  const slide = (v) => {
    onChange(v)
    setKey((k) => k + 1) // the keypad restarts from the slid value
  }
  return (
    <div className="ph-number">
      {has && (
        <input className="bk-range ph-slider" type="range" min={param.min} max={param.max} step={step} value={value ?? 0} style={{ '--fill': `${(((value ?? 0) - param.min) / (param.max - param.min)) * 100}%` }} onChange={(event) => slide(Number(event.target.value))} aria-label={L(param.label)} />
      )}
      <Keypad key={key} value={value} onChange={onChange} step={step} min={param.min} max={param.max} />
    </div>
  )
}

export function ChoiceEditor({ param, value, onChange }) {
  return (
    <div className="ph-choices" role="radiogroup" aria-label={L(param.label)}>
      {param.options.map(([v, text]) => (
        <button key={v} role="radio" aria-checked={value === v} className={value === v ? 'is-on' : ''} onClick={() => { buzz(); onChange(v) }}>{L(text)}</button>
      ))}
    </div>
  )
}

export function KernelEditor({ param, value, onChange }) {
  const [cell, setCell] = useState(4)
  if (param.learnable) {
    return (
      <div className="ph-kernel is-learned">
        {value.map((w, i) => <span key={i} style={{ '--w': Math.max(-1, Math.min(1, w)) }}>{w.toFixed(2)}</span>)}
        <p>{tr('这些权重由训练决定，不能手调。', 'These weights are set by training and cannot be adjusted by hand.')}</p>
      </div>
    )
  }
  return (
    <div className="ph-kernel-edit">
      <div className="ph-kernel" role="group" aria-label={tr('3×3 权重', '3×3 weights')}>
        {value.map((w, i) => (
          <button key={i} className={i === cell ? 'is-on' : ''} style={{ '--w': Math.max(-1, Math.min(1, w)) }} onClick={() => { buzz(); setCell(i) }} aria-label={tr(`第 ${Math.floor(i / 3) + 1} 行第 ${(i % 3) + 1} 列，${show(w)}`, `Row ${Math.floor(i / 3) + 1}, column ${(i % 3) + 1}: ${show(w)}`)}>
            {show(w)}
          </button>
        ))}
      </div>
      <Keypad key={cell} value={value[cell]} step={0.05} onChange={(v) => onChange(value.map((x, j) => (j === cell ? v : x)))} />
    </div>
  )
}
