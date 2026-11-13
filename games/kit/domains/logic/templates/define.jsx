import { useMemo, useState } from 'react'
import { Brief, Level, RuleRows, useCheckTable } from '../../../shell/index.js'
import { L, T, tr } from '../../../shell/i18n.js'
import { WORDS } from '../../../shell/words.js'
import { showTerm } from '../formula.js'
import { parseS, parseSide } from '../schematic.js'
import { say, sayTerm } from '../notation.js'
import { complete, termChips } from '../formulaTree.js'
import { checkDefine, whyNot } from '../define.js'
import SentenceEditor from '../ui/SentenceEditor.jsx'

// The template of a definition task (define.js): the kit's rows of rules (../../../shell/RuleRows.jsx) over its table
// of checks (../../../shell/CheckTable.jsx), and nothing drawn here. A template is how one way of playing puts the
// kit's components together, before any level is written; a level only fills it in.
//
//   rows     one for each constructor of the argument the function takes apart (or each value of its condition): its
//            left side given, its right side a term the player builds on the strip (ui/SentenceEditor.jsx) from the
//            pieces the row's choices are made of
//   checks   the level's tests, what each term should work out to and what the rows work it out to, then whether
//            every call on a right side takes apart a smaller argument
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
  }
  const chips = useMemo(() => level.rows.map((row) => termChips(row.choices.map(parseSide), level.notation)), [level])
  const picks = sides.map((side) => (complete(side) ? showTerm(side) : ''))
  // Every check of the definition as written, worked out once for the rows of the table to read.
  const checked = useMemo(() => (picks.every(Boolean) ? checkDefine(level, picks) : null), [level, sides])
  const last = level.tests.length
  const checks = [
    ...level.tests.map((test, k) => ({
      cells: [term(test.term), term(test.value)],
      run: () => {
        const row = checked.rows[k]
        return { pass: row.pass, got: row.got.loops ? tr('不终止') : L(sayTerm(row.got.value, level.notation)), why: whyNot(row, words) }
      },
    })),
    {
      cells: [tr('每次递归调用的参数都更小')],
      run: () => {
        const row = checked.rows[last]
        return { pass: row.pass, got: row.pass ? '✓' : tr(`第 ${row.row + 1} 行的参数没有变小`, `Row ${row.row + 1}: the argument does not decrease`), why: whyNot(row, words) }
      },
    },
  ]
  const { table, dock } = useCheckTable({
    columns: [tr('表达式'), L(WORDS.wanted), L(WORDS.result)],
    checks,
    wait: checked ? null : T_WRITE,
    board: sides,
    passed: tr('每个值都正确，每次递归调用的参数都更小，因此这条定义必定终止。'),
    words: { go: tr('运行测试', 'Run the tests'), done: tr('定义已接受') },
    onSolve: () => solve(null),
    kept: lastRun,
    onKeep: keepRun,
  })
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
  return <Level phone={phone} className="lg-define-level" brief={brief} stage={<div className="lg-define">{rows}</div>} results={table} dock={dock} />
}
