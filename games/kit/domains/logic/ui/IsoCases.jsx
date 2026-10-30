import { X } from 'lucide-react'
import { L, tr } from '../../../shell/i18n.js'

// The test cases (检验条例) of a declaration board, one table of four columns: what is given (numbered), the goal, what is expected
// of it (预期), and whether the declaration derives it (是否可推导: the result, filled in by a run). The level's cases are
// read only; an audit's are the player's to write (`edit`): givens added from a drop-down of the level's sentences (as
// an assumption card picks one) and taken off with ×, the goal picked from the same sentences, and the expectation
// switched. `result(k)` is case k's result on the board on view, { derived, wrong } or null before a run reaches it.

export default function CaseTable({ cases, words, level, choices, edit = null, rowClass = () => '', onPick = () => {}, result = () => null }) {
  const name = (s) => L(words(s))
  const goalOf = (c) => c.goal ?? level.target
  const derivable = (yes) => (yes ? tr('可推导 ✔', 'Derivable ✔') : tr('不可推导 ✘', 'Not derivable ✘'))
  const set = (k, c) => edit(cases.map((x, j) => (j === k ? c : x)))
  return (
    <div className="lg-scroll-x">
      <table className="lg-rows lg-cases">
        <thead>
          <tr>
            <th>{tr('已知', 'Given')}</th>
            <th>{tr('目标', 'Goal')}</th>
            <th>{tr('预期', 'Expected')}</th>
            <th className="lg-result">{tr('是否可推导', 'Derivable?')}</th>
            {edit && <th aria-label={tr('删除', 'Remove')} />}
          </tr>
        </thead>
        <tbody>
          {cases.map((c, k) => (
            <tr key={k} className={rowClass(k)} onClick={() => onPick(k)}>
              <td className="lg-lines">
                {c.given.map((s, i) => (
                  <span key={s} className="lg-given">
                    {`${i + 1}. ${name(s)}`}
                    {edit && <button type="button" className="lg-drop" aria-label={tr('移除这条已知', 'Remove this given')} onClick={(e) => { e.stopPropagation(); set(k, { ...c, given: c.given.filter((x) => x !== s) }) }}><X size={12} /></button>}
                  </span>
                ))}
                {!c.given.length && !edit && <span className="lg-mark">{tr('无', 'Nothing')}</span>}
                {edit && (
                  <select className="lg-pick-select" value="" aria-label={tr('添加已知', 'Add a given')} onClick={(e) => e.stopPropagation()} onChange={(e) => e.target.value && set(k, { ...c, given: [...c.given, e.target.value] })}>
                    <option value="">{tr('添加已知…', 'Add a given…')}</option>
                    {choices.filter((s) => !c.given.includes(s)).map((s) => <option key={s} value={s}>{name(s)}</option>)}
                  </select>
                )}
              </td>
              <td>
                {edit ? (
                  <select className="lg-pick-select" value={goalOf(c)} aria-label={tr('目标', 'Goal')} onClick={(e) => e.stopPropagation()} onChange={(e) => set(k, { ...c, goal: e.target.value === level.target ? undefined : e.target.value })}>
                    {choices.map((s) => <option key={s} value={s}>{name(s)}</option>)}
                  </select>
                ) : name(goalOf(c))}
              </td>
              <td>
                {edit
                  ? <button type="button" className={`lg-pick ${c.make ? 'is-on' : ''}`} onClick={(e) => { e.stopPropagation(); set(k, { ...c, make: !c.make }) }}>{derivable(c.make)}</button>
                  : derivable(c.make)}
              </td>
              <td className={`lg-result ${result(k)?.wrong ? 'is-wrong' : ''}`}>{result(k) ? derivable(result(k).derived) : ''}</td>
              {edit && (
                <td>
                  <button type="button" className="lg-drop" aria-label={tr('删除这条条例', 'Remove this case')} onClick={(e) => { e.stopPropagation(); edit(cases.filter((_, j) => j !== k)) }}><X size={14} /></button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
