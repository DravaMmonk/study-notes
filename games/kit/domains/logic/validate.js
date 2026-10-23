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
import { freeVars, parse } from './formula.js'
import { countermodel, holds } from './models.js'
import { builtWorld, extent, structureOf } from './fol.js'
import { answersFor, factsOf, hornOf } from './tactics.js'
import { LOGIC_TESTS, RULES, lemmaGives } from './proof.js'
import { proof } from './build.js'
import { portsOf } from '../../engine/circuit.js'
import { lettersOf, tautology } from './truth.js'
import { MACHINE_PARTS, MACHINE_TESTS } from './machine.js'
import { checkGates, gatesOf, rowsFor } from './gates.js'

/** spec: { levels, course }. Returns [{ text, fail? }]. */
export function validate({ levels: given, course }) {
  const out = []
  // Every task of a level is checked as a level of its own (course.js tasks).
  const levels = given.flatMap((l) => l.tasks?.map((t) => ({ ...t, title: { zh: `${t.title.zh} · ${t.step.zh}`, en: `${t.title.en} · ${t.step.en}` } })) ?? [l])
  // A level in everyday words has a sentence for every letter it uses.
  for (const level of levels.filter((l) => l.notation?.words && !l.vocab)) {
    const texts = level.kind === 'truth' ? level.formulas : level.kind === 'gates' ? [level.target] : level.kind === 'machine' ? level.tests.flatMap((t) => (t.eqs || t.eq ? [] : t.goal ? [t.goal, ...(t.hyps ?? [])] : t.clauses ?? (t.inputs ? Object.values(t.inputs) : [t.in]))) : level.tests.flatMap((t) => [...Object.values(t.premises ?? {}), t.goal])
    // The pattern's own letters stand bare in its last test; a machine's tests may end on bare letters too.
    const bare = new Set(level.kind === 'machine' ? 'ABCDEFGHPQRS'.split('') : Object.keys(level.cases?.[0] ?? {}))
    const missing = lettersOf(texts.map((t) => parse(t))).filter((l) => !level.notation.words[l] && !bare.has(l))
    if (missing.length) out.push({ fail: true, text: `${level.id}: no words for ${missing.join(', ')}` })
    if (level.kind === 'proof' && !level.cases) out.push({ fail: true, text: `${level.id}: a proof level needs test cases` })
  }
  // First-order levels: every predicate and name has words; a query picks something out in some world; a model level's
  // reference world (`answer`) gives each sentence the value asked, and its naive one (`wrong`) does not.
  for (const level of levels.filter((l) => l.vocab)) {
    const words = level.notation.words ?? {}
    const missing = [...level.vocab.preds.map(([p]) => p), ...level.vocab.consts].filter((w) => !words[w])
    if (missing.length) out.push({ fail: true, text: `${level.id}: no words for ${missing.join(', ')}` })
    const consts = level.vocab.names
    if (level.kind === 'translate') for (const item of level.items) if (freeVars(parse(item.target, { consts })).size) out.push({ fail: true, text: `${level.id}: ${item.target} has a free variable` })
    if (level.kind === 'query') {
      for (const world of level.worlds) for (const t of world.things) if (!words[t]) out.push({ fail: true, text: `${level.id}: no words for the thing ${t}` })
      for (const item of level.items) {
        const f = parse(item.target, { consts })
        const free = [...freeVars(f)]
        if (free.length !== 1 || free[0] !== 'x') out.push({ fail: true, text: `${level.id}: a query needs the free variable x alone: ${item.target}` })
        else if (!level.worlds.some((w) => extent(f, structureOf(w, [f])).length)) out.push({ fail: true, text: `${level.id}: ${item.target} picks out nothing in any world` })
      }
    }
    if (level.kind === 'prolog') {
      const rules = level.items.map((i) => hornOf(parse(i.target, { consts })))
      if (rules.some((r) => !r)) out.push({ fail: true, text: `${level.id}: a reference rule is not a Horn rule` })
      else {
        const answers = level.worlds.flatMap((w) => level.queries.map((q) => answersFor(parse(q, { consts }), [...factsOf(w), ...rules])))
        const bad = answers.some((a) => a.loop) ? 'loops' : answers.every((a) => !a.length) ? 'answers nothing' : null
        out.push({ fail: Boolean(bad), text: `${level.id} ${keyOf(level.title)}: rules ${bad ?? 'PASS'}` })
        for (const world of level.worlds) for (const t of world.things) if (!words[t]) out.push({ fail: true, text: `${level.id}: no words for the thing ${t}` })
      }
      if (level.naiveRules) {
        const naive = level.naiveRules.map((t) => hornOf(parse(t, { consts })))
        const loops = level.worlds.some((w) => level.queries.some((q) => answersFor(parse(q, { consts }), [...factsOf(w), ...naive]).loop))
        out.push({ fail: !loops, text: `  naive ${loops ? 'loops' : 'does NOT loop (bad)'}` })
      }
    }
    if (level.kind === 'model') {
      const fits = (w) => w.size <= (level.maxSize ?? 3) && level.want.every((x) => holds(parse(x.f, { consts }), builtWorld(w, level.vocab)) === x.value)
      out.push({ fail: !fits(level.answer), text: `${level.id} ${keyOf(level.title)}: world ${fits(level.answer) ? 'PASS' : 'FAIL'}` })
      if (level.wrong) out.push({ fail: fits(level.wrong), text: `  naive ${fits(level.wrong) ? 'PASSES (bad)' : 'fails'}` })
    }
  }
  for (const level of levels.filter((l) => l.kind === 'truth')) {
    const formulas = level.formulas.map((t) => parse(t))
    const bad = level.ask === 'counter' ? formulas.filter((f) => tautology(f)) : level.ask === 'sat' ? formulas.filter((f) => tautology({ op: '¬', a: f })) : []
    const mixed = level.ask !== 'valid' || (formulas.some(tautology) && formulas.some((f) => !tautology(f)))
    out.push({ fail: bad.length > 0 || !mixed, text: `${level.id} ${keyOf(level.title)}: (truth ${level.ask}) ${bad.length ? `a formula has no ${level.ask === 'sat' ? 'true' : 'false'} row` : mixed ? 'ok' : 'every formula gives the same answer'}` })
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
  for (const level of levels.filter((l) => l.kind === 'machine')) {
    const good = runLevel(MACHINE_TESTS, level, level.solution)
    out.push({ fail: !good.pass, text: `${level.id} ${keyOf(level.title)}: machine ${good.pass ? 'PASS' : `FAIL ${good.results.filter((r) => !r.pass).map((r) => keyOf(r.checks[0].reason)).join('; ')}`} [${good.score.steps} cards]` })
    if (level.naive) {
      const bad = runLevel(MACHINE_TESTS, level, level.naive)
      out.push({ fail: bad.pass, text: `  naive ${bad.pass ? 'PASSES (bad)' : 'fails'}` })
    }
    if (level.budget !== undefined && good.score.steps > level.budget) out.push({ fail: true, text: `${level.id}: the solution breaks its budget` })
  }
  // A machine part a level builds runs as its built-in implementation: alone, it passes the level that builds it, unless
  // a task of the level proves it (a law card proved on the proof board, then put to work).
  const proven = new Set(given.filter((l) => l.proves || l.tasks?.some((t) => t.proves)).map((l) => l.id))
  for (const level of levels.filter((l) => l.builds && MACHINE_PARTS[l.builds] && l.kind === 'machine' && !proven.has(l.id))) {
    const alone = { nodes: [{ id: 'in', type: 'in', params: { name: 'in' } }, { id: 'x', type: level.builds }, { id: 'out', type: 'out', params: { name: 'out' } }], wires: [{ from: 'in', to: 'x', port: 'in' }, { from: 'x', to: 'out', port: 'in' }] }
    const run = runLevel(MACHINE_TESTS, level, alone)
    if (!run.pass) out.push({ fail: true, text: `${level.id}: the built-in ${level.builds} does not pass the level that builds it` })
  }
  // A rule a task proves (not a lemma: a part with its own implementation) proves that task in one step.
  for (const level of levels.filter((l) => l.kind === 'proof' && RULES[l.proves])) {
    const ins = portsOf(RULES[level.proves], {})
    const premises = Object.keys(level.schema.premises ?? {})
    const alone = proof({ x: [level.proves] }, [...premises.map((p, k) => `${p}>x.${ins[k]}`), 'x>goal'], { premises })
    if (!runLevel(LOGIC_TESTS, level, alone).pass) out.push({ fail: true, text: `${level.id}: the rule ${level.proves} does not prove the task that proves it` })
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
    // A later task of a level may use what the level builds.
    const held = course && new Set([...reach(course, { id: level.id }), 'premise', 'goal', ...(level.task > 0 && level.builds ? [level.builds] : [])])
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


