import { useState } from 'react'
import { Delete, Minus, Plus } from 'lucide-react'
import { Choice } from '../../../../../games/kit/circuit/index.js'
import { L, tr } from '../../../../../games/kit/shell/i18n.js'
import { piText, timesPi } from '../../engine/pi.js'

// Setting editors for the phone. A block's sheet sets everything in place (InlineParam): choices are buttons, a number
// has a slider and step keys, a kernel's cells are stepped one at a time, and learned weights are shown. Typing an
// exact number opens the game's own keypad (it has the minus key the phone's numeric keyboard lacks) in a sheet of
// its own.

const show = (v) => piText(Number(v ?? 0)) ?? String(Number(Number(v ?? 0).toFixed(4)))
const decimals = (step) => (String(step).split('.')[1] ?? '').length
const buzz = () => navigator.vibrate?.(6)

export function Keypad({ value, onChange, step = 0.1, min, max, pi = false }) {
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
    if (key === 'π') {
      // π turns what is there into that many π; the next digit starts afresh.
      const v = timesPi(Number(draft) || (piText(value ?? 0) ? value : 0))
      onChange(v)
      setDraft(show(v))
      return setFresh(true)
    }
    const next = Number(((Number(draft) || 0) + (key === '+' ? step : -step)).toFixed(decimals(step) + 1))
    const bounded = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, next))
    return commit(show(bounded))
  }
  const keys = ['7', '8', '9', 'back', '4', '5', '6', '±', '1', '2', '3', '.', 'clear', '0', '-', '+', ...(pi ? ['π'] : [])]
  const label = { back: <Delete size={20} />, clear: tr('清零', 'Clear'), '-': `−${step}`, '+': `＋${step}`, '±': '±' }
  return (
    <div className="ph-keypad-wrap">
      <output className="ph-keypad-value" aria-live="polite">{draft}</output>
      <div className="ph-keypad" role="group" aria-label={tr('数字键盘', 'Number keypad')}>
        {keys.map((key) => (
          <button key={key} className={`ph-key ${/\d/.test(key) ? '' : 'is-fn'} ${key === '±' ? 'is-sign' : ''} ${key === 'π' ? 'is-pi' : ''}`} onClick={() => press(key)} aria-label={key === 'back' ? tr('删除一位', 'Delete a digit') : key === 'clear' ? tr('清零', 'Clear') : key === '±' ? tr('正负号', 'Change sign') : key === '-' ? tr(`减 ${step}`, `Minus ${step}`) : key === '+' ? tr(`加 ${step}`, `Plus ${step}`) : key}>
            {label[key] ?? key}
          </button>
        ))}
      </div>
    </div>
  )
}

export function NumberEditor({ param, value, onChange }) {
  const step = param.step ?? 0.1
  const has = Number.isFinite(param.min) && Number.isFinite(param.max) && (param.max - param.min) / step <= 2000
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
      <Keypad key={key} value={value} onChange={onChange} step={step} min={param.min} max={param.max} pi={param.pi} />
    </div>
  )
}

export function KernelEditor({ param, value, onChange, start = 4 }) {
  const [cell, setCell] = useState(start)
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

// A step key and the value between them, which opens the keypad.
function Stepper({ value, step, min, max, label, onChange, onKeypad }) {
  const nudge = (sign) => {
    buzz()
    const next = Number(((value ?? 0) + sign * step).toFixed(decimals(step) + 1))
    onChange(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, next)))
  }
  return (
    <>
      <button className="ph-step" onClick={() => nudge(-1)} aria-label={tr(`减 ${step}`, `Minus ${step}`)}><Minus size={18} /></button>
      <button className="ph-step-value" onClick={onKeypad} aria-label={tr(`${label}：${show(value)}，点一下用键盘输入`, `${label}: ${show(value)}, tap to type`)}>{show(value)}</button>
      <button className="ph-step" onClick={() => nudge(1)} aria-label={tr(`加 ${step}`, `Plus ${step}`)}><Plus size={18} /></button>
    </>
  )
}

/** A setting set right in a block's sheet. `onKeypad(cell)` opens the keypad for a number (or a kernel's cell). */
export function InlineParam({ param, value, onChange, onKeypad }) {
  const [cell, setCell] = useState(4)
  const label = L(param.label)
  if (param.kind === 'select') return <Choice options={param.options} value={value} onChange={(v) => { buzz(); onChange(v) }} label={param.label} layout={param.buttons ?? 'row'} roomy />
  if (param.kind === 'kernel' && param.learnable) return <KernelEditor param={param} value={value} />
  if (param.kind === 'kernel') {
    return (
      <div className="ph-kernel-edit">
        <div className="ph-kernel is-compact" role="group" aria-label={tr('3×3 权重', '3×3 weights')}>
          {value.map((w, i) => (
            <button key={i} className={i === cell ? 'is-on' : ''} style={{ '--w': Math.max(-1, Math.min(1, w)) }} onClick={() => { buzz(); setCell(i) }} aria-label={tr(`第 ${Math.floor(i / 3) + 1} 行第 ${(i % 3) + 1} 列，${show(w)}`, `Row ${Math.floor(i / 3) + 1}, column ${(i % 3) + 1}: ${show(w)}`)}>
              {show(w)}
            </button>
          ))}
        </div>
        <div className="ph-inline-number">
          <span>{tr(`第 ${Math.floor(cell / 3) + 1} 行第 ${(cell % 3) + 1} 列`, `Row ${Math.floor(cell / 3) + 1}, col ${(cell % 3) + 1}`)}</span>
          <Stepper value={value[cell]} step={0.05} label={label} onChange={(v) => onChange(value.map((x, j) => (j === cell ? v : x)))} onKeypad={() => onKeypad(cell)} />
        </div>
      </div>
    )
  }
  const step = param.step ?? 0.1
  // A slider only where it has a sensible number of stops; a wide range (a constant) is typed or nudged.
  const has = Number.isFinite(param.min) && Number.isFinite(param.max) && (param.max - param.min) / step <= 2000
  return (
    <div className="ph-inline-number">
      {has && <input className="bk-range ph-slider" type="range" min={param.min} max={param.max} step={step} value={value ?? 0} style={{ '--fill': `${(((value ?? 0) - param.min) / (param.max - param.min)) * 100}%` }} onChange={(event) => onChange(Number(event.target.value))} aria-label={label} />}
      <Stepper value={value} step={step} min={param.min} max={param.max} label={label} onChange={onChange} onKeypad={() => onKeypad(null)} />
    </div>
  )
}
