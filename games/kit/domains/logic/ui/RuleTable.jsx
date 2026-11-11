import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { L, tr } from '../../../shell/i18n.js'
import Popover from '../../../shell/Popover.jsx'
import { say } from '../notation.js'
import { sentenceOf } from '../iso.js'
import { complete, straysOf } from '../formulaTree.js'
import { blankRule, premiseChips, problemsOf } from '../ruleLines.js'
import SentenceEditor from './SentenceEditor.jsx'

// A declaration's intro rules as a table to fill in (《证明完毕》's rule table, ../ruleLines.js): the sentence it
// introduces (结论), then a row for each intro rule (成立条件), its premises one after another, ended by 「均为真。」 (「为真。」 for
// one premise)
// and the button that adds one more; a level that takes things (`thing`) has a for-any switch before the first. A
// premise is a sentence, built or changed with the translate tasks' strip and chips (SentenceEditor.jsx), beside it on
// a desktop and in a sheet on a phone (Popover.jsx); a change holds at once, and a premise left empty when the editor
// closes is gone. Read only (no onChange), for someone's declaration.
//
//   level  the declaration level      rules  [rule]      onChange(rules) | null      scope  the histories'

export default function RuleTable({ level, rules, onChange = null, scope = '' }) {
  const editable = Boolean(onChange)
  const binder = level.binder ?? 'x'
  const words = (f) => L(say(f, level.notation))
  const chips = useMemo(() => premiseChips(level), [level])
  const problems = problemsOf(level, rules)
  const [sheet, setSheet] = useState(null) // { rule, need, anchor }: the premise being written, and its button
  const buttons = useRef({}) // each premise's button, by `${rule}.${need}`
  // A premise just added gets its editor once its button is there to point at.
  useLayoutEffect(() => {
    if (sheet && !sheet.anchor) setSheet({ ...sheet, anchor: buttons.current[`${sheet.rule}.${sheet.need}`] })
  }, [sheet])
  const withRule = (k, f) => rules.map((r, j) => (j === k ? f(r) : r))
  const setNeed = (k, j, tree) => onChange(withRule(k, (r) => ({ ...r, needs: r.needs.map((n, i) => (i === j ? tree : n)) })))
  const add = (k) => {
    onChange(withRule(k, (r) => ({ ...r, needs: [...r.needs, null] })))
    setSheet({ rule: k, need: rules[k].needs.length, anchor: null })
  }
  const close = () => {
    const need = rules[sheet.rule]?.needs[sheet.need]
    if (need === null) onChange(withRule(sheet.rule, (r) => ({ ...r, needs: r.needs.filter((_, i) => i !== sheet.need) })))
    setSheet(null)
  }
  // A premise written out once it is a whole sentence (a thing alone, where a sentence goes, is not one yet).
  const whole = (need) => Boolean(need) && complete(need) && !straysOf(need).length
  const bad = (k, j) => problems.some((p) => p.rule === k && p.need === j)
  const editing = sheet?.anchor && rules[sheet.rule]?.needs[sheet.need] !== undefined

  return (
    <div className="lg-rule-table">
      <div className="lg-rt-row is-goal">
        <span className="lg-rt-name">{tr('结论')}</span>
        <span className="lg-rt-needs"><b className="lg-rt-goal">{words(sentenceOf(level, level.target))}</b><span className="lg-rt-true">{tr('为真。')}</span></span>
      </div>
      {rules.map((rule, k) => (
        <div key={k} className="lg-rt-row">
          <span className="lg-rt-name">{tr('成立条件')}<i>{k + 1}</i></span>
          <span className="lg-rt-needs">
            {level.thing && (
              <button type="button" className="lg-rt-any" aria-pressed={rule.binds.length > 0} disabled={!editable} onClick={() => onChange(withRule(k, (r) => ({ ...r, binds: r.binds.length ? [] : [binder] })))}>
                {tr(`任取 ${binder}`, `For any ${binder}`)}
              </button>
            )}
            {!rule.needs.length && !editable && <i className="lg-mark">{tr('无前提')}</i>}
            {rule.needs.map((need, j) => (
              <span key={j} className="lg-rt-need">
                <button
                  type="button"
                  ref={(el) => { buttons.current[`${k}.${j}`] = el }}
                  className={`lg-rt-premise ${whole(need) ? '' : 'is-blank'} ${bad(k, j) ? 'is-bad' : ''}`}
                  aria-expanded={sheet?.rule === k && sheet?.need === j}
                  disabled={!editable}
                  onClick={(event) => setSheet({ rule: k, need: j, anchor: event.currentTarget })}
                >
                  {whole(need) ? words(need) : tr('未写完')}
                </button>
                {/* The separator stays with the premise before it, so a wrapped row never starts with it. */}
                {j < rule.needs.length - 1 ? <span className="lg-rt-sep">；</span> : <span className="lg-rt-true">{rule.needs.length > 1 ? tr('均为真。') : tr('为真。')}</span>}
              </span>
            ))}
            {editable && <button type="button" className="lg-rt-add" onClick={() => add(k)} aria-label={tr(`给成立条件 ${k + 1} 添加前提`, `Add a premise to condition ${k + 1}`)}><Plus size={14} />{!rule.needs.length && tr('添加前提')}</button>}
          </span>
          {editable && rules.length > 1 && <button type="button" className="lg-rt-drop" onClick={() => onChange(rules.filter((_, j) => j !== k))} aria-label={tr(`删除成立条件 ${k + 1}`, `Delete condition ${k + 1}`)}><X size={14} /></button>}
        </div>
      ))}
      {editable && <button type="button" className="lg-rt-more" onClick={() => onChange([...rules, blankRule()])}><Plus size={14} />{tr('添加成立条件')}</button>}
      {editable && editing && (
        <Popover anchor={sheet.anchor} title={tr(`成立条件 ${sheet.rule + 1} 的前提`, `A premise of condition ${sheet.rule + 1}`)} onClose={close}>
          <div className="lg-sentence-box">
            <SentenceEditor key={`${sheet.rule}.${sheet.need}`} tree={rules[sheet.rule].needs[sheet.need]} onChange={(tree) => setNeed(sheet.rule, sheet.need, tree)} chips={chips} notation={level.notation} scope={`${scope}:${sheet.rule}.${sheet.need}`} />
          </div>
        </Popover>
      )}
    </div>
  )
}

/** Someone's declaration as rules to show (its board's ways, each premise a sentence). */
export const rulesOf = (level, ways) => ways.map((way) => ({ binds: way.binds, needs: way.needs.map((n) => sentenceOf(level, n)) }))

