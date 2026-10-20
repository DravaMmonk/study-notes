// The logic domain's checks for `npm run check` (../../engine/check.js): every proof level's reference proof closes
// its goal and its naive one does not; every goal the reference proves has no countermodel on small domains (a level
// whose goal is false would be caught), and a level that asks for a countermodel (`unprovable`) has one. A truth-table
// level's formulas parse and its task can be done: a `counter` formula has a false row, a `valid` level mixes both.
// Every letter a level shows has its everyday sentence, and every proof level comes as test cases (course.js).
import { keyOf } from '../../shell/i18n.js'
import { runLevel, withHidden } from '../../engine/tests.js'
import { parse } from './formula.js'
import { countermodel } from './models.js'
import { LOGIC_TESTS } from './proof.js'
import { lettersOf, tautology } from './truth.js'

/** spec: { levels }. Returns [{ text, fail? }]. */
export function validate({ levels }) {
  const out = []
  // A level in everyday words has a sentence for every letter it uses.
  for (const level of levels.filter((l) => l.notation?.words)) {
    const texts = level.kind === 'truth' ? level.formulas : withHidden(level).tests.flatMap((t) => [...Object.values(t.premises ?? {}), t.goal])
    const missing = lettersOf(texts.map((t) => parse(t))).filter((l) => !level.notation.words[l])
    if (missing.length) out.push({ fail: true, text: `${level.id}: no words for ${missing.join(', ')}` })
    if (level.kind === 'proof' && !level.cases) out.push({ fail: true, text: `${level.id}: a proof level needs test cases` })
    // Every {name} in its words is something a test fills in: a letter, a premise, or the goal.
    if (level.kind === 'proof' && level.cases) {
      const known = new Set([...Object.keys(level.cases[0]), ...Object.keys(level.schema.premises ?? {}), 'goal'])
      const words = JSON.stringify([level.brief, level.hint, level.intro, level.after])
      const unknown = [...new Set([...words.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].filter((name) => !known.has(name))
      if (unknown.length) out.push({ fail: true, text: `${level.id}: its words name ${unknown.map((n) => `{${n}}`).join(' ')}, which no test fills in` })
    }
  }
  for (const level of levels.filter((l) => l.kind === 'truth')) {
    const formulas = level.formulas.map((t) => parse(t))
    const bad = level.ask === 'counter' ? formulas.filter((f) => tautology(f)) : []
    const mixed = level.ask !== 'valid' || (formulas.some(tautology) && formulas.some((f) => !tautology(f)))
    out.push({ fail: bad.length > 0 || !mixed, text: `${level.id} ${keyOf(level.title)}: (truth ${level.ask}) ${bad.length ? 'a formula has no false row' : mixed ? 'ok' : 'every formula gives the same answer'}` })
  }
  for (const level of levels.filter((l) => l.kind === 'proof').map(withHidden)) {
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

