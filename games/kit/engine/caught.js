// A task read from the side of its checks: the works are given (the task's answer, sound; its `works`, each wrong in
// its own way) and the player writes the rows that test them. What any task asks holds here too: the sound work
// passes every check, and every wrong work fails at least one.
//
//   caught({ task, rows, check, run }) → what the rows come to
//     rows                 [row] what the player wrote, a row a check, in the domain's shape (numbers a card, the bits
//                          arriving on a wire…)
//     check(task, row)     → { test } | { unfilled: true } | { why }: the row as a test of the domain's, that it is
//                          not filled in yet, or why its world never shows it
//     run(board, tests)    → [run] a board on tests (a run fails by `fail` or `error`)
//   → { row, why: 'unfilled' | 'never' | 'unsound', said? }   the first row that is no check yet: a cell missing, a
//       case that never happens (`said`: the domain's reason), or an expectation the sound work does not meet
//   → { tests, works: [[run]], catches: [row | -1] }   each work's runs on the rows, and the first row that catches
//       it (-1: none does)

import { cases } from './judge.js'

const judge = (runs) => cases(runs, (_, run) => run.fail ?? (run.error ? { why: run.error } : null))(null)

export function caught({ task, rows, check, run }) {
  const read = rows.map((row) => check(task, row))
  const unfilled = read.findIndex((r) => r.unfilled)
  if (unfilled >= 0) return { row: unfilled, why: 'unfilled' }
  const never = read.findIndex((r) => r.why)
  if (never >= 0) return { row: never, why: 'never', said: read[never].why }
  const tests = read.map((r) => r.test)
  const unsound = judge(run(task.solution, tests))
  if (unsound) return { row: unsound.check, why: 'unsound' }
  const works = task.works.map((work) => run(work.board, tests))
  return { tests, works, catches: works.map((runs) => judge(runs)?.check ?? -1) }
}
