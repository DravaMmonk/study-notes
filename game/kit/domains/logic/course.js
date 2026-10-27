// A course of logic levels, from a game's spec (《证明完毕》): the play order and the tree from its eras
// (../../course.js layout), each level's number and the parts it can really offer, and the lemmas its levels build
// (proof.js lemma): a level with `builds: '<type>'` makes the lemma spec.lemmas[type] a part once solved.
import { defineCourse, eraLevels, formsAt, layout, numbered, offer, reach, usable } from '../../course.js'
import { parse, replaceAtoms, show } from './formula.js'
import { vocabulary } from './fol.js'
import { parseEquation, parseS } from './schematic.js'
import { axiomPartsOf, rulePartsOf, wireRules } from './machine.js'
import { say, sayTerm } from './notation.js'

// Every rule a proof uses, in the boxes too; a machine card that names rules (a rule, a rewrite, simp's list) uses the
// lemmas they are shapes of.
/** The ids of the cards a level presets on its board. */
export const presetIds = (level) => (level.preset ?? []).map((item) => item.id ?? item)
const rulesIn = (circuit) => circuit.nodes.map((n) => n.type)
// How hard a level is, for its number: the steps (or gates) of its reference answer; a truth table counts as a short
// proof.
const ease = (level) => {
  const main = level.tasks?.at(-1) ?? level
  return main.solution ? main.solution.nodes.filter((n) => !['premise', 'goal', 'letter', 'out'].includes(n.type)).length : 2
}

/**
 * spec: {
 *   eras        the course's eras, one proof machine each (games/DESIGN.md 2), each with its map chapter
 *               { title, desc }; a topic has a `code` for its numbers
 *   levels      every level, in any order; a level may introduce connective symbols (`symbols`), see notation.js
 *   words       { letter: { zh, en } } the everyday sentence each letter reads as, in every level
 *
 * A proof level is a schema: its test (`tests: [{ premises, goal }]`) is written in letters, and each test case
 * (`cases`) fills the letters in with sentences ({ A: 'Rain', B: 'Wet' }, a
 * compound sentence too: { A: 'Rain ∧ Wind' }). Every case becomes a test of its own, with the case as `subst` and its
 * sentences as its label, so one proof is checked on all of them; a last test keeps the bare letters, the pattern
 * itself. A level opens on its first case, the one its task is written in.
 *   lemmas      { type: { name, desc, statement, premises?, metas } } the parts the player proves
 *   facts       { type: { name, desc, statement } } the equations the player proves on the machine board (chapter 11
 *               on), each a rule and a rewrite rule from then on; a machine level with `builds` one of them proves it
 *   gates       { type: { name, desc, ports, f } } the gates the player builds on a truth circuit (gates.js)
 *   revisions   { type: [{ at | by: level id, desc?, forms? }] } a part's description as it grows along the course,
 *               and the shapes (forms) an upgrade earned at `by` adds to its card
 *   machines    [type] the machine-board parts the player builds (machine.js, named in ui/catalog.js MACHINE_TEXT): a
 *               level with `builds` one of them unlocks it, its built-in implementation checked by that level's tests
 *   replaces    { part: [part] } a part that takes the place of others: from its level on, those leave the tray
 *   local       [part] parts that stay in the levels that bring them, never unlocked or carried on (../../course.js)
 *   primitives  the rules the course starts from
 *   concept     { part: idea } parts that are one new idea together
 * }
 * A level may be several tasks in order (`tasks: [{ kind, step, brief, … }]`, ../../shell/GameShell.jsx): each is the
 * level with what the task changes, read like a level of its own, and the last is the level itself (its reference
 * answer is the level's). A task in another kind than the level's parts names the parts it holds (`parts: [part]`, the
 * ones the player has), as a truth circuit that translates a puzzle before the proof does.
 * A level may start its board with part of its reference answer in place (`preset: [id | { id, fixed }]`, the
 * answer's ids): those cards, and the answer's wires between them and the board's own inputs and outputs, are locked
 * (../../circuit/model.js): moved, never deleted or rewired; `fixed` fixes a card's settings too (true, or [key]).
 * presetIds(level) lists the ids.
 * A level may also hold back parts it would carry (`without: [part]`): a proof that must do without the box; and a
 * level that shows a new part's use by itself says why its use is abstract (`showcase: 'reason'`, ../../course.js).
 * A level names only the parts it brings in (`adds`): every part met or built before it in its era carries into it,
 * and across eras what each era keeps (../../course.js); and what it
 * folds away (`fold`); see ../../course.js reach and offer.
 * Returns { LEVELS, CHAPTERS, LABELS, course, usableIn(level, flags), offerIn(level, flags) }.
 */
