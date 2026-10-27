// The agent domain's checks for `npm run check` (../../engine/check.js), level by level:
//
//   · a hand level's reference ops end in a green test run
//   · a board level's reference answer passes every test and hidden test, using only cards the level holds and the
//     fixed cards of its machine
//   · a naive answer, where a level has one, fails (a challenge must have one: the course audit)
//   · every file a read card's setting names is in the level's repositories
import { keyOf } from '../../shell/i18n.js'
import { playHand } from './hand.js'
import { FIXED } from './parts.js'
import { runLevel } from './run.js'
import { usable } from '../../course.js'

const all = (level) => ({ ...level, tests: [...level.tests, ...level.hidden] })

/** spec: { agent } (course.js agentCourse). Returns [{ text, fail? }]. */
export function validate({ agent }) {
  const { LEVELS, course, filesIn } = agent
  const out = []
  for (const level of LEVELS) {
    const name = `${level.id} ${keyOf(level.title)}`
    if (level.kind === 'hand') {
      const s = playHand(level, level.solution)
      out.push({ fail: !s.green, text: `${name}: ${s.green ? `answer PASS in ${level.solution.length} moves, ${s.tokens} tokens` : 'the reference moves do not end in a green test run'}` })
      continue
    }
    const problems = []
    const held = new Set(usable(course, { id: level.id }, new Set()))
    for (const n of level.solution.nodes) {
      if (FIXED.includes(n.type)) { if (!level.fixed.includes(n.type)) problems.push(`the answer uses the card ${n.type}, which this machine does not give`); continue }
      if (!held.has(n.type)) problems.push(`the answer uses ${n.type}, which the level does not hold`)
      if (n.type === 'read' && n.params?.file && !filesIn(level).includes(n.params.file)) problems.push(`a read card names ${n.params.file}, which is in no repository of the level`)
    }
    const ref = runLevel(all(level), level.solution)
    ref.runs.forEach((r, k) => { if (r.fail) problems.push(`the answer fails test ${k + 1}: ${r.fail.en}`) })
    if (level.naive) {
      const naive = runLevel(all(level), level.naive)
      if (naive.pass) problems.push('the naive answer passes')
    }
    const tokens = ref.runs.reduce((n, r) => n + r.tokens, 0)
    out.push({ fail: problems.length > 0, text: `${name}: ${problems.length ? problems.join('; ') : `answer PASS (${ref.runs.length} tests, ${tokens} tokens)${level.naive ? ', naive FAIL' : ''}`}` })
  }
  return out
}
