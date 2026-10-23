// The logic domain's checks for `npm run check` (../../engine/check.js): every proof level's reference proof closes
// its goal and its naive one does not; every goal the reference proves has no countermodel on small domains (a level
// whose goal is false would be caught), and a level that asks for a countermodel (`unprovable`) has one. A truth-table
// level's formulas parse and its task can be done: a `counter` formula has a false row, a `valid` level mixes both.
// Every letter a level shows has its everyday sentence, and every proof level comes as test cases (course.js). No proof
// level is one use of a lemma it carries away from done. A truth circuit's reference board gives its sentence on every
// row, its naive one does not (or breaks its gate budget), and a gate it builds computes exactly that sentence. A
// proof that holds parts back (`without`) does not use them, and no reference answer uses a part its level cannot have.
import { reach } from '../../course.js'
import { keyOf } from '../../shell/i18n.js'
import { runLevel } from '../../engine/tests.js'
import { parse } from './formula.js'
import { countermodel } from './models.js'
import { LOGIC_TESTS, lemmaGives } from './proof.js'
import { lettersOf, tautology } from './truth.js'
import { checkGates, gatesOf, rowsFor } from './gates.js'

/** spec: { levels, course }. Returns [{ text, fail? }]. */
export function validate({ levels: given, course }) {
  const out = []
  // Every task of a level is checked as a level of its own (course.js tasks).
  const levels = given.flatMap((l) => l.tasks?.map((t) => ({ ...t, title: { zh: `${t.title.zh} · ${t.step.zh}`, en: `${t.title.en} · ${t.step.en}` } })) ?? [l])
  // A level in everyday words has a sentence for every letter it uses.
  for (const level of levels.filter((l) => l.notation?.words)) {
    const texts = level.kind === 'truth' ? level.formulas : level.kind === 'gates' ? [level.target] : level.tests.flatMap((t) => [...Object.values(t.premises ?? {}), t.goal])
    // The pattern's own letters stand bare in its last test.
    const bare = new Set(Object.keys(level.cases?.[0] ?? {}))
    const missing = lettersOf(texts.map((t) => parse(t))).filter((l) => !level.notation.words[l] && !bare.has(l))
    if (missing.length) out.push({ fail: true, text: `${level.id}: no words for ${missing.join(', ')}` })
    if (level.kind === 'proof' && !level.cases) out.push({ fail: true, text: `${level.id}: a proof level needs test cases` })
  }
  for (const level of levels.filter((l) => l.kind === 'truth')) {
    const formulas = level.formulas.map((t) => parse(t))
    const bad = level.ask === 'counter' ? formulas.filter((f) => tautology(f)) : []
    const mixed = level.ask !== 'valid' || (formulas.some(tautology) && formulas.some((f) => !tautology(f)))
    out.push({ fail: bad.length > 0 || !mixed, text: `${level.id} ${keyOf(level.title)}: (truth ${level.ask}) ${bad.length ? 'a formula has no false row' : mixed ? 'ok' : 'every formula gives the same answer'}` })
  }
  for (const level of levels.filter((l) => l.kind === 'gates')) {
    const good = checkGates(level, level.solution)
    out.push({ fail: !good.pass, text: `${level.id} ${keyOf(level.title)}: circuit ${good.pass ? 'PASS' : 'FAIL'} [${good.gates} gates]` })
    if (level.naive) {
      const bad = checkGates(level, level.naive)
      out.push({ fail: bad.pass, text: `  naive ${bad.pass ? 'PASSES (bad)' : 'fails'}` })
    }
    if (level.builds) {
      const gate = gatesOf(level.gates)[level.builds]
      const wrong = !gate ? ['no such gate'] : rowsFor(level).rows.filter(({ row, want }) => gate.f(rowsFor(level).letters.map((l) => row[l])) !== want)
      if (wrong.length) out.push({ fail: true, text: `${level.id}: the gate ${level.builds} does not compute its sentence` })
    }
  }
  for (const level of levels.filter((l) => l.kind === 'proof')) {
    const consts = level.consts ?? []
    for (const test of level.tests) {
      const premises = Object.values(test.premises ?? {}).map((t) => parse(t, { consts }))
      const m = countermodel(premises, parse(test.goal, { consts }))
      if (level.unprovable && !m) out.push({ fail: true, text: `${level.id}: ${test.goal} should have a countermodel, and none was found` })
      if (!level.unprovable && m) out.push({ fail: true, text: `${level.id}: ${test.goal} has a countermodel, so no proof can exist` })
    }
    if (level.unprovable) { out.push({ text: `${level.id} ${keyOf(level.title)}: countermodel found` }); continue }
    const carried = level.lemmas ? reach(course, { id: level.id }).filter((p) => level.lemmas[p] && course.builder(p) !== level.id && !level.without?.includes(p)) : []
    for (const p of carried) {
      const gives = (t) => lemmaGives(level.lemmas[p], Object.values(t.premises ?? {}).map((x) => parse(x, { consts })), parse(t.goal, { consts }))
      if (level.tests.every(gives)) out.push({ fail: true, text: `${level.id}: the lemma ${p} it carries proves it in one step` })
    }
    const held = course && new Set([...reach(course, { id: level.id }), 'premise', 'goal'])
    const missing = held ? [...new Set(level.solution.nodes.map((n) => n.type).filter((t) => !held.has(t)))] : []
    if (missing.length) out.push({ fail: true, text: `${level.id}: the solution uses ${missing.join(', ')}, which the level cannot have yet` })
    const banned = level.solution.nodes.filter((n) => level.without?.includes(n.type)).map((n) => n.type)
    if (banned.length) out.push({ fail: true, text: `${level.id}: the solution uses ${banned.join(', ')}, which the level holds back` })
    const good = runLevel(LOGIC_TESTS, level, level.solution)
    out.push({ fail: !good.pass, text: `${level.id} ${keyOf(level.title)}: solution ${good.pass ? 'PASS' : `FAIL ${good.results.map((r) => keyOf(r.checks[0].reason)).join('; ')}`} [${good.score.steps} steps]` })
    if (level.naive) {
      const bad = runLevel(LOGIC_TESTS, level, level.naive)
      out.push({ fail: bad.pass, text: `  naive ${bad.pass ? 'PASSES (bad)' : 'fails'}` })
    }
  }
  return out
}

