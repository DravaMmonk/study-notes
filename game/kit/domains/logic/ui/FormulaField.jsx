import { L, tr } from '../../../shell/i18n.js'

// A sentence chosen on a card from `choices` ([{ value, label }]): the level's own sentences, held as the schema's
// letters (value) and shown as the current test's sentences (label), so switching tests renames every choice.
export default function FormulaField({ label, value = '', onChange, choices }) {
  return (
    <div className="lg-field" onPointerDown={(e) => e.stopPropagation()}>
      <label>
        <span>{L(label)}</span>
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">{tr('选一句', 'Pick one')}</option>
          {choices.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </label>
    </div>
  )
}
