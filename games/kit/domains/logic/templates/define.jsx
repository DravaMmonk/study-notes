import { useMemo, useState } from 'react'
import { Brief, Level, RuleRows, useCheckOnce } from '../../../shell/index.js'
import { L, T, tr } from '../../../shell/i18n.js'
import { showTerm } from '../formula.js'
import { parseS, parseSide } from '../schematic.js'
import { say, sayTerm } from '../notation.js'
import { complete, termChips } from '../formulaTree.js'
import { checkDefine } from '../define.js'
import TreeEditor from '../../../strip/TreeEditor.jsx'
import { sentenceLanguage } from '../sentenceLanguage.js'

// The template of a definition task (define.js): the kit's rows of rules (../../../shell/RuleRows.jsx) and a check in
// one go (../../../shell/CheckOnce.jsx), as a declaration is (declare.jsx), and nothing drawn here. A template is how one way of playing puts the
// kit's components together, before any level is written; a level only fills it in.
//
//   rows     one for each constructor of the argument the function takes apart (or each value of its condition): its
//            left side given, its right side a term the player builds on the strip (strip/TreeEditor.jsx) from the
//            pieces the row's choices are made of
//   check    the level's tests (what each term should work out to), then whether every call on a right side takes
//            apart a smaller argument; they stay out of sight, and a failure says the first one that is wrong
// Any definition that passes is accepted; later levels go by the reference one (course.js).

const UNFINISHED = T('未写完')

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
  const [sides, setSides] = useState(() => kept(saved, level))
  const write = (k, tree) => {
    const next = sides.map((p, j) => (j === k ? tree : p))
    setSides(next)
    save(next)
    reset()
  }
  const chips = useMemo(() => level.rows.map((row) => termChips(row.choices.map(parseSide), level.notation)), [level])
  const picks = sides.map((side) => (complete(side) ? showTerm(side) : ''))
  const { results, dock, reset } = useCheckOnce({ judge: checkDefine(level), work: picks, passed: tr('每个值都正确，每次递归调用的参数都更小，因此这条定义必定终止。'), onPass: () => solve(null), lastRun, keepRun })
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
            <TreeEditor key={k} tree={sides[k]} onChange={(tree) => write(k, tree)} chips={chips[k]} language={sentenceLanguage(level.notation, 'term')} scope={`${entry.id}:${level.task}:${k}`} />
          </div>
        ),
      }}
      blank={UNFINISHED}
    />
  )
  const brief = <Brief game={game} level={entry} hint={level.hint} phone={phone} />
  return <Level phone={phone} className="lg-define-level" brief={brief} stage={<div className="lg-define">{rows}</div>} results={results} dock={dock} />
}
