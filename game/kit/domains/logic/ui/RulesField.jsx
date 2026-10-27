import { X } from 'lucide-react'
import { L, tr } from '../../../shell/i18n.js'

// A list of rules on a card, in order (simp's rewrite rules): each by its name, with a button that takes it off, and a
// choice that adds one more at the end. The value is their keys, comma-separated.
export default function RulesField({ label, value = '', onChange, groups }) {
  const keys = value.split(',').filter(Boolean)
  const byKey = new Map(groups.flatMap((g) => g.options).map((o) => [o.value, o]))
  const set = (list) => onChange(list.join(','))
  return (
    <div className="lg-field lg-rules-field" onPointerDown={(e) => e.stopPropagation()}>
      <span className="lg-rules-label">{L(label)}</span>
      {keys.length > 0 && (
        <ol className="lg-rules">
          {keys.map((k, i) => (
            <li key={k}>
              <span>{byKey.get(k) ? L(byKey.get(k).label) : k}</span>
              <button type="button" aria-label={tr('拿掉', 'Remove')} onClick={() => set(keys.filter((_, j) => j !== i))}><X size={12} /></button>
            </li>
          ))}
        </ol>
      )}
      <select value="" onChange={(e) => e.target.value && set([...keys, e.target.value])}>
        <option value="">{keys.length ? tr('再加一条', 'Add one more') : tr('加一条', 'Add one')}</option>
        {groups.map((g) => (
          <optgroup key={L(g.label)} label={L(g.label)}>
            {g.options.filter((o) => !keys.includes(o.value)).map((o) => <option key={o.value} value={o.value}>{L(o.label)}</option>)}
          </optgroup>
        ))}
      </select>
    </div>
  )
}
