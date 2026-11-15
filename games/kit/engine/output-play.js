import { withHidden } from './tests.js'

// Tests are revealed on a passed task but remain part of judging before then.
export function visibleOutputTests(task, solved, checks) {
  return solved && checks.hidden === 'afterPass' ? withHidden(task) : task
}

export function hiddenOutputTests(task, solved, checks) {
  return !solved && checks.hidden === 'afterPass' ? task.hidden ?? [] : []
}

export function failedOutputTests(run, task, work, tests) {
  return tests.length ? run({ ...task, tests }, work).results.filter(({ pass }) => !pass).length : 0
}
