// A course of logic levels, from a game's spec (《证明完毕》): the play order and the tree from its eras
// (../../course.js layout), each level's number and the parts it can really offer, and the lemmas its levels build
// (proof.js lemma): a level with `builds: '<type>'` makes the lemma spec.lemmas[type] a part once solved.
import { defineCourse, eraLevels, formsAt, layout, numbered, offer, reach, usable } from '../../course.js'
import { parse, replaceAtoms, show } from './formula.js'
import { vocabulary } from './fol.js'
import { parseEquation, parseS } from './schematic.js'
import { axiomPartsOf, builtParts, rulePartsOf, wireRules } from './machine.js'
import { render, say, sayTerm } from './notation.js'
import { typeOf } from './iso.js'
import { equations } from './define.js'

// Every rule a proof uses, in the boxes too; a machine card that names rules (a rule, a rewrite, simp's list) uses the
// lemmas they are shapes of.
/** The ids of the cards a level presets on its board. */
export const presetIds = (level) => (level.preset ?? []).map((item) => item.id ?? item)
const rulesIn = (circuit) => circuit.nodes.map((n) => n.type)
// How hard a level is, for its number: the steps (or gates) of its reference answer; a truth table counts as a short
// proof.
const ease = (level) => {
  const main = level.tasks?.at(-1) ?? level
  // A definition counts its rows.
  if (main.kind === 'define') return main.rows.length
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
 *   facts       { type: { name, desc, statement } } the equations the player proves on the machine board (chapter 12
 *               on): a machine level with `fact` one of them proves it, and from then on it is a rule and a rewrite rule
 *               of the rule book of numbers (machine.js MATH), in every level after that one (`proven`)
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
    // A proof term the level asks for (chapter 7) names premises, not sentences: every case asks for the same.
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
  const texts = level.kind === 'model' ? [...level.given, level.goal] : [level.target, ...(level.decoys ?? [])]
  const v = vocabulary(texts.map((t) => parse(t, { consts: names })))
  return { preds: v.preds, consts: v.consts, names: [...new Set([...names, ...v.consts])] }
}

// A machine test's tab: its input in words; a clause set by how many clauses it has.
function machineLabel(test, notation) {
  if (test.eqs) {
    const sides = test.eqs.map(parseEquation).map((e) => [e.s, e.t].map((x) => ('t' in x ? sayTerm(x, notation) : say(x, notation))))
    return { zh: sides.map(([a, b]) => `${a.zh} ≐ ${b.zh}`).join('；'), en: sides.map(([a, b]) => `${a.en} ≐ ${b.en}`).join('; ') }
  }
  // A declaration (the generator's test) goes by its sentence.
  if (test.ways) return say(parseS(test.it), notation)
  // A goal of ⊥ (the hypotheses to search) goes by its first hypothesis.
  if (test.goal) return say(parseS(test.goal === '⊥' && test.hyps?.length ? test.hyps[0] : test.goal), notation)
  return { zh: `${test.clauses.length} 条子句`, en: `${test.clauses.length} clauses` }
}

/**
 * A proof level's task, written from its schema in letters (the test cases name the letters' everyday sentences):
 * 已知「A → B」「B → C」，证明出「A → C」. Its premises go by name when the level reads proof terms (p：「A」), a goal
 * of ⊥ is the contradiction, and a level's `briefNote` (a constraint: without the box, the proof term it wants) follows.
 */
