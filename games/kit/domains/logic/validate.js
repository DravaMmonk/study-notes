// The logic domain's checks for `npm run check` (../../engine/check.js): every proof level's reference proof closes
// its goal and its naive one does not; every goal the reference proves has no countermodel on small domains (a level
// whose goal is false would be caught), and a level that asks for a countermodel (`unprovable`) has one.
import { keyOf } from '../../shell/i18n.js'
import { runLevel } from '../../engine/tests.js'
import { parse } from './formula.js'
import { countermodel } from './models.js'
import { LOGIC_TESTS } from './proof.js'

/** spec: { levels }. Returns [{ text, fail? }]. */
export function validate({ levels }) {
  const out = []
  for (const level of levels.filter((l) => l.kind === 'proof')) {
    const consts = level.consts ?? []
    for (const test of level.tests) {
      const premises = Object.values(test.premises ?? {}).map((t) => parse(t, { consts }))
      const m = countermodel(premises, parse(test.goal, { consts }))
      if (level.unprovable && !m) out.push({ fail: true, text: `${level.id}: ${test.goal} should have a countermodel, and none was found` })
      if (!level.unprovable && m) out.push({ fail: true, text: `${level.id}: ${test.goal} has a countermodel, so no proof can exist` })
    }
    if (level.unprovable) { out.push({ text: `${level.id} ${keyOf(level.title)}: countermodel found` }); continue }
    const good = runLevel(LOGIC_TESTS, level, level.solution)
    out.push({ fail: !good.pass, text: `${level.id} ${keyOf(level.title)}: solution ${good.pass ? 'PASS' : `FAIL ${good.results.map((r) => keyOf(r.checks[0].reason)).join('; ')}`} [${good.score.steps} steps]` })
    if (level.naive) {
      const bad = runLevel(LOGIC_TESTS, level, level.naive)
      out.push({ fail: bad.pass, text: `  naive ${bad.pass ? 'PASSES (bad)' : 'fails'}` })
    }
  }
  return out
}

