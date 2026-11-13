import { useMemo, useState } from 'react'
import { Brief, Level, RuleRows, useCheckOnce } from '../../../shell/index.js'
import { L, T, tr } from '../../../shell/i18n.js'
import { showTerm } from '../formula.js'
import { parseS, parseSide } from '../schematic.js'
import { say, sayTerm } from '../notation.js'
import { complete, termChips } from '../formulaTree.js'
import { checkDefine, whyNot } from '../define.js'
import SentenceEditor from '../ui/SentenceEditor.jsx'

// The template of a definition task (define.js): the kit's rows of rules (../../../shell/RuleRows.jsx) and a check in
// one go (../../../shell/CheckOnce.jsx), as a declaration is (declare.jsx), and nothing drawn here. A template is how one way of playing puts the
// kit's components together, before any level is written; a level only fills it in.
//
//   rows     one for each constructor of the argument the function takes apart (or each value of its condition): its
//            left side given, its right side a term the player builds on the strip (ui/SentenceEditor.jsx) from the
//            pieces the row's choices are made of
//   check    the level's tests (what each term should work out to), then whether every call on a right side takes
//            apart a smaller argument; they stay out of sight, and a failure says the first one that is wrong
// Any definition that passes is accepted; later levels go by the reference one (course.js).

const UNFINISHED = T('未写完')
const T_WRITE = T('每一行的右边都须写完', 'Every row needs a whole right side')

// What was kept: a term for each row (null: nothing yet); a save from when a right side was picked kept its text.
const kept = (saved, level) => level.rows.map((_, k) => {
  const one = Array.isArray(saved) && saved.length === level.rows.length ? saved[k] : null
  if (typeof one !== 'string') return one ?? null
  try {
    return one ? parseSide(one) : null
  } catch {
    return null
  }
})

export default function Define({ game, level: entry, saved, save, solve, lastRun, keepRun, phone }) {
  const level = entry.source
  const term = (text) => L(sayTerm(parseSide(text), level.notation))
  const cond = (text) => L(say(parseS(text), level.notation))
  const words = (text) => sayTerm(parseSide(text), level.notation)
  const [sides, setSides] = useState(() => kept(saved, level))
  const write = (k, tree) => {
    const next = sides.map((p, j) => (j === k ? tree : p))
    setSides(next)
    save(next)
    reset()
  }
  const chips = useMemo(() => level.rows.map((row) => termChips(row.choices.map(parseSide), level.notation)), [level])
  const picks = sides.map((side) => (complete(side) ? showTerm(side) : ''))
  // Checked as a declaration is: against the level's tests, out of sight; a failure says the first thing wrong.
  const judge = () => {
    if (!picks.every(Boolean)) return { pass: false, text: L(T_WRITE) }
    const wrong = checkDefine(level, picks).rows.find((row) => !row.pass)
    return wrong ? { pass: false, text: L(whyNot(wrong, words)) } : { pass: true }
  }
  const { results, dock, reset } = useCheckOnce({ judge, passed: tr('每个值都正确，每次递归调用的参数都更小，因此这条定义必定终止。'), onPass: () => solve(null), lastRun, keepRun })
  const rows = (
    <RuleRows
      wide
      rows={level.rows.map((row, k) => ({
        name: <>{row.when && <>{cond(row.when)} ⟹ </>}<b>{term(row.lhs)}</b> =</>,
        slots: [{ text: picks[k] ? term(picks[k]) : null }],
      }))}
      editor={{
        title: (k) => `${term(level.rows[k].lhs)} =`,
        render: (k) => (
          <div className="lg-sentence-box">
            <SentenceEditor key={k} root="term" tree={sides[k]} onChange={(tree) => write(k, tree)} chips={chips[k]} notation={level.notation} scope={`${entry.id}:${level.task}:${k}`} />
          </div>
        ),
      }}
      blank={UNFINISHED}
    />
  )
  const brief = <Brief game={game} level={entry} hint={level.hint} phone={phone} />
  return <Level phone={phone} className="lg-define-level" brief={brief} stage={<div className="lg-define">{rows}</div>} results={results} dock={dock} />
}
