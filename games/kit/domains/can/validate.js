// The can domain's checks for `npm run check` (../../engine/checks.js): what reading the content found wrong
// (course.js), then level by level: the reference board passes every test and hidden test, says nothing from what it
// hears in the same tick, and uses only the parts the level holds and its fixed cards; the empty board fails; the
// naive board, where the level has one, is one the level could hold and fails (a challenge must have one: the course
// audit); and a part a level builds, placed alone on that level's board and wired to its inputs and outputs, passes the
// level's tests and hidden tests.
import { keyOf } from '../../shell/i18n.js'
import { usable } from '../../course.js'
import { fromText, startBoard } from './board.js'
import { FIXED } from './parts.js'
import { runLevel } from './run.js'

/** A level with its hidden tests after the others. */
const all = (level) => ({ ...level, tests: [...level.tests, ...level.hidden] })

/** spec: domain.js spec(content). Returns [{ text, fail?, level? }]: a line about one level names it. */
export function validate({ bus }) {
  const { LEVELS, course, partOf } = bus
  // A player who reached a level has built every part before it.
  const built = new Set(LEVELS.filter((L) => L.builds).map((L) => L.builds.type))
  const out = bus.wrong.map((text) => ({ text, fail: true }))
  for (const level of LEVELS) {
    const problems = []
    const held = new Set(usable(course, { id: level.id }, built))
    const strays = (board, what) => board.nodes.filter((n) => !FIXED.includes(n.type) && !held.has(n.type)).forEach((n) => problems.push(`${what} uses ${n.type}, which the level does not hold`))
    strays(level.solution, 'the answer')
    const where = (k) => (k < level.tests.length ? `test ${k + 1}` : `hidden test ${k - level.tests.length + 1}`)
    const ref = runLevel(all(level), level.solution, partOf)
    ref.runs.forEach((r, k) => {
      if (r.error) problems.push(`the answer has a loop on ${where(k)}`)
      if (r.fail) problems.push(`the answer fails ${where(k)} at tick ${r.fail.tick} (${r.fail.name}: want ${r.fail.want}, got ${r.fail.got})`)
    })
    // The empty board must fail, or the tests ask nothing.
    if (runLevel(level, startBoard(level), partOf).pass) problems.push('the empty board passes')
    let naive = ''
    if (level.naive) {
      strays(level.naive, 'the naive answer')
      const runs = runLevel(all(level), level.naive, partOf).runs
      const first = runs.findIndex((r) => r.fail || r.error)
      if (first < 0) problems.push('the naive answer passes')
      else naive = `, naive fails ${where(first)}`
    }
    if (level.builds) {
      const outs = level.outputs.map((o) => o.name)
      const box = fromText([`p = ${level.builds.type}(${(level.inputs ?? []).map((i) => i.name).join(', ')})`, ...outs.map((o) => `${o} <- ${outs.length > 1 ? `p.${o}` : 'p'}`)], level, partOf)
      runLevel(all(level), box, partOf).runs.forEach((r, k) => {
        if (r.error || r.fail) problems.push(`its part ${level.builds.type} alone fails ${where(k)}${r.fail ? ` at tick ${r.fail.tick}` : ''}`)
      })
    }
    const ticks = ref.runs.reduce((n, r) => n + r.ticks.length, 0)
    const hidden = level.hidden.length ? ` + ${level.hidden.length} hidden` : ''
    out.push({ level: level.id, fail: problems.length > 0, text: `${level.id} ${keyOf(level.title)}: ${problems.length ? problems.join('; ') : `answer PASS (${level.tests.length} tests${hidden}, ${ticks} ticks)${naive}${level.builds ? `, part ${level.builds.type} PASS` : ''}`}` })
  }
  return out
}