function proofBrief(schema, level, notation) {
  const consts = level.consts ?? []
  // Every connective inside another keeps its brackets: A ∨ (B ∧ C), so the task reads one way only.
  const write = (text, lang) => render(parse(text, { consts }), { ...notation, brackets: true }, lang)
  const premises = Object.entries(schema.premises ?? {})
  const given = (lang, quote) => premises.map(([name, text]) => `${level.terms ? `${name}${lang === 'zh' ? '：' : ': '}` : ''}${quote(write(text, lang))}`)
  const zhQuote = (t) => `「${t}」`
  const enQuote = (t) => `“${t}”`
  const bot = parse(schema.goal, { consts }).op === '⊥'
  const goalZh = bot ? `矛盾${notation.symbols.includes('⊥') ? ' ⊥' : ''}` : zhQuote(write(schema.goal, 'zh'))
  const goalEn = bot ? `a contradiction${notation.symbols.includes('⊥') ? ' ⊥' : ''}` : enQuote(write(schema.goal, 'en'))
  const enList = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}` : xs[0])
  const note = level.briefNote ?? { zh: '', en: '' }
  return {
    zh: `${premises.length ? `已知${given('zh', zhQuote).join('')}，证明出${goalZh}` : `不需要任何已知，证明出${goalZh}`}。${note.zh}`,
    en: `${premises.length ? `Given ${enList(given('en', enQuote))}, prove ${goalEn}` : `Prove ${goalEn} from nothing`}.${note.en ? ` ${note.en}` : ''}`,
  }
}

export function logicCourse({ eras, levels, words = null, lemmas = {}, facts = {}, gates = {}, machines = [], primitives, concept = {}, replaces = {}, local = [], revisions = {} }) {
  const built = (p) => Boolean(lemmas[p] || gates[p] || machines.includes(p))
  // One name, one part: a lemma, a gate and a machine part sharing a type would unlock and show as each other.
  const clash = machines.filter((p) => lemmas[p] || gates[p]).concat(Object.keys(lemmas).filter((p) => gates[p]))
  if (clash.length) throw new Error(`built parts share a type: ${clash.join(', ')}`)
  const plan = layout(eras)
  const given = new Map(levels.map((l) => [l.id, l]))
  // The types and functions the player declares (chapter 12): a declaration board with `datatype` declares a type, a
  // definition board (`define`) a function; a later level names them (`types`, `defs`) and gets their text.
  const declared = { types: new Map(), defs: new Map() }
  for (const l of levels) {
    for (const [task, one] of (l.tasks ?? [l]).entries()) {
      const at = { level: l.id, task: l.tasks ? task : 0 }
      if (one.datatype) declared.types.set(one.datatype.type, { text: typeOf({ ...l, ...one }), ...at })
      if (one.kind === 'define') declared.defs.set(one.fn, { eqs: equations(one, one.solution), ...at })
    }
  }
  const lookUp = (table, name, what, id) => {
    if (!table.has(name)) throw new Error(`level ${id} names ${what} ${name}, which no level declares`)
    return table.get(name)
  }
  // A level's own types and definitions, by name, and the equations it states itself (`stated`).
  const declarations = (l, id) => ({
    named: { types: l.types ?? [], defs: l.defs ?? [] },
    ...(l.types ? { datatypes: Object.fromEntries(l.types.map((t) => [t, lookUp(declared.types, t, 'the type', id).text])) } : {}),
    ...(l.defs || l.stated ? { defs: [...(l.defs ?? []).flatMap((n) => lookUp(declared.defs, n, 'the function', id).eqs), ...(l.stated ?? [])] } : {}),
  })
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
      const expanded = l.cases ? expand(l, notation) : {}
      // A machine board's axioms are parts the level brings with it (machine.js axiomPartsOf).
      return { ...l, ...declarations(l, id), ...(!l.brief && expanded.schema ? { brief: proofBrief(expanded.schema, l, notation) } : {}), adds: [...(l.adds ?? []), ...(l.kind === 'machine' ? axiomPartsOf(l) : [])], ...(WORLD_KINDS.includes(l.kind) ? { vocab: vocabOf(l) } : {}), ...expanded, ...(l.kind === 'machine' ? { tests: l.tests.map((t) => ({ label: machineLabel(t, notation), ...t })) } : {}), chapter: eraOf.get(id), requires: plan.requires.get(id) ?? [], unlocks: level.builds ? [`lemma:${level.builds}`] : [], lemmas, facts, gates, revisions, notation }
    }
    if (!level.tasks) return read(level)
    // What the level builds or proves comes of its last task, the level itself.
    // The level's pass text is the level's, shown when its last task is done: a task has only its own.
    // A task's intro is its own (the level's is the level's).
    const { tasks, builds, fact, after, intro, ...base } = level
    const last = (index) => index === tasks.length - 1
    const all = tasks.map((task, index) => ({ ...read({ ...base, ...(last(index) && builds ? { builds } : {}), ...(last(index) && fact ? { fact } : {}), ...task }), task: index }))
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
    // Topics sharing a code number on from each other, across chapters too (a topic split into branches: X1, X2, then
    // X3 … on both; the elimination rule generator's levels in whatever chapter: E1 … E4).
    ...(era.topics ?? []).flatMap((t, i, all) => {
      const before = [...eras.slice(0, e).flatMap((x) => x.topics ?? []), ...all.slice(0, i)].filter((u) => u.code === t.code)
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
  // A type or function is named only where its declaration comes before: a level after the one that declares it, or a
  // later task of that level.
  for (const level of LEVELS) {
    for (const one of level.tasks ?? [level]) {
      const before = (d) => (d.level === level.id ? d.task < (one.task ?? 0) : course.before(d.level, level.id))
      for (const t of one.named.types) if (!before(declared.types.get(t))) throw new Error(`level ${level.id} names the type ${t} before it is declared`)
      for (const n of one.named.defs) if (!before(declared.defs.get(n))) throw new Error(`level ${level.id} names the function ${n} before it is defined`)
    }
  }
  // A machine level's (and a script's) rule book has what the level can hold (machine.js ruleBookOf): the kernel's
  // rules opened by chapter, the lemmas built before it, each in the shapes it has gained by then. A task after the first may use
  // what its level proves already (a law proved on the proof board, then put to work), in every shape it proves.
  for (const level of LEVELS.filter((l) => [l, ...(l.tasks ?? [])].some((t) => t.kind === 'machine' || t.kind === 'script'))) {
    const holds = reach(course, { id: level.id })
    // The equations proved before it (by the levels it comes after), and in a later task its own.
    const proven = Object.keys(facts).filter((type) => LEVELS.some((l) => [l, ...(l.tasks ?? [])].some((t) => t.fact === type) && course.before(l.id, level.id)))
    for (const one of [level, ...(level.tasks ?? [])]) {
      const later = one.task > 0
      // A task has what the tasks before it in its level proved.
      const before = (level.tasks ?? []).filter((t) => t.task < one.task && t.fact).map((t) => t.fact)
      one.holds = later && level.builds ? [...holds, level.builds] : holds
      one.proven = [...new Set([...proven, ...before, ...(later && level.fact ? [level.fact] : [])])]
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
  // The machine parts the player builds run the boards that built them (machine.js builtParts), on every machine
  // board and in every script.
  // A part built by several levels is a chain of upgrades (games/DESIGN.md): a level holds it as the levels of the chain
  // up to it built it, and an upgrade starts from it as the levels before it left it (`upgrades`, the part's state).
  const builders = LEVELS.flatMap((l) => [l, ...(l.tasks ?? [])]).filter((t) => t.kind === 'machine' && machines.includes(t.builds))
    .sort((a, b) => (course.before(a.id, b.id) ? -1 : course.before(b.id, a.id) ? 1 : 0))
  const chains = Map.groupBy(builders, (b) => b.builds)
  const upTo = (id, strict) => [...chains.values()].map((chain) => {
    const some = chain.filter((b) => (b.id === id ? !strict : course.before(b.id, id)))
    return strict ? some : some.length ? some : chain
  }).filter((chain) => chain.length)
  const runs = new Map()
  const running = (chainsHere) => {
    const key = chainsHere.map((c) => c.map((b) => b.id).join()).join('|')
    if (!runs.has(key)) runs.set(key, builtParts(chainsHere))
    return runs.get(key)
  }
  for (const level of LEVELS) {
    for (const one of [level, ...(level.tasks ?? [])]) {
      one.built = running(upTo(level.id, false))
      const before = one.kind === 'machine' && one.builds && upTo(level.id, true).find((c) => c[0].builds === one.builds)
      if (before) one.upgrades = running([before])[one.builds]
    }
  }
  // A level may hold parts back (`without`): what the course carries into it, less those (a proof without boxes).
  // Nor does a level hold the part it builds (an upgrade works on the part's own board), past its first task.
  const held = (level) => [...(byId.get(level.id)?.without ?? []), ...(byId.get(level.id)?.builds && !(level.task > 0) ? [byId.get(level.id).builds] : [])]
  // A task that names its parts holds those the player has: a primitive, or a built part once its level is solved.
  // The task after the one that proves a level's part may use it already (a law proved, then put to work).
  // On a machine board its rule parts come with them.
  const named = (level, flags) => [...level.parts.filter((p) => !built(p) || flags.has(`lemma:${p}`) || (level.task > 0 && byId.get(level.id).builds === p)), ...(level.kind === 'machine' ? [...rulePartsOf(level).keys()] : [])]
  // What a task after the first holds of its own level's part (the law it has just proved), on top of the course's.
  const proved = (level) => (level.task > 0 && byId.get(level.id).builds ? [byId.get(level.id).builds] : [])
  const usableIn = (level, flags) => (level.parts ? named(level, flags) : [...usable(course, { id: level.id }, flags), ...proved(level)].filter((p) => !held(level).includes(p)))
  const offerIn = (level, flags) => {
    if (level.parts) return { shown: named(level, flags), folded: [] }
    const { shown, folded, ...rest } = offer(course, { id: level.id }, flags, proved(level))
    return { ...rest, shown: shown.filter((p) => !held(level).includes(p)), folded: folded.filter((p) => !held(level).includes(p)) }
  }
  return { LEVELS, CHAPTERS, LABELS, course, usableIn, offerIn, machines, revisions }
}
