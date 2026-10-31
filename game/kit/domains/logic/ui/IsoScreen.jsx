import { useMemo, useState } from 'react'
import { Brief, Level, RunDock, useKeptVerdict } from '../../../shell/index.js'
import Entries from '../../../shell/Entries.jsx'
import { L, tr } from '../../../shell/i18n.js'
import { say } from '../notation.js'
import { checkIso, declaredRules, sentenceOf, startIso, typeOf, wayRule, wayText, waysIn } from '../iso.js'
import { constructorsOf, datatypeRules } from '../datatype.js'
import { atom, fn, tvar } from '../formula.js'
import { ruleText } from '../schematic.js'
import { blankRule, boardOf, linesOf, problemsOf } from '../ruleLines.js'
import FaultScreen from './IsoFaultScreen.jsx'
import RuleTable from './RuleTable.jsx'

// A declaration on the rule table (RuleTable.jsx, ../ruleLines.js): its intro rules filled in, each premise a sentence
// built on the strip, then the rules as the kernel writes them (DeclRules). Checked as a translation is (FormulaScreen):
// the level's test cases (检验条例) stay out of sight, and a failure says the first one the declaration gets wrong; rules
// that are not a declaration yet (a premise unfinished, one about a thing its rule does not take) say so first. The
// test cases are the player's to write on the levels that check someone's declarations (IsoFaultScreen.jsx).

// Ways are numbered 1 2 3.
export const WAY = ['1', '2', '3']

/**
 * The declaration's rules as they stand, over its test cases: each intro rule (引入 1, 2, 3), written with one layer of
 * ⟹ as the player wrote it, and the elimination rule made from them (消去 1) as the kernel writes it, in the level's
 * own sentences. `ways`: [{ binds, needs }] (iso.js waysIn).
 */
export function DeclRules({ level, ways }) {
  if (!ways.length) return null
  const text = (f) => L(say(f, level.notation))
  const elim = declaredRules(level, ways, (f) => f).take
  return (
    <Entries className="lg-clauses">
      {ways.map((way, k) => <code key={k}>{tr(`引入${k + 1}：`, `Intro ${k + 1}: `)}{wayText(wayRule(way, level), text)}</code>)}
      <code>{tr('消去1：', 'Elim 1: ')}{wayText(elim, text)}</code>
    </Entries>
  )
}

/** A declaration to write; or, by the shared play of checking by the diagram, someone's wrong ones to find the fault in. */
export default function IsoScreen(props) {
  return props.level.source.play === 'audit' ? <FaultScreen {...props} /> : <DeclareScreen {...props} />
}

function DeclareScreen({ game, level: entry, saved, save, solve, lastRun, keepRun, phone }) {
  const level = entry.source
  const words = (sentence) => say(sentenceOf(level, sentence), level.notation)
  const [rules, setRules] = useState(() => saved?.rules ?? [blankRule()])
  const change = (next) => {
    setRules(next)
    save({ rules: next })
    setVerdict(null)
  }
  const problems = useMemo(() => problemsOf(level, rules), [level, rules])
  // The board the kernel's checks read: the rules once they are a declaration.
  const board = useMemo(() => (problems.length ? startIso() : boardOf(linesOf(rules))), [problems, rules])
  // Checked as a translation is: against the level's cases, out of sight; a failure says the first case it gets wrong.
  const judge = () => {
    const p = problems[0]
    if (p) {
      return { pass: false, text: p.why === 'empty'
        ? tr(`成立条件 ${p.rule + 1} 的第 ${p.need + 1} 个前提还没写完。`, `Premise ${p.need + 1} of condition ${p.rule + 1} is not finished.`)
        : tr(`成立条件 ${p.rule + 1} 的第 ${p.need + 1} 个前提提到了没有任取的东西。`, `Premise ${p.need + 1} of condition ${p.rule + 1} mentions a thing it does not take.`) }
    }
    const checked = checkIso(level, board, words)
    if (checked.pass) return { pass: true }
    const wrong = checked.results.find((r) => !r.pass)
    return { pass: false, text: L(wrong ? wrong.reason : checked.ways) }
  }
  const [verdict, setVerdict] = useKeptVerdict({ lastRun, keepRun }, judge)
  const check = () => {
    const v = judge()
    setVerdict(v)
    if (v.pass) solve({ steps: rules.length })
  }
  const stage = (
    <div className="fo-stage">
      <RuleTable level={level} rules={rules} onChange={change} scope={`${entry.id}:${level.task ?? 0}`} />
      <DeclRules level={level} ways={waysIn(board)} />
    </div>
  )
  const results = verdict && <p className={`lg-verdict ${verdict.pass ? 'is-pass' : 'is-fail'}`} role="status">{verdict.pass ? tr('这份声明符合需求。', 'This declaration meets the requirement.') : verdict.text}</p>
  const dock = <RunDock go={{ label: verdict?.pass ? tr('通过', 'Passed') : tr('检查', 'Check'), pass: Boolean(verdict?.pass), onClick: check }} />
  const brief = <Brief game={game} level={entry} hint={level.hint} phone={phone} />
  return <Level phone={phone} className="fo-level lg-level" brief={brief} stage={stage} results={results || null} dock={dock} />
}

/**
 * What passing a declaration gives, shown when it is passed: its rules for any sentences, those that make it (one
 * for each way), and the one that takes it apart, made from them (iso.js declaredRules) or the level's own (equality,
 * the numbers). The proof-board parts they are from here on are listed with what the level unlocks (game.jsx
 * unlocked).
 */
export function DeclaredRules({ level }) {
  const text = (f) => L(say(f, level.notation))
  // A type (chapter 12): its constructors, and the rules the kernel makes of them.
  if (level.datatype) {
    const type = typeOf(level)
    return (
      <div className="dialog-note">
        <span className="panel-label">{tr('声明给出的规则', 'The rules it declares')}</span>
        <div className="lg-clauses">
          <code>{`${level.datatype.type} = ${constructorsOf(type).map((c) => text(atom('=', [fn(c.f, c.args.map(tvar)), fn(c.f, c.args.map(tvar))])).split(' = ')[0]).join(' | ')}`}</code>
          {datatypeRules(level.datatype.type, type).map((r) => <code key={r.key}>{`${L(r.name)}：${ruleText(r, text)}`}</code>)}
        </div>
      </div>
    )
  }
  const rules = declaredRules(level, waysIn(level.solution))
  return (
    <div className="dialog-note">
      <span className="panel-label">{tr('声明给出的规则', 'The rules it declares')}</span>
      <div className="lg-clauses">
        {rules.make.map((r, k) => <code key={k}>{tr(`引入规则 ${WAY[k]}：`, `Intro rule ${WAY[k]}: `)}{wayText(r, text)}</code>)}
        <code>{tr('消去规则：', 'Elim rule: ')}{wayText(rules.take, text)}</code>
      </div>
    </div>
  )
}
