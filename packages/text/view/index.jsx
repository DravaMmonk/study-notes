import { tr, L } from 'kernel/view'
import './answer.css'

/** The answer the player gives: a text box, or one of the task's choices. Enter checks it. */
export function Answer({ task, work, onChange, onSubmit }) {
  if (task.choices) return (
    <div className="text-answer-choices" role="radiogroup" aria-label={tr('答案', 'Answer')}>
      {task.choices.map((value) => (
        <button key={value} type="button" role="radio" aria-checked={work === value} className={work === value ? 'is-on' : ''} onClick={() => onChange(value)}>{L(value)}</button>
      ))}
    </div>
  )
  return (
    <form className="text-answer" onSubmit={(event) => { event.preventDefault(); onSubmit?.() }}>
      <input value={work} onChange={(event) => onChange(event.target.value)} aria-label={tr('答案', 'Answer')} placeholder={tr('在这里作答', 'Type your answer')}
        autoComplete="off" autoCapitalize="off" spellCheck={false} />
    </form>
  )
}

export function register(kernel) {
  kernel.play('text:answer', { component: Answer, preview: Answer, modes: ['preview', 'edit'] })
}
