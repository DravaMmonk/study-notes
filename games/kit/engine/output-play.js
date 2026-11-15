import { withHidden } from './tests.js'

// Tests are revealed on a passed task but remain part of judging before then.
export function visibleOutputTask(task, solved, play) {
  return solved && play.checks === 'afterPass' ? withHidden(task) : task
}

export function hiddenOutputTests(task, solved, play) {
  return !solved && play.checks === 'afterPass' ? task.hidden ?? [] : []
}

export function failedOutputTests(run, task, work, tests) {
  return tests.length ? run({ ...task, tests }, work).results.filter(({ pass }) => !pass).length : 0
}
