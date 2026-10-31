import { useMemo } from 'react'
import { ChoiceField, Field, InlineChoice, RowTable } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { show } from '../formula.js'
import { chipsFrom } from '../formulaTree.js'
import { propositionsOf, sentenceOf } from '../iso.js'
import { SentenceButton, SentenceList } from './SentencePick.jsx'

// The test cases (检验条例) of a declaration on the rule board, on the shared table the player fills in (../../../shell/RowTable.jsx):
// four columns, the premises (numbered), the goal, what is expected of it (预期), and whether the declaration derives
// it (结果: the result, filled in only as a run steps to the case). The level's cases are read only; an audit's are
// the player's to write (`edit`): on a desktop in the table itself, on a phone a case opens in a form; a premise or the
// goal is a sentence built on the strip in a sheet (SentencePick.jsx) from the pieces of the level's sentences, a
// premise taken off with ×, and the expectation chosen; a level's `caseGoal` and `caseMake` fix every case's goal and expectation, and its `slots`
// sets out that many empty cases beforehand, none added or deleted; or, as a list, each case set out with some cells
// filled in (`fixed`: those the player cannot change; `keep`: premises that stay, the player adding others; a goal not
// filled in yet is ''). The level's own cases do not show what is
// expected: a declaration on the rule board shows only each result, green when it agrees with the expectation and red when not,
// as a run steps to it. `result(k)` is case k's result on the board on view, { derived, wrong } or null before a run
// reaches it.

const T = (zh, en) => ({ zh, en })
const MOST = 8

/** An empty case: no premises, and the goal and expectation left for the player ('' and null) unless the level fixes them. */
export const blankCase = (level) => ({ given: [], goal: level.caseGoal ?? '', make: level.caseMake ?? null })
/** The cases a level sets out beforehand: its `slots`, blank ones, or each as given (cells not fixed left empty). */
export const setOut = (level) => (Array.isArray(level.slots)
  ? level.slots.map((c) => ({ given: c.fixed.includes('given') ? c.given : c.keep ?? [], ...(c.keep ? { keep: c.keep } : {}), goal: c.fixed.includes('goal') ? c.goal : '', make: c.fixed.includes('make') ? c.make : null, fixed: c.fixed }))
  : Array.from({ length: level.slots }, () => blankCase(level)))

export default function CaseTable({ cases, words, level, edit = null, rowClass = () => '', onPick = () => {}, result = () => null, phone = false }) {
  const name = (s) => L(words(s))
  const goalOf = (c) => c.goal ?? level.target
  const locked = (c, cell) => c.fixed?.includes(cell)
  // Premises a case keeps (`keep`) stay first, whatever is taken off.
  const setGiven = (c, set) => (given) => set({ ...c, given: [...(c.keep ?? []), ...given.filter((s) => !c.keep?.includes(s))] })
  const unset = T('选择目标…', 'Choose a goal…')
  const derivable = (yes) => (yes ? tr('可推导', 'Derivable') : tr('不可推导', 'Not derivable'))
  const unsure = T('选择预期…', 'Choose…')
  const makeCell = (c) => (c.make === null ? <span className="lg-mark">{L(unsure)}</span> : derivable(c.make))
  // A sentence is built from the pieces of every sentence the level's cases may give or aim at.
  const build = useMemo(() => {
    const read = (t) => sentenceOf(level, t)
    return { read, notation: level.notation, chips: chipsFrom(propositionsOf(level).map(read), { consts: level.things ?? [], notation: level.notation }) }
  }, [level])
  const target = show(sentenceOf(level, level.target))
  const makes = [{ value: true, label: T('可推导', 'Derivable') }, { value: false, label: T('不可推导', 'Not derivable') }]
  const setGoal = (c, set) => (goal) => set({ ...c, goal: goal === target ? undefined : goal })
  const givenCell = (c) => (c.given.length ? <span className="lg-lines">{c.given.map((s, i) => <span key={s}>{`${i + 1}. ${name(s)}`}</span>)}</span> : <span className="lg-mark">{tr('无', 'Nothing')}</span>)
  const goalCell = (c) => (c.goal === '' ? <span className="lg-mark">{L(unset)}</span> : name(goalOf(c)))
  const columns = [
    { key: 'given', label: T('前提', 'Premises'), align: 'start', edit: (c, set, k) => (locked(c, 'given') ? givenCell(c) : premises(c, set, k)), cell: givenCell },
    { key: 'goal', label: T('目标', 'Goal'), edit: level.caseGoal ? null : (c, set, k) => (locked(c, 'goal') ? goalCell(c) : goal(c, set, k)), cell: goalCell },
    // A declaration to write or correct keeps its expectations to itself: a run only says whether each result is right.
    ...(edit ? [{ key: 'make', label: T('预期', 'Expected'), edit: level.caseMake !== undefined ? null : (c, set) => (locked(c, 'make') ? derivable(c.make) : <InlineChoice value={c.make} options={makes} unset={unsure} onChange={(make) => set({ ...c, make })} />), cell: makeCell }] : []),
    { key: 'result', label: T('结果', 'Result'), className: 'lg-result', cell: (_, k) => (result(k) ? <span className={result(k).wrong ? 'lg-wrong' : 'lg-right'}>{derivable(result(k).derived)}</span> : '') },
  ]
  const premises = (c, set, k) => <SentenceList value={c.given.filter((s) => !c.keep?.includes(s))} kept={[]} onChange={setGiven(c, set)} build={build} title={T(`第 ${k + 1} 条条例的前提`, `A premise of test case ${k + 1}`)} addLabel={T('添加前提', 'Add a premise')} scope={`${level.id}:case${k}`} />
  const goal = (c, set, k) => <SentenceButton value={c.goal === '' ? '' : goalOf(c)} onChange={setGoal(c, set)} build={build} title={T(`第 ${k + 1} 条条例的目标`, `The goal of test case ${k + 1}`)} placeholder={unset} scope={`${level.id}:goal${k}`} />
  const form = (c, set, k) => (
    <>
      {locked(c, 'given') ? <Field label={T('前提（固定）', 'Premises (fixed)')}>{givenCell(c)}</Field> : <Field label={T('前提', 'Premises')}>{premises(c, set, k)}</Field>}
      {level.caseGoal || locked(c, 'goal')
        ? <Field label={T('目标（固定）', 'Goal (fixed)')}><span className="ff-fixed">{name(level.caseGoal ?? goalOf(c))}</span></Field>
        : <Field label={T('目标', 'Goal')}>{goal(c, set, k)}</Field>}
      {level.caseMake !== undefined || locked(c, 'make')
        ? <Field label={T('预期（固定）', 'Expected (fixed)')}><span className="ff-fixed">{derivable(level.caseMake ?? c.make)}</span></Field>
        : <ChoiceField label={T('预期', 'Expected')} value={c.make} options={makes} onChange={(make) => set({ ...c, make })} />}
    </>
  )
  return (
    <RowTable
      rows={cases}
      columns={columns}
      onChange={edit}
      form={form}
      blank={() => blankCase(level)}
      max={MOST}
      addLabel={T('添加条例', 'Add a test case')}
      formTitle={(k) => T(`第 ${k + 1} 条检验条例`, `Test case ${k + 1}`)}
      rowClass={rowClass}
      onPick={onPick}
      empty={edit ? T('还没有条例。', 'No test case yet.') : null}
      phone={phone}
      fixed={Boolean(level.slots)}
      tip={T('点按一条条例即可修改。', 'Tap a test case to edit it.')}
    />
  )
}
