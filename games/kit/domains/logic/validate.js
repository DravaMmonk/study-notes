// Check the domain's reference works, the pieces they use, and the properties specific to proof tasks.
import { worldCheck } from './worldValues.js'
import { judgeFor, playFor } from '../../engine/plays.js'
import { plays } from './plays.js'
import { checkWorks, judgeWorks } from '../../engine/authoring.js'
import { failureText } from '../../engine/failure-text.js'
import { holds, reach } from '../../course.js'
import { keyOf } from '../../shell/i18n.js'
import { withHidden } from '../../engine/tests.js'
import { freeVars, parse, same, show } from './formula.js'
import { parseS } from './schematic.js'
import { countermodel } from './models.js'
import { extent, structureOf } from './fol.js'
import { checkDeclaration, readRuleRows } from './ruleLines.js'
import { lemmaGives, runProof, startProof } from './proof.js'
import { paramsOf } from '../../engine/forms.js'
import { scriptJudge, methodsOf, sentencesOf } from './script.js'
import { lettersOf, tautology } from './truth.js'
import { MACHINE_PARTS, inputsOfLevel, rulePartsOf, runMachine } from './machine.js'
import { SETTING_KINDS, choiceKey, choicesOf } from './choices.js'
import { chipsFrom, chipsOf, missingChips } from './formulaTree.js'
import { checkGates, rowsFor, startGates } from './gates.js'
import { checkIso, sentenceOf } from './iso.js'
import { auditCaseProblems, runAudit } from './audit-cases.js'
import { checkDefine } from './define.js'
import { say } from './notation.js'
import { presetIds } from './course.js'

const compare = (inspect, level) => checkWorks(inspect, { reference: level.solution, naive: level.naive })
const reportNaive = (out, { id: level }, naive) => {
  if (naive) out.push({ level, fail: !naive.ok, text: `  naive ${naive.ok ? 'fails' : 'PASSES (bad)'}` })
}