// A proof level's tests from its schema and cases (see logicCourse), and the schema kept for the cards' choices.
function expand(level, notation) {
  const schema = level.tests[0]
  const test = (c) => {
    const subst = Object.fromEntries(Object.entries(c).map(([letter, text]) => [letter, parse(text)]))
    const fill = (text) => show(replaceAtoms(parse(text), subst))
    const parts = Object.values(subst).map((f) => say(f, notation))
    // A test with nothing to fill in (a level with no letters) is the level's one test.
    const label = parts.length ? { zh: parts.map((p) => p.zh).join(' · '), en: parts.map((p) => p.en).join(' · ') } : { zh: '这一组', en: 'This one' }
    // A proof term the level asks for (chapter 6) names premises, not sentences: every case asks for the same.
    return { premises: Object.fromEntries(Object.entries(schema.premises ?? {}).map(([name, text]) => [name, fill(text)])), goal: fill(schema.goal), ...(schema.term ? { term: schema.term } : {}), subst, label }
  }
  // Last of the tests: the schema in its own letters (A := A …), the pattern bare.
  const letters = Object.fromEntries(Object.keys(level.cases[0] ?? {}).map((l) => [l, l]))
  return { schema, tests: [...level.cases.map(test), test(letters)] }
}

// A first-order level's vocabulary (fol.js): the predicates and names its sentences use, and any it adds as decoys.
const WORLD_KINDS = ['translate', 'query', 'model']
// `names` are every name the level reads (level.consts), so a name typed that the level does not use still parses.
function vocabOf(level) {
  const names = level.consts ?? []
  const texts = level.kind === 'model' ? level.want.map((w) => w.f) : [level.target, ...(level.decoys ?? [])]
  const v = vocabulary(texts.map((t) => parse(t, { consts: names })))
  return { preds: v.preds, consts: v.consts, names: [...new Set([...names, ...v.consts])] }
}

// A machine test's tab: its input in words; a clause set by how many clauses it has.
function machineLabel(test, notation) {
  if (test.eqs) {
    const sides = test.eqs.map(parseEquation).map((e) => [e.s, e.t].map((x) => ('t' in x ? sayTerm(x, notation) : say(x, notation))))
    return { zh: sides.map(([a, b]) => `${a.zh} ≐ ${b.zh}`).join('；'), en: sides.map(([a, b]) => `${a.en} ≐ ${b.en}`).join('; ') }
  }
  // A goal of ⊥ (the hypotheses to search) goes by its first hypothesis.
  if (test.goal) return say(parseS(test.goal === '⊥' && test.hyps?.length ? test.hyps[0] : test.goal), notation)
  return { zh: `${test.clauses.length} 条子句`, en: `${test.clauses.length} clauses` }
}

