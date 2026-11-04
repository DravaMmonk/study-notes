import { L } from '../shell/i18n.js'

// A setting chosen with buttons instead of a menu, the same in every game: a row that wraps, a column, a cross of four
// directions (`layout` 'pad', options keyed up, left, right, down) or two by two ('grid'). `roomy` makes phone-sized
// targets. An option is [value, text, Icon?, about?]: with an icon the text is its name, shown on hover.
export default function Choice({ options, value, onChange, label, layout = 'row', roomy = false, disabled = false, style }) {
  return (
    <div className={`choice is-${layout} ${roomy ? 'is-roomy' : ''}`} role="radiogroup" aria-label={L(label)} style={style} onPointerDown={(e) => e.stopPropagation()}>
      {options.map(([v, text, Icon, about]) => <button key={String(v)} type="button" role="radio" aria-checked={value === v} data-v={v} disabled={disabled} aria-label={Icon ? L(text) : undefined} title={about ? L(about) : Icon ? L(text) : undefined} onClick={() => onChange(v)}>{Icon ? <Icon size={roomy ? 18 : 12} aria-hidden="true" /> : L(text)}</button>)}
    </div>
  )
}
