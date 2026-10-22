import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Brief, PhonePage, RunDock, Workbench } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { CONNECTIVES, SIDES } from '../declare.js'
import { checkDesign } from '../rules.js'

// A rule-design level (rules.js): the player writes a connective's rules, the ways to make it (`intro`) or the boxes
// that use it up (`elim`), side by side with its truth table. The table shows, row by row, which rule can be used
// (or whose assumptions hold); checking marks the rows and rules that are wrong and says why.

const TF = (v) => (v ? tr('真', 'T') : tr('假', 'F'))
const T = (zh, en) => ({ zh, en })

/** The connective as a sentence about its sides: 「左边 与 右边」, or 「假」. */
const whole = (conn) => (conn.sides.length ? T(`左边 ${conn.name.zh} 右边`, `left ${conn.name.en} right`) : conn.name)
const sidesText = (sides) => (sides.length ? sides.map((s) => L(SIDES[s])).join(tr('、', ' and ')) : tr('什么都不要', 'nothing'))

function problemText(p, level, design) {
  const conn = CONNECTIVES[level.conn]
  const name = L(whole(conn))
  const item = (k) => (level.mode === 'intro' ? tr(`第 ${k + 1} 种造法`, `way ${k + 1}`) : tr(`第 ${k + 1} 个框`, `box ${k + 1}`))
  switch (p.kind) {
    case 'unsound':
      return level.mode === 'intro'
        ? tr(`第 ${p.row + 1} 行：${item(p.at)}在这一行能用（它要的都是真的），可「${name}」在这一行是假的。这条规则会从真话造出假话。`, `Row ${p.row + 1}: ${item(p.at)} can be used here (everything it needs is true), yet “${name}” is false on this row. The rule would make a false sentence out of true ones.`)
        : tr(`第 ${p.row + 1} 行：「${name}」是真的，可没有一个框的假设在这一行全都成立。假设不成立的框，推出什么都不算数：结论 C 就算是假的，这条规则也照样给出它。`, `Row ${p.row + 1}: “${name}” is true, yet no box has all its assumptions true here. A box whose assumptions fail proves anything: even with C false, the rule would still give C.`)
    case 'uncovered':
      return tr(`第 ${p.row + 1} 行：「${name}」是真的，却没有一种造法用得上。证明器在这种情况下造不出它。`, `Row ${p.row + 1}: “${name}” is true, yet no way of making it applies. The prover could not make it in this case.`)
    case 'wasted':
      return tr(`${item(p.at)}要的不比${item(p.other)}少：有${item(p.other)}在，它永远用不上。`, `${item(p.at)} needs no less than ${item(p.other)}: with ${item(p.other)} there, it is never needed.`)
    case 'weak': {
      const way = conn.ctors[p.way]
      return p.at >= 0
        ? tr(`造出「${name}」的第 ${p.way + 1} 种造法用了${sidesText(way)}，可${item(p.at)}只假设了${sidesText(design[p.at])}：用掉它以后，造它时交出去的东西有的再也拿不回来。`, `Way ${p.way + 1} of making “${name}” takes ${sidesText(way)}, but ${item(p.at)} assumes only ${sidesText(design[p.at])}: once it is used up, some of what went into it can never be had back.`)
        : tr(`造出「${name}」的第 ${p.way + 1} 种造法用了${sidesText(way)}，可没有一个框假设的正是这些。`, `Way ${p.way + 1} of making “${name}” takes ${sidesText(way)}, but no box assumes just that.`)
    }
    case 'stray':
      return tr(`${item(p.at)}假设${sidesText(design[p.at])}，对不上任何一种造法：「${name}」从来不是这样造出来的，这种情况不会发生。`, `${item(p.at)} assumes ${sidesText(design[p.at])}, which matches no way of making it: “${name}” is never made like that, so the case never happens.`)
    case 'twice':
      return tr(`${item(p.at)}和前面一个框一模一样，多余。`, `${item(p.at)} is the same as an earlier box: one too many.`)
    default:
      return ''
  }
}

