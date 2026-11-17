import { useState, tr, Text } from 'kernel/view'

export function Answer({ task, work, onChange }) {
  return <section>
    <Text text={task.brief} />
    {task.choices ? <select aria-label={tr('答案', 'Answer')} value={work} onChange={event => onChange(event.target.value)}>
      <option value="">—</option>{task.choices.map(value => <option key={value} value={value}>{value}</option>)}
    </select> : <input aria-label={tr('答案', 'Answer')} value={work} onChange={event => onChange(event.target.value)} />}
  </section>
}
export function Preview({ task }) {
  const [work, setWork] = useState('')
  return <Answer task={task} work={work} onChange={setWork} />
}
export function register(kernel) {
  kernel.play('text:answer', { component: Answer, preview: Preview, modes: ['preview', 'edit'] })
}
