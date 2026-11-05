// The agent domain's checks for `npm run check` (../../engine/checks.js): what reading the content found wrong
// (course.js), then level by level, task by task:
//
//   · a hand task's reference ops end in a green test run
//   · a board task's reference answer passes every test and hidden test, using only cards the level holds and the
//     fixed cards of its machine
//   · a naive answer, where a task has one, fails (a challenge must have one: the course audit)
//   · every file a read card's setting names is in the task's repositories
import { keyOf } from '../../shell/i18n.js'
import { playHand } from './hand.js'
import { FIXED } from './parts.js'
import { runLevel } from './run.js'
import { usable } from '../../course.js'

const all = (task) => ({ ...task, tests: [...task.tests, ...task.hidden] })

/** spec: domain.js spec(content). Returns [{ text, fail?, level? }]: a line about one level names it. */
export function validate({ agent }) {
  const { LEVELS, played, course, filesIn } = agent
  const out = agent.wrong.map((text) => ({ text, fail: true }))
  for (const level of LEVELS) {
    const tasks = played.get(level.id)
    const held = new Set(usable(course, { id: level.id }, new Set()))
    for (const task of tasks) {
      const name = `${level.id} ${keyOf(level.title)}${tasks.length > 1 ? ` task ${task.taskId}` : ''}`
      if (task.kind === 'hand') {
        const s = playHand(task, task.solution)
        out.push({ level: level.id, fail: !s.green, text: `${name}: ${s.green ? `answer PASS in ${task.solution.length} moves, ${s.tokens} tokens` : 'the reference moves do not end in a green test run'}` })
        continue
      }
      const problems = []
      for (const n of task.solution.nodes) {
        // A fixed card is on the board only when the task's machine gives it (board.js fromText).
        if (FIXED.includes(n.type)) continue
        if (!held.has(n.type)) problems.push(`the answer uses ${n.type}, which the level does not hold`)
        if (n.type === 'read' && n.params?.file && !filesIn(task).includes(n.params.file)) problems.push(`a read card names ${n.params.file}, which is in no repository of the task`)
      }
      const ref = runLevel(all(task), task.solution)
      ref.runs.forEach((r, k) => { if (r.fail) problems.push(`the answer fails test ${k + 1}: ${r.fail.en}`) })
      if (task.naive) {
        const naive = runLevel(all(task), task.naive)
        if (naive.pass) problems.push('the naive answer passes')
      }
      const tokens = ref.runs.reduce((n, r) => n + r.tokens, 0)
      out.push({ level: level.id, fail: problems.length > 0, text: `${name}: ${problems.length ? problems.join('; ') : `answer PASS (${ref.runs.length} tests, ${tokens} tokens)${task.naive ? ', the naive answer fails' : ''}`}` })
    }
  }
  return out
}
