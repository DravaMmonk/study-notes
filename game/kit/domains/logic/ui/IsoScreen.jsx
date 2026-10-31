import { useMemo, useState } from 'react'
import { Brief, PhonePage, RunDock, Workbench, usePlayback } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { say } from '../notation.js'
import { checkIso, declaredRules, sentenceOf, typeOf, wayText, waysIn } from '../iso.js'
import { constructorsOf, datatypeRules } from '../datatype.js'
import { atom, fn, tvar } from '../formula.js'
import { ruleText } from '../schematic.js'
import { blankLine, boardOf, problemsOf } from '../ruleLines.js'
import FaultScreen from './IsoFaultScreen.jsx'
import CaseTable from './IsoCases.jsx'
import RuleBoard from './RuleBoard.jsx'

// A declaration on the rule board: its intro rules a circuit wired by itself (RuleBoard.jsx, ../ruleBoard.js), the
// test cases (检验条例) under them (ui/IsoCases.jsx): what is given, the goal, and whether it is derivable. Running
// goes down the rows (../../../shell/usePlayback.jsx) and stops on the first one that is wrong; lines that are not a
// declaration yet (a conclusion left empty, a sentence about a thing no rule takes) stop it before the first.

// Ways are numbered 1 2 3, apart from the board's own part numbers (①②…).
export const WAY = ['1', '2', '3']

/** A declaration to write; or, by the shared play of checking by the diagram, someone's wrong ones to find the fault in. */
export default function IsoScreen(props) {
  return props.level.source.play === 'audit' ? <FaultScreen {...props} /> : <DeclareScreen {...props} />
}

function DeclareScreen({ game, level: entry, saved, save, solve, lastRun, keepRun, phone }) {
  const level = entry.source
  const words = (sentence) => say(sentenceOf(level, sentence), level.notation)
  const [lines, setLines] = useState(() => saved?.lines ?? [blankLine()])
  const change = (next) => {
    setLines(next)
    save({ lines: next })
  }
  const circuit = useMemo(() => boardOf(lines), [lines])
  const problems = useMemo(() => problemsOf(level, lines), [level, lines])
  const [testIndex, setTestIndex] = useState(0)
  const checked = useMemo(() => checkIso(level, circuit, words), [level, circuit])
  const why = (p) => {
    if (p.why === 'empty') return tr('还有空位：带前提的前提要填上结论。', 'A place is still empty: a premise with premises needs its conclusion.')
    const binder = level.binder ?? 'x'
    return tr(`第 ${p.line + 1} 条引入规则提到了 ${binder}，却没有任取 ${binder}。`, `Intro rule ${p.line + 1} mentions ${binder} but does not take ${binder}.`)
  }
  const playback = usePlayback({
    count: level.tests.length,
    // Lines that are not a declaration yet stop the run before its first case.
    stepsOf: (k) => (k === 0 && problems.length ? [{ failed: why(problems[0]) }] : []),
    check: (k) => (checked.results[k].pass ? '' : L(checked.results[k].reason)),
    final: () => (checked.ways ? L(checked.ways) : ''),
    onSolve: () => solve({ steps: lines.length }),
    onTest: setTestIndex,
    board: lines,
    kept: lastRun,
    onKeep: keepRun,
  })
  const run = playback.run
  const verdict = run?.over ? { pass: playback.passed } : null
  const failed = run?.over && !playback.passed ? run.results.at(-1) : null
  const verdictText = !verdict ? null : verdict.pass
    ? tr('所有检验条例都正确：应当可推导的目标，这份声明都推导得出；不应当可推导的，都推导不出。', 'Every test case is right: each goal that should be derivable is derived by this declaration, and none that should not be is.')
    : run.final || failed?.reason

  // Each case shows its result only once the run has stepped to it.
  const shown = (k) => (run ? k < run.results.length && !(problems.length) : false)
  const rowClass = (k) => `${k === testIndex ? 'is-on' : ''} ${playback.states[k] ? `is-${playback.states[k]}` : ''}`
  const result = (k) => (shown(k) ? { derived: checked.results[k].derived, wrong: !checked.results[k].pass } : null)
  const stage = (
    <div className="fo-stage">
      <RuleBoard level={level} lines={lines} onChange={change} scope={`${entry.id}:${level.task ?? 0}`} />
      <div className="lg-strip is-tables">
        <CaseTable cases={level.tests} words={words} level={level} rowClass={rowClass} onPick={setTestIndex} result={result} phone={phone} />
        {verdictText && <p className={`lg-verdict ${verdict.pass ? 'is-pass' : 'is-fail'}`}>{verdictText}</p>}
      </div>
      <footer className="run-foot"><RunDock {...playback.dock({ go: tr('运行检验条例', 'Run the test cases'), done: tr('所有条例均正确', 'All cases correct') })} /></footer>
    </div>
  )
  const brief = <Brief game={game} level={entry} hint={level.hint} phone={phone} />
  if (phone) return <PhonePage brief={brief} className="fo-level lg-level">{stage}</PhonePage>
  return <Workbench className="fo-level lg-level" brief={brief} stage={stage} scroll />
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