export function logicCourse({ eras, levels, words = null, lemmas = {}, facts = {}, gates = {}, machines = [], primitives, concept = {}, replaces = {}, local = [], revisions = {} }) {
  const built = (p) => Boolean(lemmas[p] || facts[p] || gates[p] || machines.includes(p))
  // One name, one part: a lemma, an equation, a gate and a machine part sharing a type would unlock and show as each other.
  const clash = machines.filter((p) => lemmas[p] || gates[p] || facts[p]).concat(Object.keys(lemmas).filter((p) => gates[p] || facts[p]))
  if (clash.length) throw new Error(`built parts share a type: ${clash.join(', ')}`)
  const plan = layout(eras)
  const given = new Map(levels.map((l) => [l.id, l]))
  const eraOf = new Map(eras.flatMap((era, e) => eraLevels(era).map((id) => [id, e])))
  // A level writes formulas in its own words (notation.js) and with every symbol introduced by then: the symbols of
  // the levels before it in play order, and its own.
  let known = []
  const LEVELS = plan.order.map((id) => {
    const level = given.get(id)
    if (!level) throw new Error(`an era names a level that does not exist: ${id}`)
    known = [...known, ...(level.symbols ?? [])]
    // A task may have words of its own (numbers written as S n …).
    const read = (l) => {
      const notation = { words: l.words ?? level.words ?? words, symbols: known }
      // A machine board's axioms are parts the level brings with it (machine.js axiomPartsOf).
      return { ...l, adds: [...(l.adds ?? []), ...(l.kind === 'machine' ? axiomPartsOf(l) : [])], ...(WORLD_KINDS.includes(l.kind) ? { vocab: vocabOf(l) } : {}), ...(l.cases ? expand(l, notation) : {}), ...(l.kind === 'machine' ? { tests: l.tests.map((t) => ({ label: machineLabel(t, notation), ...t })) } : {}), chapter: eraOf.get(id), requires: plan.requires.get(id) ?? [], unlocks: level.builds ? [`lemma:${level.builds}`] : [], lemmas, facts, gates, revisions, notation }
    }
    if (!level.tasks) return read(level)
    // What the level builds comes of its last task, the level itself.
    // The level's pass text is the level's, shown when its last task is done: a task has only its own.
    // A task's intro is its own (the level's is the level's).
    const { tasks, builds, after, intro, ...base } = level
    const all = tasks.map((task, index) => ({ ...read({ ...base, ...(index === tasks.length - 1 && builds ? { builds } : {}), ...task }), task: index }))
    // A part the level or any task brings in is new to the level, whichever task it is.
    return { ...all.at(-1), intro, after, adds: [...new Set([...(base.adds ?? []), ...all.flatMap((t) => t.adds)])], tasks: all }
  })
  for (const l of levels) if (!eraOf.has(l.id)) throw new Error(`level ${l.id} is in no era`)
  const byId = new Map(LEVELS.map((l) => [l.id, l]))
  for (const [type, list] of Object.entries(revisions)) for (const r of list) if (!byId.has(r.at ?? r.by)) throw new Error(`the revision of ${type} names a level that does not exist: ${r.at ?? r.by}`)
  // A level's number: on an era's main path the era and its place by difficulty ('1-4', numbered), in a topic its
  // code and place ('D2'), C1 …
  // for the era's challenges.
  const LABELS = new Map(eras.flatMap((era, e) => [
    ...numbered([...era.foundation, ...(era.practice ?? [])], plan.requires, (id) => ease(given.get(id))).map((id, k) => [id, `${e}-${k + 1}`]),
    // Topics sharing a code number on from each other (a topic split into branches: X1, X2, then X3 … on both).
    ...(era.topics ?? []).flatMap((t, i, all) => {
      const before = all.slice(0, i).filter((u) => u.code === t.code)
      return t.levels.map((id, k) => [id, `${t.code}${before.reduce((n, u) => n + u.levels.length, 0) + k + 1}`])
    }),
    ...(era.challenges ?? []).map((c, k) => [c.level, `C${e}.${k + 1}`]),
  ]))
  const CHAPTERS = eras.map((era) => ({ ...era.chapter, track: plan.tracks.get(era.id) }))
  // Every axiom part stays in the levels that state it, and is no new idea: it is the level's own given.
  const axioms = [...new Set(LEVELS.flatMap((l) => [l, ...(l.tasks ?? [])]).filter((t) => t.kind === 'machine').flatMap(axiomPartsOf))]
  const course = defineCourse({
    levels: LEVELS.map((l) => ({ id: l.id, unlocks: l.unlocks })),
    eras,
    primitives: [...primitives, ...axioms],
    concept: (p) => concept[p] ?? (axioms.includes(p) ? null : p),
    adds: (l) => byId.get(l.id).adds,
    needs: (p) => (built(p) ? `lemma:${p}` : null),
    replaces: (p) => replaces[p] ?? [],
    local: (p) => local.includes(p) || axioms.includes(p),
    builds: (l) => (byId.get(l.id).builds ? [byId.get(l.id).builds] : []),
    machine: (l) => eras[eraOf.get(l.id)].machine ?? null,
    naive: (l) => Boolean(byId.get(l.id).naive || byId.get(l.id).tasks?.some((task) => task.naive)),
    // Every task's answer counts: a part the level's first task uses is used; what its board starts with does not.
    needed: (l) => {
      const answers = (byId.get(l.id).tasks ?? [byId.get(l.id)]).filter((t) => t.solution?.nodes).map((t) => ({ ...t.solution, nodes: t.solution.nodes.filter((n) => !presetIds(t).includes(n.id)) }))
      return answers.length ? answers.flatMap(rulesIn) : null
    },
    folds: (l) => byId.get(l.id).fold ?? [],
    showcase: (l) => byId.get(l.id).showcase ?? null,
    abstraction: true,
  })
  // A machine level's (and a script's) rule book has what the level can hold (machine.js ruleBookOf): the kernel's
  // rules opened by chapter, the lemmas built before it, each in the shapes it has gained by then. A task after the first may use
  // what its level proves already (a law proved on the proof board, then put to work), in every shape it proves.
  for (const level of LEVELS.filter((l) => [l, ...(l.tasks ?? [])].some((t) => t.kind === 'machine' || t.kind === 'script'))) {
    const holds = reach(course, { id: level.id })
    for (const one of [level, ...(level.tasks ?? [])]) {
      const later = one.task > 0
      one.holds = later && level.builds ? [...holds, level.builds] : holds
      one.forms = Object.fromEntries(Object.entries(lemmas).filter(([, l]) => l.forms).map(([type, l]) => [type, [
        ...formsAt(course, l.forms[0].key, revisions[type], level.id),
        ...(later ? (revisions[type] ?? []).filter((r) => r.by === level.id).flatMap((r) => r.forms ?? []) : []),
      ]]))
    }
  }
  // Reference answers name each card's rules on it, short (machine.js wireRules): put on the board as rule parts, now
  // that each level's rule book is known.
  for (const one of LEVELS.flatMap((l) => [l, ...(l.tasks ?? [])]).filter((t) => t.kind === 'machine')) {
    one.solution = wireRules(one.solution, one)
    one.naive = wireRules(one.naive, one)
  }
  // A level may hold parts back (`without`): what the course carries into it, less those (a proof without boxes).
  const held = (level) => byId.get(level.id)?.without ?? []
  // A task that names its parts holds those the player has: a primitive, or a built part once its level is solved.
  // The task after the one that proves a level's part may use it already (a law proved, then put to work).
  // On a machine board its rule parts come with them.
  const named = (level, flags) => [...level.parts.filter((p) => !built(p) || flags.has(`lemma:${p}`) || (level.task > 0 && byId.get(level.id).builds === p)), ...(level.kind === 'machine' ? [...rulePartsOf(level).keys()] : [])]
  const usableIn = (level, flags) => (level.parts ? named(level, flags) : usable(course, { id: level.id }, flags).filter((p) => !held(level).includes(p)))
  const offerIn = (level, flags) => {
    if (level.parts) return { shown: named(level, flags), folded: [] }
    const { shown, folded, ...rest } = offer(course, { id: level.id }, flags)
    return { ...rest, shown: shown.filter((p) => !held(level).includes(p)), folded: folded.filter((p) => !held(level).includes(p)) }
  }
  return { LEVELS, CHAPTERS, LABELS, course, usableIn, offerIn, machines, revisions }
}
