// A task read from the side of its checks: the works are given (the task's answer, sound; its `works`, each wrong in
// its own way) and the player writes the rows that test them. What any task asks holds here too: the sound work
// passes every check, and every wrong work fails at least one.
//
//   caught({ task, rows, check, run }) → what the rows come to
//     rows                 [{ card: number | null }] a number for every card of the task
//     check(task, row)     → { test } | { why }: the row as a test of the domain's, or why its world never shows it
//     run(board, tests)    → [run] a board on tests (a run fails by `fail` or `error`)
//   → { row, why: 'unfilled' | 'never' | 'unsound', said? }   the first row that is no check yet: a number missing, a
//       case that never happens (`said`: the domain's reason), or an expectation the sound work does not meet
//   → { tests, works: [[run]], catches: [row | -1] }   each work's runs on the rows, and the first row that catches
//       it (-1: none does)

const failing = (r) => Boolean(r.fail || r.error)

export function caught({ task, rows, check, run }) {
  const ports = [...(task.inputs ?? []), ...task.outputs]
  const unfilled = rows.findIndex((row) => ports.some((p) => typeof row[p.name] !== 'number'))
  if (unfilled >= 0) return { row: unfilled, why: 'unfilled' }
  const read = rows.map((row) => check(task, row))
  const never = read.findIndex((r) => r.why)
  if (never >= 0) return { row: never, why: 'never', said: read[never].why }
  const tests = read.map((r) => r.test)
  const unsound = run(task.solution, tests).findIndex(failing)
  if (unsound >= 0) return { row: unsound, why: 'unsound' }
  const works = task.works.map((work) => run(work.board, tests))
  return { tests, works, catches: works.map((runs) => runs.findIndex(failing)) }
}
