// The __name__ domain's checks for `npm run check` (../../engine/checks.js): what reading the content found wrong
// (course.js), then level by level, task by task: the reference board passes every test and hidden test, says nothing from what it
// hears in the same tick, and uses only the parts the level holds and its fixed cards; the empty board fails; the
// naive board, where the level has one, is one the level could hold and fails (a challenge must have one: the course
// audit); and a part a level builds, placed alone on that level's board and wired to its inputs and outputs, passes the
// level's tests and hidden tests.
import { keyOf } from '../../shell/i18n.js'
import { usable } from '../../course.js'
import { fromText, portsOut, startBoard } from './board.js'
import { FIXED } from './parts.js'
import { runLevel } from './run.js'

/** A level with its hidden tests after the others. */
const all = (level) => ({ ...level, tests: [...level.tests, ...level.hidden] })

/** spec: domain.js spec(content). Returns [{ text, fail?, level? }]: a line about one level names it; a level of
 *  several tasks says each task's verdict in turn. */
export function validate({ __name__ }) {
  const { LEVELS, course, partOf } = __name__
  // A player who reached a level has built every part before it.
  const built = new Set(LEVELS.filter((L) => L.builds).map((L) => L.builds.type))
  const out = __name__.wrong.map((text) => ({ text, fail: true }))
  for (const level of LEVELS) {
    const tasks = __name__.played.get(level.id)
    const held = new Set(usable(course, { id: level.id }, built))
    const said = tasks.map((task, k) => {
      const problems = []
      const strays = (board, what) => board.nodes.filter((n) => !FIXED.includes(n.type) && !held.has(n.type)).forEach((n) => problems.push(`${what} uses ${n.type}, which the level does not hold`))
      strays(task.solution, 'the answer')
      const where = (j) => (j < task.tests.length ? `test ${j + 1}` : `hidden test ${j - task.tests.length + 1}`)
      const ref = runLevel(all(task), task.solution, partOf)
      ref.runs.forEach((r, j) => {
        if (r.error) problems.push(`the answer has a loop on ${where(j)}`)
        if (r.fail) problems.push(`the answer fails ${where(j)} at tick ${r.fail.tick} (${r.fail.name}: want ${r.fail.want}, got ${r.fail.got})`)
      })
      // The empty board must fail, or the tests ask nothing.
      if (runLevel(task, startBoard(task), partOf).pass) problems.push('the empty board passes')
      let naive = ''
      if (task.naive) {
        strays(task.naive, 'the naive answer')
        const runs = runLevel(all(task), task.naive, partOf).runs
        const first = runs.findIndex((r) => r.fail || r.error)
        if (first < 0) problems.push('the naive answer passes')
        else naive = `, naive fails ${where(first)}`
      }
      // The part the level builds runs its last task's board.
      const builds = level.builds && k === tasks.length - 1
      if (builds) {
        const outs = portsOut(task).map((o) => o.name)
        const box = fromText([`p = ${level.builds.type}(${(task.inputs ?? []).map((i) => i.name).join(', ')})`, ...outs.map((o) => `${o} <- ${outs.length > 1 ? `p.${o}` : 'p'}`)], task, partOf)
        runLevel(all(task), box, partOf).runs.forEach((r, j) => {
          if (r.error || r.fail) problems.push(`its part ${level.builds.type} alone fails ${where(j)}${r.fail ? ` at tick ${r.fail.tick}` : ''}`)
        })
      }
      const ticks = ref.runs.reduce((n, r) => n + r.ticks.length, 0)
      const hidden = task.hidden.length ? ` + ${task.hidden.length} hidden` : ''
      const head = tasks.length > 1 ? `task ${k + 1}: ` : ''
      return { problems, text: `${head}${problems.length ? problems.join('; ') : `answer PASS (${task.tests.length} tests${hidden}, ${ticks} ticks)${naive}${builds ? `, part ${level.builds.type} PASS` : ''}`}` }
    })
    out.push({ level: level.id, fail: said.some((x) => x.problems.length > 0), text: `${level.id} ${keyOf(level.title)}: ${said.map((x) => x.text).join(' · ')}` })
  }
  return out
}
