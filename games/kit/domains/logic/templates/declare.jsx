import { useState } from 'react'
import { Brief, Level, NamedLines, useCheckOnce } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { say } from '../notation.js'
import { declaredRules, wayRule, wayText, waysIn } from '../iso.js'
import { blankRule, boardOf, checkDeclaration, linesOf, problemsOf } from '../ruleLines.js'
import RuleTable from '../ui/RuleTable.jsx'

// The template of a declaration task (iso.js, a rule board with no `play`): the kit's rows of rules
// (../../../shell/RuleRows.jsx, through ui/RuleTable.jsx: each premise a sentence built on the strip), under them
// the rules as the kernel writes them (../../../shell/NamedLines.jsx), and a check in one go
// (../../../shell/CheckOnce.jsx): the level's test cases (检验条例) stay out of sight, and a failure says the first one
// the declaration gets wrong; rules that are not a declaration yet (a premise unfinished, one about a thing its rule
// does not take) say so first. Nothing is drawn here.

/**
 * A declaration's rules as they stand, for the lines under its table: each intro rule (引入 1, 2, 3), written with one
 * layer of ⟹ as the player wrote it, and the elimination rule made from them (消去) as the kernel writes it, in the
 * level's own sentences. `ways`: [{ binds, needs }] (iso.js waysIn).
 */
export function ruleLines(level, ways) {
  if (!ways.length) return []
  const text = (f) => L(say(f, level.notation))
  return [
    ...ways.map((way, k) => ({ name: tr('引入'), mark: k + 1, text: wayText(wayRule(way, level), text) })),
    { name: tr('消去'), text: wayText(declaredRules(level, ways, (f) => f).take, text) },
  ]
}

export default function Declare({ game, level: entry, saved, save, solve, lastRun, keepRun, phone }) {
  const level = entry.source
  const [rules, setRules] = useState(() => saved?.rules ?? [blankRule()])
  const lines = problemsOf(level, rules).length ? [] : ruleLines(level, waysIn(boardOf(linesOf(rules))))
  const { results, dock, reset } = useCheckOnce({ judge: checkDeclaration(level), work: rules, passed: tr('这份声明符合需求。'), onPass: () => solve({ steps: rules.length }), lastRun, keepRun })
  const change = (next) => {
    setRules(next)
    save({ rules: next })
    reset()
  }
  const stage = (
    <div className="fo-stage">
      <RuleTable level={level} rules={rules} onChange={change} scope={`${entry.id}:${level.task}`} />
      <NamedLines lines={lines} />
    </div>
  )
  const brief = <Brief game={game} level={entry} hint={level.hint} phone={phone} />
  return <Level phone={phone} className="fo-level lg-level" brief={brief} stage={stage} results={results} dock={dock} />
}
