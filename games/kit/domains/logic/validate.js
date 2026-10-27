// The logic domain's checks for `npm run check` (../../engine/check.js): every proof level's reference proof closes
// its goal and its naive one does not; every goal the reference proves has no countermodel on small domains (a level
// whose goal is false would be caught), and a level that asks for a countermodel (`unprovable`) has one. A truth-table
// level's formulas parse and its task can be done: a `counter` formula has a false row, a `valid` level mixes both.
// Every letter a level shows has its everyday sentence, and every proof level comes as test cases (course.js). No proof
// level is one use of a lemma it carries away from done. A truth circuit's reference board gives its sentence on every
// row, its naive one does not (or breaks its gate budget), and a gate it builds computes exactly that sentence. A
// proof that holds parts back (`without`) does not use them, and no reference answer uses a part its level cannot have
// (but for what its board starts with: a preset names cards of the answer).
import { formsAt, reach } from '../../course.js'
import { keyOf } from '../../shell/i18n.js'
import { runLevel } from '../../engine/tests.js'
import { freeVars, parse, same, show } from './formula.js'
import { parseS } from './schematic.js'
import { countermodel, holds } from './models.js'
import { builtWorld, extent, structureOf } from './fol.js'
import { LOGIC_TESTS, RULES, lemmaGives } from './proof.js'
import { checkScript, methodsOf, sentencesOf } from './script.js'
import { proof } from './build.js'
import { portsOf } from '../../engine/circuit.js'
import { lettersOf, tautology } from './truth.js'
import { MACHINE_PARTS, MACHINE_TESTS } from './machine.js'
import { SETTING_KINDS, choiceKey, choicesOf } from './choices.js'
import { chipsOf, missingChips } from './formulaTree.js'
import { freeIn, parseTerm } from './pterm.js'
import { termTaskOf } from './termTask.js'
import { missingForms } from './termTree.js'
import { checkGates, gatesOf, rowsFor } from './gates.js'

