import { formatValue, knobKind } from './../../core/bench.js'
import { L } from 'kernel/view'
import { useMark } from 'kernel/view'
import { Rich } from './Rich.jsx'

/**
 * One knob's control; `value` and `onChange` default to the knob's own value in the bench. A range may show its own
 * `output` and a `mark` on its track (0 … 1, a budget, say).
 */
export default function Knob({ name, ctx, value = ctx.values[name], onChange = (x) => ctx.set(name, x), label, output, mark }) {
  const knob = ctx.bench.knobs[name]
  const disabled = ctx.busy || knob.fixed
  const title = label ?? knob.label
  const kind = knobKind(knob)
  const editKnob = useMark()(`bench.knobs.${name}`)
  if (kind === 'toggle') {
    return <label className="bk-check"><input type="checkbox" checked={Boolean(value)} disabled={disabled} onChange={(e) => onChange(e.target.checked)} /> <span {...editKnob}><Rich text={title} /></span></label>
  }
  if (kind === 'choice') {
    const dot = knob.look === 'dot'
    const biggest = Math.max(...knob.choices.map((c) => Math.abs(Number(c.value)) || 0))
    return (
      <div className="bench-choice">
        {title && <span className="bk-label" {...editKnob}><Rich text={title} /></span>}
        <div className={`bk-seg bench-seg ${dot ? 'is-dots' : ''}`} role="radiogroup" aria-label={L(title) ?? name}>
          {knob.choices.map((c) => (
            <button key={String(c.value)} type="button" role="radio" aria-checked={value === c.value} aria-pressed={value === c.value} disabled={disabled} onClick={() => onChange(c.value)}>
              {dot && <svg viewBox="-14 -14 28 28" aria-hidden="true"><circle r={(Number(c.value) / biggest) * 11.5} /></svg>}
              <span>{c.label !== undefined ? <Rich text={c.label} /> : `${c.value}${knob.unit ?? ''}`}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }
  const index = kind === 'index'
  const [min, max, step] = index ? [0, knob.values.length - 1, 1] : [knob.min, knob.max, knob.step]
  const range = <input className="bk-range" type="range" min={min} max={max} step={step} value={value} disabled={disabled} aria-label={L(title) ?? name} style={{ '--fill': `${((value - min) / (max - min)) * 100}%` }} onChange={(e) => onChange(Number(e.target.value))} />
  const input = mark === undefined ? range : <span className="bench-track" style={{ '--mark': mark }}><i />{range}</span>
  if (knob.ends) return <label className="bk-field bench-ends"><span {...editKnob}><Rich text={knob.ends[0]} /></span>{input}<span><Rich text={knob.ends[1]} /></span></label>
  return (
    <label className="bk-field">
      <span {...editKnob}><Rich text={title} /></span>
      {input}
      {output ?? <output>{formatValue(index ? knob.values[value] : value, knob.format ?? 'raw', knob.unit ?? '')}</output>}
    </label>
  )
}

