import { useState } from 'react'
import { Brief, Level } from '../../../shell/index.js'
import { L, T } from '../../../shell/i18n.js'
import { paperCase, paperMatches } from '../paper.js'

export default function PaperScreen({ game, level: entry, saved, save, solve, phone }) {
  const task = entry.source
  const [answers, setAnswers] = useState(() => Array.isArray(saved) ? saved : task.cases.map(() => ''))
  const [checked, setChecked] = useState(null)
  const change = (index, value) => {
    const next = task.cases.map((_, i) => i === index ? value : answers[i] ?? '')
    setAnswers(next); setChecked(null); save(next)
  }
  const check = () => {
    const result = paperMatches(task, answers)
    setChecked(result)
    if (result.every(Boolean)) solve()
  }
  const brief = <Brief game={game} level={entry} hint={task.hint} phone={phone} />
  const stage = <section className="can-paper">
    {task.cases.map((item, index) => <div className="can-paper-case" key={index}>
      <p><b>{index + 1}.</b> {L(paperCase(task, item))}</p>
      <label><span>{L(T('你的答案', 'Your answer'))}</span><input type="text" value={answers[index] ?? ''} onChange={(event) => change(index, event.target.value)} autoComplete="off" spellCheck={false} /></label>
      {checked && <span role="status" className={checked[index] ? 'is-pass' : 'is-fail'}>{L(checked[index] ? T('正确', 'Correct') : T('再试一次', 'Try again'))}</span>}
    </div>)}
    <button type="button" className="can-paper-check" onClick={check}>{L(T('检查答案', 'Check answers'))}</button>
  </section>
  return <Level phone={phone} brief={brief} stage={stage} />
}
