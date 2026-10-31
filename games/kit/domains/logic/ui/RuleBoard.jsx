import { useMemo, useState } from 'react'
import { Box, FileSignature, Repeat } from 'lucide-react'
import { L, tr } from '../../../shell/i18n.js'
import Sheet from '../../../shell/Sheet.jsx'
import { SlotBoard, Tray } from '../../../circuit/index.js'
import { useHistory } from '../../../circuit/useHistory.js'
import { say } from '../notation.js'
import { declaredRules, sentenceOf, wayRule } from '../iso.js'
import { ruleText } from '../schematic.js'
import { blankLine, problemsOf } from '../ruleLines.js'
import { DECL_ID, FIX, PROP, RULE, UNDER, graphOf, nextRegion, propType, put, ruleParts, takeOut } from '../ruleBoard.js'

// A declaration's intro rules on the rule board (../ruleBoard.js): a circuit wired by itself. The tray holds the
// level's sentences (命题), an assumption frame (tray 'under'), a for-any frame (tray 'thing') and a rule; a block
// tapped in the tray goes where the last one went (inside an assumption frame just put, its assumptions first), and
// tapping an empty slot asks what goes there. Tapping a block takes it out (a frame with what is in it). Under the
// board, the rules as the book writes them, ⋀x. ⟦A; B⟧ ⟹ C, and the elimination rule made from them. Read only
// (no onChange), for someone's declaration.
//
//   level  the declaration level      lines  [line] (../ruleLines.js)      onChange(lines) | null      scope  the history's

const T = (zh, en) => ({ zh, en })

export default function RuleBoard({ level, lines, onChange = null, scope = null }) {
  const editable = Boolean(onChange)
  const binder = level.binder ?? 'x'
  const tray = level.tray ?? ['hyp']
  const words = (s) => L(say(sentenceOf(level, s), level.notation))
  const book = (f) => L(say(f, level.notation))
  const graph = useMemo(() => graphOf(level, lines), [level, lines])
  const parts = useMemo(() => ruleParts(level, lines), [level, lines])
  const problems = problemsOf(level, lines)
  const history = useHistory(lines, onChange ?? (() => {}), scope, 0)
  const [region, setRegion] = useState(null) // where the next block from the tray goes (null: the last rule)
  const [sheet, setSheet] = useState(null) // { region } of the empty slot tapped, while asking what goes there
  const [note, setNote] = useState(null)

  const items = [
    ...(tray.includes('hyp') ? level.sentences.map((s) => ({ type: propType(s), label: { zh: words(s), en: words(s) }, family: 'hyp' })) : []),
    ...(tray.includes('under') ? [{ type: UNDER, label: T('假设框', 'Assumption frame'), desc: T('假设…时，能证出…', 'Assuming …, we can show …'), family: 'box', icon: Box }] : []),
    ...(tray.includes('thing') ? [{ type: FIX, label: T(`任取 ${binder}`, `For any ${binder}`), desc: T('任取一样东西', 'Any thing'), family: 'box', icon: Repeat }] : []),
    { type: RULE, label: T('规则', 'Rule'), desc: T('再加一条引入规则', 'One more intro rule'), family: 'rule', icon: FileSignature },
  ]
  // `at` a region, null the board itself; left out, where the last block went.
  const putIn = (type, at = region ?? `r${lines.length - 1}/needs`) => {
    const next = put(lines, type, at, binder)
    if (!Array.isArray(next)) return setNote(next)
    setNote(null)
    onChange(next)
    setRegion(nextRegion(next, type, at))
  }
  const takeAway = (id) => {
    if (!editable || id === DECL_ID) return
    const next = takeOut(lines, id)
    onChange(next)
    setRegion(null)
    setNote(null)
  }

  const nameOf = (n) => ({
    [PROP]: () => words(n.params.s),
    [RULE]: () => tr(`引入规则 ${n.params.k + 1}`, `Intro rule ${n.params.k + 1}`),
    [FIX]: () => tr(`任取 ${binder}`, `For any ${binder}`),
    [UNDER]: () => tr('假设框', 'Assumption frame'),
    [DECL_ID]: () => tr('声明', 'Declared'),
  })[n.type]()
  const regionNote = (n, name) => ({
    needs: <em>{tr('只要已经证出', 'Once we have')}</em>,
    body: <em>{tr('一样东西', 'a thing')}</em>,
  })[name] ?? null
  const resultNote = (n, name) => (name === 'needs' ? <em>{tr('就可以得出', 'we may conclude')} <b>{words(level.target)}</b></em> : null)

  // The rules as the book writes them, each once it is whole, and the elimination rule made from them.
  const formal = lines.map((line, k) => (problems.some((p) => p.line === k) ? null : `${line.binds.length ? `⋀${line.binds.join(' ')}. ` : ''}${ruleText(wayRule(line, level), book)}`))
  const take = !problems.length && lines.length ? declaredRules(level, lines, (f) => f).take : null
  const allowed = (at) => items.filter((item) => Array.isArray(put(lines, item.type, at, binder)))

  return (
    <div className="lg-rule-board">
      <SlotBoard
        dense
        graph={graph}
        parts={parts}
        nameOf={nameOf}
        thumb={(n) => (n.type === PROP ? <span className="lg-decl-goal">{words(n.params.s)}</span> : null)}
        sinkBody={() => <span className="pb-thumb lg-decl-goal">{words(level.target)}</span>}
        regionNote={regionNote}
        resultNote={resultNote}
        nodeClass={(n) => (problems.some((p) => n.id.slice(1) === [p.line, ...p.path].join('.') && n.type !== RULE) ? 'is-bad' : '')}
        fixed={!editable}
        picking={null}
        moving={null}
        canLand={() => false}
        onPort={() => {}}
        onNode={takeAway}
        onSlot={(at, where) => { if (editable) setSheet({ region: where ?? null }) }}
        history={editable ? history : null}
        onClear={editable && (lines.length > 1 || lines[0].needs.length || lines[0].binds.length) ? () => { onChange([blankLine()]); setRegion(null) } : null}
      />
      {editable && note && <p className="ks-note is-bad" role="status">{L(note)}</p>}
      <div className="lg-clauses lg-rule-book">
        {formal.map((text, k) => text && <code key={k}>{tr(`引入规则 ${k + 1}：`, `Intro rule ${k + 1}: `)}{text}</code>)}
        {take && <code>{tr('消去规则：', 'Elim rule: ')}{ruleText(take, book)}</code>}
      </div>
      {editable && <Tray items={items} onPick={(type) => putIn(type)} />}
      {editable && sheet && (
        <Sheet title={tr('放在这一格', 'Place in this slot')} onClose={() => setSheet(null)}>
          <div className="lg-add">
            {allowed(sheet.region).map((item) => (
              <button key={item.type} type="button" className="pb-part" data-family={item.family} onClick={() => { putIn(item.type, sheet.region); setSheet(null) }}>
                <b>{L(item.label)}</b>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  )
}
