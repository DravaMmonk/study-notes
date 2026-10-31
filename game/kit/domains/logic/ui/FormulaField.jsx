import { L, tr } from '../../../shell/i18n.js'

// A choice on a card from `choices` ([{ value, label }]): a thing (a name, a term), a card's shape, how many ways, how
// deep (a sentence is built instead, SentencePick.jsx). A setting that can work itself out (`blank`) names that in
// place of “pick one”; one that always holds a choice (a card's shape, `required`) has no empty one; one a level fixed
// (`disabled`) only shows.
export default function FormulaField({ label, value = '', onChange, choices, blank = null, required = false, disabled = false }) {
  return (
    <div className="lg-field" onPointerDown={(e) => e.stopPropagation()}>
      <label>
        <span>{L(label)}</span>
        <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
          {!required && <option value="">{blank ? L(blank) : tr('选择…', 'Choose…')}</option>}
          {choices.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </label>
    </div>
  )
}
