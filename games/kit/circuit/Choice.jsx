import { L } from '../shell/i18n.js'

// A setting chosen with buttons instead of a menu, the same in every game: a row that wraps, a cross of four
// directions (`layout` 'pad', options keyed up, left, right, down) or two by two ('grid'). `roomy` makes phone-sized targets.
export default function Choice({ options, value, onChange, label, layout = 'row', roomy = false, style }) {
  return (
    <div className={`choice is-${layout} ${roomy ? 'is-roomy' : ''}`} role="radiogroup" aria-label={L(label)} style={style} onPointerDown={(e) => e.stopPropagation()}>
      {options.map(([v, text]) => <button key={String(v)} type="button" role="radio" aria-checked={value === v} data-v={v} onClick={() => onChange(v)}>{L(text)}</button>)}
    </div>
  )
}
