import { TreeRows } from 'kernel/view'
import define from './game.js'
import { sums } from './sums.js'
export { displays } from './displays.js'
export { default } from './game.js'

export function Equation({ task, work, onChange }) {
  const resource = sums(task)
  return <TreeRows {...resource.rows(work ?? resource.initial(), onChange, task.taskId ?? task.id)} />
}

export function register(kernel) {
  kernel.play('rows:equation', { component: Equation, preview: Equation, define })
}
