import { L, tr } from '../../../shell/i18n.js'
import { say } from '../notation.js'
import { declaredRules, typeOf, wayText, waysIn } from '../iso.js'
import { constructorsOf, datatypeRules } from '../datatype.js'
import { atom, fn, tvar } from '../formula.js'
import { ruleText } from '../schematic.js'

// Ways are numbered 1 2 3.
const WAY = ['1', '2', '3']

/**
 * What passing a declaration gives, shown when it is passed: its rules for any sentences, those that make it (one
 * for each way), and the one that takes it apart, made from them (iso.js declaredRules) or the level's own (equality,
 * the numbers). The proof-board parts they are from here on are listed with what the level unlocks (game.jsx
 * unlocked).
 */
export default function DeclaredRules({ level }) {
  const text = (f) => L(say(f, level.notation))
  // A type (chapter 12): its constructors, and the rules the kernel makes of them.
  if (level.datatype) {
    const type = typeOf(level)
    return (
      <div className="dialog-note">
        <span className="panel-label">{tr('声明给出的规则')}</span>
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
      <span className="panel-label">{tr('声明给出的规则')}</span>
      <div className="lg-clauses">
        {rules.make.map((r, k) => <code key={k}>{tr(`引入规则 ${WAY[k]}：`, `Intro rule ${WAY[k]}: `)}{wayText(r, text)}</code>)}
        <code>{tr('消去规则：')}{wayText(rules.take, text)}</code>
      </div>
    </div>
  )
}
