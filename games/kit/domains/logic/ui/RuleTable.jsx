import { useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { L, tr } from '../../../shell/i18n.js'
import Sheet from '../../../shell/Sheet.jsx'
import { say } from '../notation.js'
import { sentenceOf } from '../iso.js'
import { complete, straysOf } from '../formulaTree.js'
import { blankRule, premiseChips, problemsOf } from '../ruleLines.js'
import SentenceEditor from './SentenceEditor.jsx'

// A declaration's intro rules as a table to fill in (《证明完毕》's rule table, ../ruleLines.js): the sentence it
// introduces, then a row for each intro rule, its premises one after another, the button that adds one more at the end
// of the last; a level that takes things (`thing`) has a for-any switch on each row. A premise is a sentence, built or
// changed in a sheet with the translate tasks' strip and chips (SentenceEditor.jsx); as in the other sheets, a change
// holds at once, and a premise left empty when the sheet closes is gone. Read only (no onChange), for someone's
// declaration.
//
//   level  the declaration level      rules  [rule]      onChange(rules) | null      scope  the histories'

export default function RuleTable({ level, rules, onChange = null, scope = '' }) {
  const editable = Boolean(onChange)
  const binder = level.binder ?? 'x'
  const words = (f) => L(say(f, level.notation))
  const chips = useMemo(() => premiseChips(level), [level])
  const problems = problemsOf(level, rules)
  const [sheet, setSheet] = useState(null) // { rule, need }: the premise being written
  const withRule = (k, f) => rules.map((r, j) => (j === k ? f(r) : r))
  const setNeed = (k, j, tree) => onChange(withRule(k, (r) => ({ ...r, needs: r.needs.map((n, i) => (i === j ? tree : n)) })))
  const add = (k) => {
    onChange(withRule(k, (r) => ({ ...r, needs: [...r.needs, null] })))
    setSheet({ rule: k, need: rules[k].needs.length })
  }
  const close = () => {
    const need = rules[sheet.rule]?.needs[sheet.need]
    if (need === null) onChange(withRule(sheet.rule, (r) => ({ ...r, needs: r.needs.filter((_, i) => i !== sheet.need) })))
    setSheet(null)
  }
  // A premise written out once it is a whole sentence (a thing alone, where a sentence goes, is not one yet).
  const whole = (need) => Boolean(need) && complete(need) && !straysOf(need).length
  const bad = (k, j) => problems.some((p) => p.rule === k && p.need === j)
  const editing = sheet && rules[sheet.rule]?.needs[sheet.need] !== undefined

  return (
    <div className="lg-rule-table">
      <div className="lg-rt-row is-goal">
        <span className="lg-rt-name">{tr('目标', 'Goal')}</span>
        <span className="lg-rt-needs"><b>{words(sentenceOf(level, level.target))}</b></span>
      </div>
      {rules.map((rule, k) => (
        <div key={k} className="lg-rt-row">
          <span className="lg-rt-name">{tr(`引入规则 ${k + 1}`, `Intro rule ${k + 1}`)}</span>
          {level.thing && (
            <button type="button" className="lg-rt-any" aria-pressed={rule.binds.length > 0} disabled={!editable} onClick={() => onChange(withRule(k, (r) => ({ ...r, binds: r.binds.length ? [] : [binder] })))}>
              {tr(`任取 ${binder}`, `For any ${binder}`)}
            </button>
          )}
          <span className="lg-rt-needs">
            {!rule.needs.length && !editable && <i className="lg-mark">{tr('无前提', 'No premise')}</i>}
            {rule.needs.map((need, j) => (
              <span key={j} className="lg-rt-need">
                {j > 0 && <span className="lg-rt-sep">；</span>}
                <button type="button" className={`lg-rt-premise ${bad(k, j) ? 'is-bad' : ''}`} disabled={!editable} onClick={() => setSheet({ rule: k, need: j })}>
                  {whole(need) ? words(need) : tr('未写完', 'Unfinished')}
                </button>
              </span>
            ))}
            {editable && <button type="button" className="lg-rt-add" onClick={() => add(k)} aria-label={tr(`给引入规则 ${k + 1} 添加前提`, `Add a premise to intro rule ${k + 1}`)}><Plus size={14} />{!rule.needs.length && tr('添加前提', 'Add a premise')}</button>}
          </span>
          {editable && rules.length > 1 && <button type="button" className="lg-rt-drop" onClick={() => onChange(rules.filter((_, j) => j !== k))} aria-label={tr(`删除引入规则 ${k + 1}`, `Delete intro rule ${k + 1}`)}><X size={14} /></button>}
        </div>
      ))}
      {editable && <button type="button" className="lg-rt-more" onClick={() => onChange([...rules, blankRule()])}>{tr('添加引入规则', 'Add an intro rule')}</button>}
      {editable && editing && (
        <Sheet title={tr(`引入规则 ${sheet.rule + 1} 的前提`, `A premise of intro rule ${sheet.rule + 1}`)} onClose={close}>
          <div className="lg-rt-sheet">
            <SentenceEditor tree={rules[sheet.rule].needs[sheet.need]} onChange={(tree) => setNeed(sheet.rule, sheet.need, tree)} chips={chips} notation={level.notation} scope={`${scope}:${sheet.rule}.${sheet.need}`} />
          </div>
        </Sheet>
      )}
    </div>
  )
}

/** Someone's declaration as rules to show (its board's ways, each premise a sentence). */
export const rulesOf = (level, ways) => ways.map((way) => ({ binds: way.binds, needs: way.needs.map((n) => sentenceOf(level, n)) }))