export default function RuleScreen({ game, level: entry, saved, save, solve, phone }) {
  const level = entry.source
  const conn = CONNECTIVES[level.conn]
  const intro = level.mode === 'intro'
  const [design, setDesign] = useState(() => (Array.isArray(saved?.design) ? saved.design : []))
  const [checked, setChecked] = useState(null)
  const update = (next) => {
    setDesign(next)
    save({ design: next })
    setChecked(null)
  }
  const toggle = (k, side) => update(design.map((sides, j) => (j !== k ? sides : sides.includes(side) ? sides.filter((s) => s !== side) : conn.sides.filter((s) => s === side || sides.includes(s)))))
  const result = checkDesign(level, design)
  const check = () => {
    setChecked(result)
    if (result.pass) solve(null)
  }
  const wrongAt = new Set(checked?.problems.map((p) => p.at).filter((k) => k >= 0))
  const name = L(whole(conn))
  const itemName = (k) => (intro ? tr(`造法 ${k + 1}`, `Way ${k + 1}`) : tr(`框 ${k + 1}`, `Box ${k + 1}`))

  const stage = (
    <div className="lg-rule">
      <p className="lg-sequent">{intro ? tr('设计怎样造出', 'Design how to make') : tr('设计怎样用掉', 'Design how to use up')} <b>「{name}」</b></p>
      {!intro && (
        <section className="lg-rule-ways">
          <h3>{tr('上一关定下的造法', 'The ways to make it, from the last level')}</h3>
          {conn.ctors.length ? (
            <ul>{conn.ctors.map((way, w) => <li key={w}>{tr(`造法 ${w + 1}：由${sidesText(way)}得到「${name}」`, `Way ${w + 1}: from ${sidesText(way)}, “${name}”`)}</li>)}</ul>
          ) : <p>{tr('一种也没有：它造不出来。', 'None at all: it cannot be made.')}</p>}
        </section>
      )}
      <ol className="lg-rule-list">
        {design.map((sides, k) => (
          <li key={k} className={wrongAt.has(k) ? 'is-wrong' : ''}>
            <b>{itemName(k)}</b>
            <span className="lg-rule-word">{intro ? tr('需要', 'needs') : tr('假设', 'assumes')}</span>
            {conn.sides.length ? conn.sides.map((s) => (
              <button key={s} type="button" className="lg-rule-side" aria-pressed={sides.includes(s)} onClick={() => toggle(k, s)}>{tr(`${SIDES[s].zh}为真`, `${SIDES[s].en} true`)}</button>
            )) : <i className="lg-mark">{tr('（它没有左右两边，没有可选的）', '(it has no sides to choose)')}</i>}
            <span className="lg-rule-word">{intro ? tr(`→ 得到「${name}」`, `→ gives “${name}”`) : tr('→ 证出 C', '→ proves C')}</span>
            <button type="button" className="lg-rule-remove" aria-label={tr('删掉这一条', 'Remove this one')} onClick={() => update(design.filter((_, j) => j !== k))}><X size={14} /></button>
          </li>
        ))}
      </ol>
      <button type="button" className="lg-rule-add" onClick={() => update([...design, []])}><Plus size={15} />{intro ? tr('加一种造法', 'Add a way to make it') : tr('加一个框', 'Add a box')}</button>
      {!intro && <p className="lg-rule-note">{tr(`用掉「${name}」的规则：接进一句「${name}」，${design.length ? `${design.length} 个框各自证出同一句 C` : '不用任何框'}，就得到 C。`, `Using up “${name}”: wire one in; ${design.length ? `when all ${design.length} boxes prove the same C` : 'with no box at all'}, you get C.`)}</p>}
      <table className="lg-table lg-rule-table">
        <thead>
          <tr>
            {conn.sides.map((s) => <th key={s}>{L(SIDES[s])}</th>)}
            <th className="is-formula">「{name}」</th>
            {design.map((_, k) => <th key={k}>{intro ? tr(`造法 ${k + 1} 能用`, `Way ${k + 1} applies`) : tr(`框 ${k + 1} 的假设成立`, `Box ${k + 1} holds`)}</th>)}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((r, k) => (
            <tr key={k} className={checked?.rows[k].problem ? 'is-wrong' : ''}>
              {conn.sides.map((s) => <td key={s} className={r.row[s] ? 'is-t' : 'is-f'}>{TF(r.row[s])}</td>)}
              <td className={`is-formula ${r.want ? 'is-t' : 'is-f'}`}>{TF(r.want)}</td>
              {r.uses.map((u, j) => <td key={j}>{u ? '✓' : ''}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {checked && (checked.pass
        ? <p className="lg-verdict is-pass">{intro ? tr('每一行都对：能用上造法的行，它都是真的；它是真的行，都有造法用得上。', 'Every row is right: wherever a way applies it is true, and wherever it is true some way applies.') : tr('可靠，而且和造法一一对应：造它时交出了什么，用掉它时就拿回什么。', 'Sound, and matched to the ways of making it one for one: what went into making it is what using it up gives back.')}</p>
        : <ul className="lg-verdict is-fail lg-rule-problems">{checked.problems.map((p, k) => <li key={k}>{problemText(p, level, design)}</li>)}</ul>)}
      <footer className="run-foot"><RunDock go={{ label: checked?.pass ? tr('规则定好了', 'Rules settled') : tr('检查规则', 'Check the rules'), pass: Boolean(checked?.pass), onClick: check }} /></footer>
    </div>
  )
  const brief = <Brief game={game} level={entry} hint={level.hint} phone={phone} />
  if (phone) return <PhonePage brief={brief} className="lg-truth-level">{stage}</PhonePage>
  return <Workbench className="lg-truth-level" brief={brief} stage={stage} scroll />
}
