import { useMemo } from 'react'
import { L, T, tr } from '../../../shell/i18n.js'
import RuleRows from '../../../shell/RuleRows.jsx'
import { say } from '../notation.js'
import { sentenceOf } from '../iso.js'
import { complete, straysOf } from '../formulaTree.js'
import { blankRule, premiseChips, problemsOf } from '../ruleLines.js'
import TreeEditor from '../../../strip/TreeEditor.jsx'
import { sentenceLanguage } from '../sentenceLanguage.js'

// A declaration's intro rules on the kit's rows of rules (../../../shell/RuleRows.jsx, ../ruleLines.js): the sentence
// it introduces (结论), then a row for each intro rule (成立条件), its premises one after another, ended by 「均为真。」
// (「为真。」 for one premise) and the button that adds one more; a level that takes things (`thing`) has a for-any
// switch before the first. A premise is a sentence, built or changed with the translate tasks' strip and chips
// (TreeEditor.jsx); a premise left empty when the editor closes is gone. Read only (no onChange), for someone's
// declaration.
//
//   level  the declaration level      rules  [rule]      onChange(rules) | null      scope  the histories'

const UNFINISHED = T('未写完')

export default function RuleTable({ level, rules, onChange = null, scope = '' }) {
  const editable = Boolean(onChange)
  const binder = level.binder ?? 'x'
  const words = (f) => L(say(f, level.notation))
  const chips = useMemo(() => premiseChips(level), [level])
  const problems = problemsOf(level, rules)
  const withRule = (k, f) => rules.map((r, j) => (j === k ? f(r) : r))
  const setNeed = (k, j, tree) => onChange(withRule(k, (r) => ({ ...r, needs: r.needs.map((n, i) => (i === j ? tree : n)) })))
  // A premise written out once it is a whole sentence (a thing alone, where a sentence goes, is not one yet).
  const whole = (need) => Boolean(need) && complete(need) && !straysOf(need).length
  const rows = rules.map((rule, k) => ({
    name: <>{tr('成立条件')}<i>{k + 1}</i></>,
    lead: level.thing && (
      <button type="button" aria-pressed={rule.binds.length > 0} disabled={!editable} onClick={() => onChange(withRule(k, (r) => ({ ...r, binds: r.binds.length ? [] : [binder] })))}>
        {tr(`任取 ${binder}`, `For any ${binder}`)}
      </button>
    ),
    slots: rule.needs.map((need, j) => ({ text: whole(need) ? words(need) : null, bad: problems.some((p) => p.rule === k && p.need === j) })),
    end: rule.needs.length > 1 ? tr('均为真。') : tr('为真。'),
    empty: <i className="lg-mark">{tr('无前提')}</i>,
    add: { label: T(`给成立条件 ${k + 1} 添加前提`, `Add a premise to condition ${k + 1}`), text: !rule.needs.length && tr('添加前提'), run: () => onChange(withRule(k, (r) => ({ ...r, needs: [...r.needs, null] }))) },
    ...(rules.length > 1 ? { drop: { label: T(`删除成立条件 ${k + 1}`, `Delete condition ${k + 1}`), run: () => onChange(rules.filter((_, j) => j !== k)) } } : {}),
  }))
  const editor = editable && {
    title: (k) => tr(`成立条件 ${k + 1} 的前提`, `A premise of condition ${k + 1}`),
    render: (k, j) => (
      <div className="lg-sentence-box">
        <TreeEditor key={`${k}.${j}`} tree={rules[k].needs[j]} onChange={(tree) => setNeed(k, j, tree)} chips={chips} language={sentenceLanguage(level.notation, 'formula', rules[k].binds)} scope={`${scope}:${k}.${j}`} />
      </div>
    ),
    close: (k, j) => {
      if (rules[k]?.needs[j] === null) onChange(withRule(k, (r) => ({ ...r, needs: r.needs.filter((_, i) => i !== j) })))
    },
  }
  return (
    <RuleRows
      className="lg-rule-table"
      head={{ name: tr('结论'), body: <><b className="rr-goal">{words(sentenceOf(level, level.target))}</b><span className="rr-end">{tr('为真。')}</span></> }}
      rows={rows}
      editor={editor || null}
      more={{ text: tr('添加成立条件'), run: () => onChange([...rules, blankRule()]) }}
      blank={UNFINISHED}
    />
  )
}

/** Someone's declaration as rules to show (its board's ways, each premise a sentence). */
export const rulesOf = (level, ways) => ways.map((way) => ({ binds: way.binds, needs: way.needs.map((n) => sentenceOf(level, n)) }))
