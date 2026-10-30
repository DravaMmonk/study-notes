import { ChoiceField, ListField, RowTable, SelectField } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'

// The test cases (检验条例) of a declaration board, on the shared table the player fills in (../../../shell/RowTable.jsx):
// four columns, what is given (numbered), the goal, what is expected of it (预期), and whether the declaration derives
// it (结果: the result, filled in only as a run steps to the case). The level's cases are read only; an audit's are
// the player's to write (`edit`): a case opens in a form where the givens are added from a drop-down of the level's
// sentences (as an assumption card picks one) and taken off with ×, the goal is picked from the same sentences, and the
// expectation chosen. `result(k)` is case k's result on the board on view, { derived, wrong } or null before a run
// reaches it.

const T = (zh, en) => ({ zh, en })
const MOST = 8

export default function CaseTable({ cases, words, level, choices = [], edit = null, rowClass = () => '', onPick = () => {}, result = () => null }) {
  const name = (s) => L(words(s))
  const goalOf = (c) => c.goal ?? level.target
  const derivable = (yes) => (yes ? tr('可推导', 'Derivable') : tr('不可推导', 'Not derivable'))
  const options = choices.map((s) => ({ value: s, label: words(s) }))
  const columns = [
    { key: 'given', label: T('已知', 'Given'), align: 'start', cell: (c) => (c.given.length ? <span className="lg-lines">{c.given.map((s, i) => <span key={s}>{`${i + 1}. ${name(s)}`}</span>)}</span> : <span className="lg-mark">{tr('无', 'Nothing')}</span>) },
    { key: 'goal', label: T('目标', 'Goal'), cell: (c) => name(goalOf(c)) },
    { key: 'make', label: T('预期', 'Expected'), cell: (c) => derivable(c.make) },
    { key: 'result', label: T('结果', 'Result'), className: 'lg-result', cell: (_, k) => (result(k) ? <span className={result(k).wrong ? 'lg-wrong' : ''}>{derivable(result(k).derived)}</span> : '') },
  ]
  const form = (c, set) => (
    <>
      <ListField label={T('已知', 'Given')} value={c.given} options={options} onChange={(given) => set({ ...c, given })} addLabel={T('添加已知…', 'Add a given…')} none={T('没有已知', 'Nothing given')} />
      <SelectField label={T('目标', 'Goal')} value={goalOf(c)} options={options} onChange={(goal) => set({ ...c, goal: goal === level.target ? undefined : goal })} />
      <ChoiceField label={T('预期', 'Expected')} value={c.make} options={[{ value: true, label: T('可推导', 'Derivable') }, { value: false, label: T('不可推导', 'Not derivable') }]} onChange={(make) => set({ ...c, make })} />
    </>
  )
  return (
    <RowTable
      rows={cases}
      columns={columns}
      onChange={edit}
      form={form}
      blank={() => ({ given: [], make: true })}
      max={MOST}
      addLabel={T('添加条例', 'Add a test case')}
      formTitle={(k) => (k === null ? T('新的检验条例', 'New test case') : T(`第 ${k + 1} 条检验条例`, `Test case ${k + 1}`))}
      rowClass={rowClass}
      onPick={onPick}
      empty={edit ? T('还没有条例。', 'No test case yet.') : null}
    />
  )
}
