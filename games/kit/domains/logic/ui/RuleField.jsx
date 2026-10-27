import { L, tr } from '../../../shell/i18n.js'

// The rule a tactic card uses, chosen from the level's rule book (machine.js ruleBookOf), in groups: [{ label, options:
// [{ value, label, text }] }]. The rule chosen is written out under the choice, the way Isabelle writes it. A rule a level
// fixed (`disabled`) only shows.
export default function RuleField({ label, value = '', onChange, groups, disabled = false }) {
  const picked = groups.flatMap((g) => g.options).find((o) => o.value === value)
  return (
    <div className="lg-field lg-rule-field" onPointerDown={(e) => e.stopPropagation()}>
      <label>
        <span>{L(label)}</span>
        <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
          <option value="">{tr('选一条', 'Pick one')}</option>
          {groups.map((g) => (
            <optgroup key={L(g.label)} label={L(g.label)}>
              {g.options.map((o) => <option key={o.value} value={o.value}>{L(o.label)}</option>)}
            </optgroup>
          ))}
        </select>
      </label>
      {picked?.text && <code className="lg-rule-text">{picked.text}</code>}
    </div>
  )
}
