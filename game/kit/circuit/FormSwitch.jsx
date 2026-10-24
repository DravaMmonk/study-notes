import { L, tr } from '../shell/i18n.js'

// The option on a card that switches a part with several forms (engine/forms.js) between the shapes it offers here:
// [{ key, label }]. With one shape there is nothing to switch, and it shows that shape alone.
export default function FormSwitch({ value, options, onChange, label = { zh: '形状', en: 'Shape' } }) {
  return (
    <div className="form-switch" onPointerDown={(e) => e.stopPropagation()}>
      <label>
        <span>{L(label)}</span>
        {options.length > 1
          ? <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={tr('切换形状', 'Switch shape')}>{options.map((o) => <option key={o.key} value={o.key}>{L(o.label)}</option>)}</select>
          : <b>{L(options[0]?.label)}</b>}
      </label>
    </div>
  )
}
