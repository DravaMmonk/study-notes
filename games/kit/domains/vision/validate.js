// The vision domain's checks for `npm run check` (../../engine/checks.js): what reading the content found wrong
// (course.js), then level by level, task by task, by its kind —
//   circuit  the reference board passes every test and hidden test and uses only the parts the level holds and its
//            fixed cards; the empty board fails; the naive board, where there is one, is one the level could hold and
//            fails; a part a level builds, placed alone on that task's board and wired to its ports, passes
//   grid     the answer the ask works out passes; the answer the player starts from does not
//   choice   in every round the judge's own answer passes and an empty answer fails
//   bench    the model's verify: the lesson holds on these data (the start fails, some setting passes)
import { keyOf } from '../../shell/i18n.js'
import { usable } from '../../course.js'
import { fromText, startBoard } from './board.js'
import { FIXED } from './parts.js'
import { runLevel } from './run.js'
import { gridCheck, gridReference, gridStart } from './grid.js'
import { judgeOf } from './judges.js'

/** A task with its hidden tests after the others. */
const all = (task) => ({ ...task, tests: [...task.tests, ...task.hidden] })

function circuitSaid(task, { held, partOf, builds }) {
  const problems = []
  const strays = (board, what) => board.nodes.filter((n) => !FIXED.includes(n.type) && !held.has(n.type)).forEach((n) => problems.push(`${what} uses ${n.type}, which the level does not hold`))
  strays(task.solution, 'the answer')
  const where = (j) => (j < task.tests.length ? `test ${j + 1}` : `hidden test ${j - task.tests.length + 1}`)
  runLevel(all(task), task.solution, partOf).runs.forEach((r, j) => {
    if (r.fail) problems.push(`the answer fails ${where(j)}: ${r.fail.why.en}`)
  })
  if (runLevel(task, startBoard(task), partOf).pass) problems.push('the empty board passes')
  let naive = ''
  if (task.naive) {
    strays(task.naive, 'the naive answer')
    const first = runLevel(all(task), task.naive, partOf).runs.findIndex((r) => r.fail)
    if (first < 0) problems.push('the naive answer passes')
    else naive = `, naive fails ${where(first)}`
  }
  if (builds) {
    const box = fromText([`p = ${builds.type}(${task.inputs.map((i) => i.name).join(', ')})`, ...task.outputs.map((o) => `${o.name} <- ${task.outputs.length > 1 ? `p.${o.name}` : 'p'}`)], task, partOf)
    runLevel(all(task), box, partOf).runs.forEach((r, j) => {
      if (r.fail) problems.push(`its part ${builds.type} alone fails ${where(j)}`)
    })
  }
  const hidden = task.hidden.length ? ` + ${task.hidden.length} hidden` : ''
  return { problems, ok: `answer PASS (${task.tests.length} tests${hidden})${naive}${builds ? `, part ${builds.type} PASS` : ''}` }
}

function gridSaid(task) {
  const problems = []
  const why = gridCheck(task, gridReference(task))
  if (why) problems.push(`its own answer fails: ${why.en}`)
  if (!gridCheck(task, gridStart(task))) problems.push('the answer it starts from passes')
  return { problems, ok: 'grid PASS' }
}

function choiceSaid(task) {
  const { judge, params } = judgeOf(task.judge)
  const problems = []
  task.rounds.forEach((round, r) => {
    const wrong = judge.check(round, judge.reference(round, params), params)
    if (wrong.length) problems.push(`round ${r + 1}: its own answer fails: ${wrong[0].why.en}`)
    if (!judge.check(round, round.items.map(() => []), params).length) problems.push(`round ${r + 1}: answering nothing passes`)
  })
  return { problems, ok: `choice PASS (${task.rounds.length} round${task.rounds.length > 1 ? 's' : ''})` }
}

function benchSaid(task) {
  const why = task.made ? task.made.verify() : 'its bench does not read'
  return { problems: why ? [why] : [], ok: `bench ${task.bench.model} PASS` }
}

/** spec: domain.js spec(content). Returns [{ text, fail?, level? }]: a line about one level names it; a level of
 *  several tasks says each task's verdict in turn. */
export function validate({ vision }) {
  const { LEVELS, course, partOf } = vision
  // A player who reached a level has built every part before it.
  const built = new Set(LEVELS.filter((L) => L.builds).map((L) => L.builds.type))
  const out = vision.wrong.map((text) => ({ text, fail: true }))
  for (const level of LEVELS) {
    const tasks = vision.played.get(level.id)
    const held = new Set(usable(course, { id: level.id }, built))
    const said = tasks.map((task, k) => {
      const one = task.kind === 'circuit' ? circuitSaid(task, { held, partOf, builds: k === tasks.length - 1 ? level.builds : null })
        : task.kind === 'grid' ? gridSaid(task)
          : task.kind === 'choice' ? choiceSaid(task)
            : benchSaid(task)
      const head = tasks.length > 1 ? `task ${task.taskId}: ` : ''
      return { problems: one.problems, text: `${head}${one.problems.length ? one.problems.join('; ') : one.ok}` }
    })
    out.push({ level: level.id, fail: said.some((x) => x.problems.length > 0), text: `${level.id} ${keyOf(level.title)}: ${said.map((x) => x.text).join(' · ')}` })
  }
  return out
}