/** spec: { levels, course }. Returns [{ text, fail? }]. */
export function validate({ levels: given, course }) {
  const out = []
  // Every task of a level is checked as a level of its own (course.js tasks).
  const builder = new Map(given.map((l) => [l.id, l.builds]))
  const levels = given.flatMap((l) => l.tasks?.map((t) => ({ ...t, title: { zh: `${t.title.zh} · ${t.step.zh}`, en: `${t.title.en} · ${t.step.en}` } })) ?? [l])
  // A preset names cards of the level's reference answer (course.js).
  for (const level of levels.filter((l) => l.preset)) {
    const lost = level.preset.filter((id) => !level.solution?.nodes.some((n) => n.id === id))
    if (lost.length) out.push({ fail: true, text: `${level.id}: its preset names ${lost.join(', ')}, which its reference answer does not have` })
  }
  // A level in everyday words has a sentence for every letter it uses.
  for (const level of levels.filter((l) => l.notation?.words && !l.vocab)) {
    const texts = level.kind === 'truth' ? level.formulas : level.kind === 'gates' ? [level.target] : level.kind === 'term' ? [...Object.values(level.premises ?? {}), level.goal] : level.kind === 'script' ? [...Object.values(level.premises ?? {}), level.goal, ...(level.sentences ?? [])] : level.kind === 'machine' ? level.tests.flatMap((t) => (t.eqs || t.term ? [] : t.goal ? [t.goal, ...(t.hyps ?? [])] : t.clauses)) : level.tests.flatMap((t) => [...Object.values(t.premises ?? {}), t.goal])
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
    if (level.kind === 'translate' || level.kind === 'query') {
      // The sentence can be built from the chips the task offers (formulaTree.js).
      const f = parse(level.target, { consts })
      const missingChip = missingChips(f, chipsOf(level))
      if (missingChip.length) out.push({ fail: true, text: `${level.id}: ${level.target} needs chips not on offer: ${missingChip.join(', ')}` })
      if (level.kind === 'translate' && freeVars(f).size) out.push({ fail: true, text: `${level.id}: ${level.target} has a free variable` })
    }
    if (level.kind === 'query') {
      for (const world of level.worlds) for (const t of world.things) if (!words[t]) out.push({ fail: true, text: `${level.id}: no words for the thing ${t}` })
      const f = parse(level.target, { consts })
      const free = [...freeVars(f)]
      if (free.length !== 1 || free[0] !== 'x') out.push({ fail: true, text: `${level.id}: a query needs the free variable x alone: ${level.target}` })
      else if (!level.worlds.some((w) => extent(f, structureOf(w, [f])).length)) out.push({ fail: true, text: `${level.id}: ${level.target} picks out nothing in any world` })
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
  // A term task's reference term checks and can be built from its chips (termTree.js); its naive one does not check.
  for (const level of levels.filter((l) => l.kind === 'term')) {
    const consts = level.consts ?? []
    const task = termTaskOf(level)
    const answer = parseTerm(level.answer)
    const reason = task.check(answer)
    out.push({ fail: Boolean(reason), text: `${level.id} ${keyOf(level.title)}: term ${level.answer} ${reason ? `FAILS ${keyOf(reason)}` : 'PASS'}` })
    // Every name the term uses is a chip of the task: a premise, a thing, a lemma it offers (`uses`).
    const offered = new Set([...Object.keys(level.premises ?? {}), ...consts, ...(level.uses ?? [])])
    const unoffered = [...freeIn(answer)].filter((n) => !offered.has(n))
    if (unoffered.length) out.push({ fail: true, text: `${level.id}: ${level.answer} names ${unoffered.join(', ')}, which no chip gives` })
    const unbuilt = missingForms(answer, level.forms)
    if (unbuilt.length) out.push({ fail: true, text: `${level.id}: ${level.answer} uses forms no chip makes: ${unbuilt.join(', ')}` })
    if (level.naive && !task.check(parseTerm(level.naive))) out.push({ fail: true, text: `${level.id}: the naive term ${level.naive} checks` })
    // A term handed over to mend is wrong to begin with, and can be built on with the chips.
    if (level.given && !task.check(parseTerm(level.given))) out.push({ fail: true, text: `${level.id}: the given term ${level.given} already checks` })
    if (level.given && missingForms(parseTerm(level.given), level.forms).length) out.push({ fail: true, text: `${level.id}: the given term ${level.given} uses forms no chip makes` })
  }
  // A script task's reference script checks, row by row, with what its rows can choose; its naive one does not, nor
  // does a script it starts from.
  for (const level of levels.filter((l) => l.kind === 'script')) {
    const run = (rows) => checkScript(level, rows)
    const ref = run(level.answer)
    out.push({ fail: !ref.pass, text: `${level.id} ${keyOf(level.title)}: script ${ref.pass ? 'PASS' : `FAILS ${keyOf(ref.reason)}`}` })
    const consts = [...(level.consts ?? []), ...(level.things ?? [])]
    const sentences = new Set(sentencesOf(level).map((f) => show(f)))
    const { rules, tactics } = methodsOf(level)
    const methods = new Set(['proof', ...rules.map((m) => m.key), ...tactics])
    for (const r of level.answer) {
      if (r.stmt && !sentences.has(show(parse(r.stmt, { consts })))) out.push({ fail: true, text: `${level.id}: the script states ${r.stmt}, which no row can choose` })
      if (r.by && !methods.has(r.by)) out.push({ fail: true, text: `${level.id}: the script proves a row by ${r.by}, which the level does not offer` })
      if (r.thing && !(level.things ?? []).includes(r.thing)) out.push({ fail: true, text: `${level.id}: the script takes ${r.thing}, which no row can name` })
    }
    if (level.naive && run(level.naive).pass) out.push({ fail: true, text: `${level.id}: the naive script checks` })
    if (level.given && run(level.given).pass) out.push({ fail: true, text: `${level.id}: the given script already checks` })
  }
  // A machine part a level builds runs as its built-in implementation: alone, it passes the level that builds it, unless
  // a task of the level proves it (a law card proved on the proof board, then put to work). A part whose circuit chose
  // a rule takes that choice as its setting (`builtWith`: the setting the level's circuit had).
  const proven = new Set(given.filter((l) => l.proves || l.tasks?.some((t) => t.proves)).map((l) => l.id))
  for (const level of levels.filter((l) => l.builds && MACHINE_PARTS[l.builds] && l.kind === 'machine' && !proven.has(l.id))) {
    const alone = { nodes: [{ id: 'in', type: 'in', params: { name: 'in' } }, { id: 'x', type: level.builds, params: level.builtWith ?? {} }, { id: 'out', type: 'out', params: { name: 'out' } }], wires: [{ from: 'in', to: 'x', port: 'in' }, { from: 'x', to: 'out', port: 'in' }] }
    const run = runLevel(MACHINE_TESTS, level, alone)
    if (!run.pass) out.push({ fail: true, text: `${level.id}: the built-in ${level.builds} does not pass the level that builds it` })
  }
  // An equation a machine level proves is what its every test proves.
  for (const level of levels.filter((l) => l.kind === 'machine' && l.facts?.[l.builds])) {
    const statement = parseS(level.facts[level.builds].statement)
    if (!level.tests.every((t) => t.goal && same(parseS(t.goal), statement))) out.push({ fail: true, text: `${level.id}: its tests are not all the equation ${level.builds} it proves` })
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
      // A test that asks for a term asks for one proof in particular, not just any.
      const l = level.lemmas[p]
      const forms = l.forms ? formsAt(course, l.forms[0].key, level.revisions?.[p], level.id) : null
      const gives = (t) => !t.term && lemmaGives(l, Object.values(t.premises ?? {}).map((x) => parse(x, { consts })), parse(t.goal, { consts }), forms)
      if (level.tests.every(gives)) out.push({ fail: true, text: `${level.id}: the lemma ${p} it carries proves it in one step` })
    }
    // A later task of a level may use what the level builds.
    const held = course && new Set([...reach(course, { id: level.id }), 'premise', 'goal', ...(level.task > 0 && builder.get(level.id) ? [builder.get(level.id)] : [])])
    const missing = held ? [...new Set(level.solution.nodes.filter((n) => !level.preset?.includes(n.id)).map((n) => n.type).filter((t) => !held.has(t)))] : []
    if (missing.length) out.push({ fail: true, text: `${level.id}: the solution uses ${missing.join(', ')}, which the level cannot have yet` })
    // Every sentence, term or variable the reference proof picks on a card is one the card offers (choices.js).
    const offer = choicesOf(level)
    const offered = Object.fromEntries(Object.entries(offer).map(([kind, list]) => [kind, new Set(list.map((x) => (typeof x === 'string' ? x : show(x))))]))
    for (const n of level.solution.nodes) {
      for (const [key, value] of Object.entries(n.params ?? {})) {
        const kind = SETTING_KINDS[n.type]?.[key] ?? 'formula'
        if (typeof value !== 'string' || ['name', 'side', 'form'].includes(key) || !(RULES[n.type]?.params ?? level.lemmas?.[n.type]?.metas ?? []).includes(key)) continue
        if (!offered[kind].has(choiceKey(kind, value, level))) out.push({ fail: true, text: `${level.id}: the solution picks ${value} on ${n.type}, which its card does not offer (add it to the level's sentences)` })
      }
    }
    // A card of a part with forms is in a shape the level offers: its first, or one an upgrade passed before brings.
    for (const n of level.solution.nodes.filter((m) => level.lemmas?.[m.type]?.forms && m.params?.form)) {
      const l = level.lemmas[n.type]
      if (!formsAt(course, l.forms[0].key, level.revisions?.[n.type], level.id).includes(n.params.form)) out.push({ fail: true, text: `${level.id}: the solution puts ${n.type} in the shape ${n.params.form}, which the level does not offer yet` })
    }
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