/** spec: domain.js spec(content). Returns [{ text, fail?, level? }]: a line about one level names it. */
export function validate({ levels: given, course, logic, memo = (_id, _name, f) => f() }) {
  const out = logic.wrong.map((text) => ({ fail: true, text }))
  // What judges a task's works goes through memo (../../engine/check-cache.js), by its level and its place there: run,
  // or read back while nothing it reads has changed.
  // Every task of a level is checked as a level of its own (course.js readTasks), named by its step where it has one.
  const builder = new Map(given.map((l) => [l.id, l.builds]))
  const levels = given.flatMap((l) => l.tasks.map((t) => (t.step ? { ...t, title: { zh: `${t.title.zh} · ${t.step.zh}`, en: `${t.title.en} · ${t.step.en}` } } : t)))
  // A preset names cards of the level's reference answer (course.js).
  for (const level of levels.filter((l) => l.preset)) {
    const lost = presetIds(level).filter((id) => !level.solution?.nodes.some((n) => n.id === id))
    if (lost.length) out.push({ level: level.id, fail: true, text: `${level.id}: its preset names ${lost.join(', ')}, which its reference answer does not have` })
  }
  // A level in everyday words has a sentence for every letter it uses.
  for (const level of levels.filter((l) => l.notation?.words && !l.vocab)) {
    const texts = level.kind === 'define' ? [] : level.kind === 'truth' ? level.formulas : level.kind === 'gates' ? [level.target] : level.kind === 'iso' ? [...level.sentences, ...level.tests.flatMap((t) => [...t.given, ...(t.goal ? [t.goal] : [])])] : level.kind === 'script' ? [...Object.values(level.premises ?? {}), level.goal, ...(level.sentences ?? [])] : level.kind === 'machine' ? level.tests.flatMap((t) => (t.eqs || t.term || t.ways ? [] : t.goal ? [t.goal, ...(t.hyps ?? [])] : t.clauses)) : level.tests.flatMap((t) => [...Object.values(t.premises ?? {}), t.goal])
    // The pattern's own letters stand bare in its last test; a machine's tests may end on bare letters too.
    const bare = new Set(level.kind === 'machine' ? 'ABCDEFGHPQRS'.split('') : Object.keys(level.cases?.[0] ?? {}))
    const missing = lettersOf(texts.map((t) => parse(t))).filter((l) => !level.notation.words[l] && !bare.has(l))
    if (missing.length) out.push({ level: level.id, fail: true, text: `${level.id}: no words for ${missing.join(', ')}` })
    if (level.kind === 'proof' && !level.cases) out.push({ level: level.id, fail: true, text: `${level.id}: a proof level needs test cases` })
  }
  // First-order levels: every predicate and name has words; a query picks something out in some world; a model level's
  // reference world (`answer`) gives each sentence the value asked, and its naive one (`wrong`) does not.
  for (const level of levels.filter((l) => l.vocab)) {
    const words = level.notation.words ?? {}
    const missing = [...level.vocab.preds.map(([p]) => p), ...level.vocab.consts].filter((w) => !words[w])
    if (missing.length) out.push({ level: level.id, fail: true, text: `${level.id}: no words for ${missing.join(', ')}` })
    const consts = level.vocab.names
    if (level.kind === 'translate' || level.kind === 'query') {
      // The sentence can be built from the chips the task offers (formulaTree.js).
      const f = parse(level.target, { consts })
      const missingChip = missingChips(f, chipsOf(level))
      if (missingChip.length) out.push({ level: level.id, fail: true, text: `${level.id}: ${level.target} needs chips not on offer: ${missingChip.join(', ')}` })
      if (level.kind === 'translate' && freeVars(f).size) out.push({ level: level.id, fail: true, text: `${level.id}: ${level.target} has a free variable` })
    }
    if (level.kind === 'query') {
      for (const world of level.worlds) for (const t of world.things) if (!words[t]) out.push({ level: level.id, fail: true, text: `${level.id}: no words for the thing ${t}` })
      const f = parse(level.target, { consts })
      const free = [...freeVars(f)]
      if (free.length !== 1 || free[0] !== 'x') out.push({ level: level.id, fail: true, text: `${level.id}: a query needs the free variable x alone: ${level.target}` })
      else if (!level.worlds.some((w) => extent(f, structureOf(w, [f])).length)) out.push({ level: level.id, fail: true, text: `${level.id}: ${level.target} picks out nothing in any world` })
    }
    if (level.kind === 'model') {
      out.push(...memo(level.id, `model ${level.task ?? 0}`, () => {
        const judge = judgeFor(playFor(plays, level), worldCheck(level).judge)
        const fail = Boolean(judge(level.answer))
        return [{ level: level.id, fail, text: `${level.id} ${keyOf(level.title)}: world ${fail ? 'FAIL' : 'PASS'}` }]
      }))
    }
  }
  for (const level of levels.filter((l) => l.kind === 'truth')) {
    const formulas = level.formulas.map((t) => parse(t))
    const bad = level.ask === 'counter' ? formulas.filter((f) => tautology(f)) : level.ask === 'sat' ? formulas.filter((f) => tautology({ op: '¬', a: f })) : []
    const mixed = level.ask !== 'valid' || (formulas.some(tautology) && formulas.some((f) => !tautology(f)))
    out.push({ level: level.id, fail: bad.length > 0 || !mixed, text: `${level.id} ${keyOf(level.title)}: (truth ${level.ask}) ${bad.length ? `a formula has no ${level.ask === 'sat' ? 'true' : 'false'} row` : mixed ? 'ok' : 'every formula gives the same answer'}` })
  }
  for (const level of levels.filter((l) => l.kind === 'gates')) {
    out.push(...memo(level.id, `gates ${level.task ?? 0}`, () => {
      const out = []
      const { reference: good, naive } = compare((work) => checkGates(level, work), level)
      out.push({ level: level.id, fail: !good.ok, text: `${level.id} ${keyOf(level.title)}: circuit ${good.ok ? 'PASS' : 'FAIL'} [${good.score.steps} gates]` })
      reportNaive(out, level, naive)
      // The gate a level builds runs its board (gates.js builtGates): alone, fed the level's letters, it passes the level.
      if (level.builds && level.gates[level.builds]) {
        const { letters } = rowsFor(level)
        const alone = { nodes: [...startGates(level).nodes, { id: 'x', type: level.builds, params: {} }], wires: [...letters.map((l, k) => ({ from: l, to: 'x', port: level.gates[level.builds].ports[k] })), { from: 'x', to: 'out', port: 'in' }] }
        if (!checkWorks((work) => checkGates({ ...level, budget: undefined }, work), { built: alone }).built.ok) out.push({ level: level.id, fail: true, text: `${level.id}: the gate ${level.builds}, alone, does not give its sentence` })
      }
      return out
    }))
  }
  for (const level of levels.filter((l) => l.kind === 'define')) {
    out.push(...memo(level.id, `define ${level.task ?? 0}`, () => {
      const out = []
      const { reference: { fail }, naive } = judgeWorks(judgeFor(playFor(plays, level), checkDefine(level)), { reference: level.solution, naive: level.naive })
      out.push({ level: level.id, fail: Boolean(fail), text: `${level.id} ${keyOf(level.title)}: definition of ${level.fn} ${fail ? `FAIL on row ${(fail.check ?? level.tests.length) + 1}` : 'PASS'}` })
      if (naive?.ok === false) out.push({ level: level.id, fail: true, text: `  naive definition of ${level.fn} PASSES (bad)` })
      level.rows.forEach((row, k) => { if (!row.choices.includes(level.solution[k])) out.push({ level: level.id, fail: true, text: `${level.id}: row ${k + 1}'s answer is not among its choices` }) })
      return out
    }))
  }
  for (const level of levels.filter((l) => l.kind === 'iso')) {
    out.push(...memo(level.id, `iso ${level.task ?? 0}`, () => {
      const out = []
      const words = (sentence) => say(sentenceOf(level, sentence), level.notation)
      const audit = level.play === 'audit'
      const check = audit ? checkIso(level, words) : checkDeclaration(level)
      const inspect = audit ? check : (rules) => check(readRuleRows(level, rules))
      const example = !audit && level.naive?.every((rule) => rule.needs) ? level.naive : null
      if (!audit && level.naive && !example) out.push({ level: level.id, fail: true, text: '  the naive declaration must list introduction rules' })
      const { reference: { fail }, naive } = judgeWorks(inspect, { reference: level.solution, naive: example })
      out.push({ level: level.id, fail: Boolean(fail), text: `${level.id} ${keyOf(level.title)}: declaration ${fail ? `FAIL ${keyOf(failureText(fail))}` : 'PASS'} [${level.solution.length} ways]` })
      if (audit) {
        const { reference: cases, naive } = checkWorks((work) => runAudit(level, work, words), { reference: level.answer, naive: level.naive })
        const miss = cases.fail
        out.push({ level: level.id, fail: !cases.ok, text: `  cases ${cases.ok ? 'PASS' : `FAIL on board ${miss.check + 1}: ${keyOf(miss.why)}`} [${level.answer.length} cases]` })
        if (naive?.ok === false) out.push({ level: level.id, fail: true, text: '  naive cases PASS (bad)' })
        // The reference cases fill the cases set out, and keep the goal and expectation the level fixes.
        for (const text of auditCaseProblems(level, level.answer)) out.push({ level: level.id, fail: true, text: `  ${text}` })
        // A board to check is right (want 'agree'); one to catch is wrong.
        level.boards.forEach(({ rules }, k) => { if (!check(rules) !== (level.want === 'agree')) out.push({ level: level.id, fail: true, text: `  board ${k + 1} ${level.want === 'agree' ? 'fails' : 'passes'} every situation (bad)` }) })
        return out
      }
      reportNaive(out, level, naive)
      return out
    }))
  }
  for (const level of levels.filter((l) => l.kind === 'machine')) {
    out.push(...memo(level.id, `machine ${level.task ?? 0}`, () => {
      const out = []
      // Every part of the answer is one its tray holds, a rule part one its books have.
      const holds = new Set([...reach(course, { id: level.id, task: level.task }), ...rulePartsOf(level).keys(), 'in', 'out'])
      const missing = [...new Set(level.solution.nodes.filter((n) => !presetIds(level).includes(n.id)).map((n) => n.type).filter((t) => !holds.has(t) && !(level.task > 0 && t === builder.get(level.id))))]
      if (missing.length) out.push({ level: level.id, fail: true, text: `${level.id}: the solution uses ${missing.join(', ')}, which the level cannot have yet` })
      const all = withHidden(level)
      const { reference: good, naive } = compare((work) => runMachine(all, work), level)
      const failures = good.runs.filter((r) => !r.pass).map((r) => keyOf(r.checks[0].reason))
      const verdict = good.pass ? 'PASS' : `FAIL ${failures.length ? failures.join('; ') : keyOf(good.constraint)}`
      out.push({ level: level.id, fail: !good.pass, text: `${level.id} ${keyOf(level.title)}: machine ${verdict} [${good.score.steps} cards]` })
      reportNaive(out, level, naive)
      return out
    }))
  }
  for (const level of levels.filter((l) => l.kind === 'script')) {
    out.push(...memo(level.id, `script ${level.task ?? 0}`, () => {
      const out = []
      const judge = judgeFor(playFor(plays, level), scriptJudge(level))
      const { reference: ref, naive, starter } = judgeWorks(judge, { reference: level.answer, naive: level.naive, starter: level.given })
      out.push({ level: level.id, fail: !ref.ok, text: `${level.id} ${keyOf(level.title)}: script ${ref.ok ? 'PASS' : `FAILS ${keyOf(ref.fail.why)}`}` })
      const consts = [...(level.consts ?? []), ...(level.things ?? [])]
      const sentences = new Set(sentencesOf(level).map((f) => show(f)))
      const { rules, tactics } = methodsOf(level)
      const methods = new Set(['proof', ...rules.map((m) => m.key), ...tactics])
      for (const r of level.answer) {
        if (r.stmt && !sentences.has(show(parse(r.stmt, { consts })))) out.push({ level: level.id, fail: true, text: `${level.id}: the script states ${r.stmt}, which no row can choose` })
        if (r.by && !methods.has(r.by)) out.push({ level: level.id, fail: true, text: `${level.id}: the script proves a row by ${r.by}, which the level does not offer` })
        if (r.thing && !(level.things ?? []).includes(r.thing)) out.push({ level: level.id, fail: true, text: `${level.id}: the script takes ${r.thing}, which no row can name` })
      }
      if (naive?.ok === false) out.push({ level: level.id, fail: true, text: `${level.id}: the naive script checks` })
      if (starter?.ok === false) out.push({ level: level.id, fail: true, text: `${level.id}: the given script already checks` })
      return out
    }))
  }
  for (const level of levels.filter((l) => l.builds && MACHINE_PARTS[l.builds] && l.kind === 'machine')) {
    out.push(...memo(level.id, `built ${level.task ?? 0}`, () => {
      const out = []
      const names = inputsOfLevel(level).map((i) => i.name)
      const alone = { nodes: [...names.map((name) => ({ id: name, type: 'in', params: { name } })), { id: 'x', type: level.builds, params: {} }, { id: 'out', type: 'out', params: { name: 'out' } }], wires: [...names.map((name) => ({ from: name, to: 'x', port: name })), { from: 'x', to: 'out', port: 'in' }] }
      const { built: run } = checkWorks((work) => runMachine(withHidden(level), work), { built: alone })
      if (!run.ok) out.push({ level: level.id, fail: true, text: `${level.id}: the part ${level.builds}, alone, does not pass the level that builds it` })
      return out
    }))
  }
  // A lemma runs the proof of each of its shapes (course.js lemmaProofs): its card alone, in that shape, fed the
  // premises of the task that proves it in order and set to the task's own letters, gives the statement on every test.
  for (const [type, shapes] of Object.entries(logic.proofs ?? {})) {
    for (const [key, { level }] of Object.entries(shapes)) {
      // A lemma whose proving task this course does not place is never earned in it: nothing to run.
      const part = level.parts?.[type]
      if (!part) continue
      const form = key ? { form: key } : {}
      const card = { id: 'x', type, params: { ...form, ...Object.fromEntries(paramsOf(part, { params: form }).filter((m) => m !== 'form').map((m) => [m, m])) } }
      const names = Object.keys(level.schema.premises ?? {})
      const alone = { nodes: [...startProof(level).nodes, card], wires: [...names.map((name, k) => ({ from: name, to: 'x', port: `p${k}` })), { from: 'x', to: 'goal', port: 'in' }] }
      out.push(...memo(level.id, `lemma ${type} ${key} ${level.task ?? 0}`, () => {
        const { built: run } = checkWorks((work) => runProof(level, work), { built: alone })
        const failed = run.runs[run.fail?.check]
        return failed ? [{ level: level.id, fail: true, text: `${level.id}: the lemma ${type}${key ? ` (${key})` : ''}, alone, does not give its statement: ${keyOf(failed.errors.get('x') ?? failed.checks[0].reason)}` }] : []
      }))
    }
  }
  // An equation a machine level proves is what its every test proves.
  for (const level of levels.filter((l) => l.kind === 'machine' && l.fact)) {
    const statement = parseS(level.facts[level.fact].statement)
    if (!level.tests.every((t) => t.goal && same(parseS(t.goal), statement))) out.push({ level: level.id, fail: true, text: `${level.id}: its tests are not all the equation ${level.fact} it proves` })
  }
  for (const level of levels.filter((l) => l.kind === 'proof')) {
    out.push(...memo(level.id, `proof ${level.task ?? 0}`, () => {
      const out = []
      const consts = level.consts ?? []
      // Induction is no first-order consequence (worlds with numbers past every S…S 0 satisfy the definitions and not
      // the conclusion), so a proof that uses it is not held to the countermodel search.
      const induction = (level.solution?.nodes ?? []).some((n) => (level.partResources?.[n.type] ?? n.type) === 'natInd')
      for (const test of induction ? [] : level.tests) {
        const premises = Object.values(test.premises ?? {}).map((t) => parse(t, { consts }))
        const m = countermodel(premises, parse(test.goal, { consts }))
        if (m) out.push({ level: level.id, fail: true, text: `${level.id}: ${test.goal} has a countermodel, so no proof can exist` })
      }
      // What the task holds of each lemma's shapes (../../course.js holds).
      const has = course ? holds(course, { id: level.id, task: level.task }, new Set()) : () => true
      const carried = level.lemmas ? reach(course, { id: level.id, task: level.task }).filter((p) => level.lemmas[p] && course.builder(p) !== level.id && !level.without?.includes(p)) : []
      for (const p of carried) {
        // A test that asks for a term asks for one proof in particular, not just any.
        const l = level.lemmas[p]
        const forms = l.forms ? l.forms.map((f) => f.key).filter((key) => has(p, 'form', key)) : null
        const gives = (t) => !t.term && lemmaGives(l, Object.values(t.premises ?? {}).map((x) => parse(x, { consts })), parse(t.goal, { consts }), forms)
        if (!course?.available && level.tests.every(gives)) out.push({ level: level.id, fail: true, text: `${level.id}: the lemma ${p} it carries proves it in one step` })
      }
      // A later task of a level may use what the level builds.
      const held = course && new Set([...reach(course, { id: level.id, task: level.task }), 'premise', 'goal', ...(level.task > 0 && builder.get(level.id) ? [builder.get(level.id)] : [])])
      const missing = held ? [...new Set(level.solution.nodes.filter((n) => !presetIds(level).includes(n.id)).map((n) => n.type).filter((t) => !held.has(t)))] : []
      if (missing.length) out.push({ level: level.id, fail: true, text: `${level.id}: the solution uses ${missing.join(', ')}, which the level cannot have yet` })
      // Every sentence, term or variable the reference proof picks on a card is one the card offers (choices.js).
      const offer = choicesOf(level)
      const offered = Object.fromEntries(Object.entries(offer).map(([kind, list]) => [kind, new Set(list.map((x) => (typeof x === 'string' ? x : show(x))))]))
      const sentenceChips = chipsFrom(offer.formula, { consts: level.consts ?? [] })
      for (const n of level.solution.nodes) {
        for (const [key, value] of Object.entries(n.params ?? {})) {
          const kind = SETTING_KINDS[level.partResources?.[n.type] ?? n.type]?.[key] ?? 'formula'
          if (typeof value !== 'string' || ['name', 'side', 'form'].includes(key) || !(level.parts[n.type]?.params ?? []).includes(key)) continue
          // A sentence is built from the pieces of the level's sentences; a thing is picked from those offered.
          if (kind === 'formula' || kind === 'exists') {
            const missing = missingChips(parse(value, { consts: level.consts ?? [] }), sentenceChips)
            if (missing.length) out.push({ level: level.id, fail: true, text: `${level.id}: the solution builds ${value} on ${n.type} from pieces its card does not offer: ${missing.join(', ')} (add a sentence with them to the level's sentences)` })
          } else if (!offered[kind].has(choiceKey(kind, value, level))) out.push({ level: level.id, fail: true, text: `${level.id}: the solution picks ${value} on ${n.type}, which its card does not offer (add it to the level's sentences)` })
        }
      }
      // A card of a part with forms is in a shape the task holds.
      for (const n of level.solution.nodes.filter((m) => level.lemmas?.[m.type]?.forms && m.params?.form)) {
        if (!has(n.type, 'form', n.params.form)) out.push({ level: level.id, fail: true, text: `${level.id}: the solution puts ${n.type} in the shape ${n.params.form}, which the level does not offer yet` })
      }
      const banned = level.solution.nodes.filter((n) => level.without?.includes(n.type)).map((n) => n.type)
      if (banned.length) out.push({ level: level.id, fail: true, text: `${level.id}: the solution uses ${banned.join(', ')}, which the level holds back` })
      const { reference: good, naive } = compare((work) => runProof(level, work), level)
      out.push({ level: level.id, fail: !good.pass, text: `${level.id} ${keyOf(level.title)}: solution ${good.pass ? 'PASS' : `FAIL ${good.runs.map((r) => keyOf(r.checks[0].reason)).join('; ')}`} [${good.score.steps} steps]` })
      reportNaive(out, level, naive)
      return out
    }))
  }
  return out
}
