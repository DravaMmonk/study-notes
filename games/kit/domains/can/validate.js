// The can domain's checks for `npm run check` (../../engine/check.js), level by level: the reference board passes every
// test, says nothing from what it hears in the same tick, and uses only the parts the level holds and its fixed cards;
// the empty board fails.
import { keyOf } from '../../shell/i18n.js'
import { usable } from '../../course.js'
import { startBoard } from './build.js'
import { FIXED } from './parts.js'
import { runLevel } from './run.js'

/** spec: { bus } (course.js busCourse). Returns [{ text, fail? }]. */
export function validate({ bus }) {
  const { LEVELS, course, partOf } = bus
  // A player who reached a level has built every part before it.
  const built = new Set(LEVELS.filter((L) => L.builds).map((L) => L.builds.type))
  return LEVELS.map((level) => {
    const problems = []
    const held = new Set(usable(course, { id: level.id }, built))
    for (const n of level.solution.nodes) if (!FIXED.includes(n.type) && !held.has(n.type)) problems.push(`the answer uses ${n.type}, which the level does not hold`)
    const ref = runLevel(level, level.solution, partOf)
    ref.runs.forEach((r, k) => {
      if (r.error) problems.push(`the answer has a loop on test ${k + 1}`)
      if (r.fail) problems.push(`the answer fails test ${k + 1} at tick ${r.fail.tick} (${r.fail.name}: want ${r.fail.want}, got ${r.fail.got})`)
    })
    // The empty board must fail, or the tests ask nothing.
    if (runLevel(level, startBoard(level), partOf).pass) problems.push('the empty board passes')
    const ticks = ref.runs.reduce((n, r) => n + r.ticks.length, 0)
    return { fail: problems.length > 0, text: `${level.id} ${keyOf(level.title)}: ${problems.length ? problems.join('; ') : `answer PASS (${ref.runs.length} tests, ${ticks} ticks)`}` }
  })
}
