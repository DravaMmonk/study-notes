// A logic game's course, from its course configuration and content package ( vocabulary.js says what
// may be in it): the play order and the tree from its eras (../../course.js layout), each level's number and the parts it
// can really offer, its reference and naive answers as the boards they write (../../engine/board-cards.js), and its built parts
// (parts.json `inside`, readBuilt): a lemma proved on the proof board, a gate built on a truth circuit (gates.js
// builtGates), a machine part (machine.js builtMachine), an equation proved; every one runs the player's work (a lemma,
// the proof of each of its shapes).
import { symbolFor } from './symbols.js'
import { playFor } from '../../engine/plays.js'
import { plays } from './plays.js'
import { builtParts, cardOf, partReferences, publications, settingsOf } from '../../../../packages/circuit/core/index.js'
import { eraLevels, levelLabels } from '../../course.js'
import { holds, met, offer } from '../../../../packages/circuit/core/index.js'
import { courseLayout } from '../../engine/course-dependencies.js'
import { taskLevels } from '../../engine/tasks.js'

import { keyOf } from '../../shell/i18n.js'
import { readWorks } from '../../../../packages/circuit/core/index.js'
import { parse, replaceAtoms, show } from './formula.js'
import { claimSentences, vocabulary } from './fol.js'
import { parseEquation, parseS } from './schematic.js'
import { MACHINE_BOARD, RULE_DEFINITION, axiomPartsOf, builtMachine, inputsOfLevel, rulePartsOf, ruleParts, startMachine } from './machine.js'
import { operationsOf } from '../../../../packages/circuit/core/index.js'
import { compileParts } from '../../../../packages/circuit/core/index.js'
import { presetCardIds, presetOf, withPreset } from '../../../../packages/circuit/core/index.js'
import { T } from '../../shell/i18n.js'
import { render, say, sayTerm } from './notation.js'
import { typeOf } from './iso.js'
import { equations } from './define.js'
import { lemmaReference, PROOF_BOARD } from './proof.js'
import { OPS, partsOf } from './ops.js'
import { primitivesOnly } from '../../../../packages/circuit/core/index.js'
import { boardView, fitsCircuit } from '../../../../packages/circuit/core/index.js'
import { keptBoards } from '../../../../packages/circuit/core/index.js'
import { workView } from '../../../../packages/circuit/core/index.js'
import { GATE_BOARD, builtGates, gateCourse, gateTests } from './gates.js'
import { lettersOf } from './truth.js'

/** A machine level's preset (`preset`: ids of its reference answer), locked on its board (../../circuit/presets.js). */
export const presetFor = (task) => (task.preset ? presetOf(task.solution, task.preset, new Set(startMachine(task).nodes.map((n) => n.id))) : null)
/** The ids of the cards a level presets on its board. */
export const presetIds = (level) => level.preset && level.solution ? [...presetCardIds(level.solution, level.preset)] : level.preset ?? []
const rulesIn = (circuit) => circuit.nodes.map((n) => n.type)

// A lemma's schema written as its proof task writes it: a letter of the lemma applied to the variable a quantifier binds
// (¬∃x. P(x)) is the letter itself, the quantifier's body (¬∃x. P).
const asSchema = (text, metas) => metas.reduce((t, m) => t.replace(new RegExp(`\\b${m}\\(([a-z]\\w*)\\)`, 'g'), m), text)

/**
 * A game's built parts (parts.json, ../../engine/parts.js builtParts) read as the course's tables. Its family says
 * what a part is: a lemma (`lemma`: each shape the premises and goal of the proof task it refers to, its letters its
 * tree settings, the first reference its first shape and the rest, by `form`, shapes an upgrade adds), a gate (`gate`:
 * a port for each letter of its truth circuit, in order, named a, b, c…), a machine part (`built`) or an equation
 * proved (`rule`: its statement its task's goal; the task may say how it enters the rule book, `rule`). The level of a part's first reference (of
 * every one, for a chain of upgrades) builds it; a task an equation refers to proves it. Returns { lemmas, facts,
 * gates, machines, parts, revisions, builds: level → type, proves: task → type, lemmaRefs: [{ type, form, task }] }.
 */
function readBuilt(content) {
  const raw = new Map(content.levels.flatMap((L) => L.tasks.map((task) => [task.id, { level: L, task }])))
  const out = { lemmas: {}, facts: {}, gates: {}, machines: [], parts: {}, publishers: {}, references: new Map(), builds: new Map(), proves: new Map(), lemmaRefs: [], machineRefs: [] }
  const parts = builtParts(content.partDefs)
  const all = publications(content.levels, parts)
  for (const [type, part] of Object.entries(parts)) {
    const refs = all.filter((ref) => ref.type === type).map((ref) => ({ ...ref, ...(raw.get(ref.task) ?? {}) }))
    out.parts[type] = part
    out.publishers[type] = refs.map((ref) => ref.task?.id).filter(Boolean)
    for (const ref of refs) if (ref.task) out.references.set(ref.task.id, ref.reference)
    const build = (level) => {
      if (out.builds.has(level.id) && out.builds.get(level.id) !== type) throw new Error(`level ${level.id} builds both ${out.builds.get(level.id)} and ${type}`)
      out.builds.set(level.id, type)
    }
    // An equation is proved, not built; a shape after the first is one more form of the part, opened where it is proved.
    if (part.family !== 'logic:family-rule') for (const [k, ref] of refs.entries()) if (ref.level && (!ref.form || k === 0)) build(ref.level)
    const { name, desc } = part
    if (part.family === 'logic:family-lemma') {
      const trees = settingsOf(part).filter((x) => x.control === 'tree')
      const metas = trees.map((x) => x.key)
      const labelled = trees.filter((x) => x.label)
      const shapes = refs.map((ref) => {
        const schema = ref.reference.tests[0]
        const premises = Object.values(schema.premises ?? {}).map((text) => asSchema(text, metas))
        return { key: ref.form ?? '', label: ref.label, statement: asSchema(schema.goal, metas), ...(premises.length ? { premises } : {}) }
      })
      out.lemmas[type] = {
        name, desc, metas, ports: shapes[0].premises ?? [],
        ...(labelled.length ? { params: Object.fromEntries(labelled.map((x) => [x.key, x.label])) } : {}),
        ...(refs[0].form ? { forms: shapes } : { statement: shapes[0].statement, ...(shapes[0].premises ? { premises: shapes[0].premises } : {}) }),
        ...(cardOf(part) ? { card: cardOf(part) } : {}),
      }
      out.lemmaRefs.push(...refs.map((ref) => ({ type, form: ref.form ?? '', task: ref.task?.id, reference: ref.reference })))
    } else if (part.family === 'logic:family-gate') {
      // A gate's ports stand for its truth circuit's letters in order, named a, b, c…: the level's sentences are its
      // own, not the gate's.
      out.gates[type] = { name, desc, ports: lettersOf([parse(refs[0].reference.target)]).map((_, k) => String.fromCharCode(97 + k)) }
    }
    else if (part.family === 'logic:family-built') {
      out.machines.push(type)
      out.machineRefs.push(...refs.map((ref) => ({ type, variant: ref.variant, task: ref.task?.id, reference: ref.reference })))
    }
    else if (part.family === 'logic:family-rule') {
      const { task, reference } = refs[0]
      out.facts[type] = { name, desc, statement: reference.tests[0].goal, ...(reference.rule ? { rule: reference.rule } : {}) }
      if (task) out.proves.set(task.id, type)
    } else throw new Error(`parts.json's ${type} is a built part of family ${part.family}: a lemma, a gate, a built machine part or a rule (an equation)`)
  }
  return out
}

/**
 * content (../../engine/content.js assemble; the fields are vocabulary.js GAME): {
 *   eras        the course's eras, one proof machine each (games/DESIGN.md 2), each with its map chapter
 *               { title, question }; a topic has a `code` for its numbers
 *   levels      every level; a level may introduce syntax parts (`adds`), see notation.js
 *   words       the word sets (wordSets, by name, merged in order) every level reads its letters, predicates and
 *               names in, unless it names its own (`words`): { letter: { zh, en } } the everyday sentence each reads as
 *
 * A proof level is a schema: its test (`tests: [{ premises, goal }]`) is written in letters, and each test case
 * (`cases`) fills the letters in with sentences ({ A: 'Rain', B: 'Wet' }, a
 * compound sentence too: { A: 'Rain ∧ Wind' }). Every case becomes a test of its own, with the case as `subst` and its
 * sentences as its label, so one proof is checked on all of them; a last test keeps the bare letters, the pattern
 * itself. A level opens on its first case, the one its task is written in.
 *   partDefs    parts.json: the primitive gates, the proof rules and the machine board's parts
 *               (../../engine/parts/define.js) over the domain's engine resources (ops.js), and the built parts
 *               (readBuilt): the lemmas the player proves, the gates built on a truth circuit (gates.js), the machine
 *               parts built on the machine board, and the equations proved (chapter 12 on), each from then on a rule
 *               and a rewrite rule of the rule book of numbers (machine.js MATH) in every level after it (`proven`); a
 *               part's description grows along the course (`revisions`), and an upgrade adds shapes to its card
 *   local       [part] parts that stay in the levels that bring them, never unlocked or carried on (../../course.js)
 *   trays       { tray: [part] } the trays (../../course.js): one per kind of circuit board (the truth circuit, the
 *               proof board, the machine board), and one for a scene that plays with its own parts alone
 *   primitives  the rules the course starts from
 *   concept     { part: idea } parts that are one new idea together
 * }
 * A level is its tasks in order (`tasks: [{ id, kind, step?, brief, … }]`, ../../engine/tasks.js, one for most
 * levels): each is the level with what the task says over it, read like a level of its own (readTasks); the level
 * says once its title, introduction, pass text and place in the course, and what its tasks share. A task on a circuit
 * board plays with a tray (`tray`, the level's or its own: a truth circuit that translates a puzzle before the proof
 * does).
 * A reference or naive answer on a circuit board (a proof, a machine, a truth circuit) is blueprint text; a
 * declaration's is its rules as the rule table writes them (ruleLines.js lines), and its someone-else's declarations
 * (`boards`) too.
 * A level may start its board with part of its reference answer in place (`preset: [id]`, the answer's ids): those
 * cards and their enclosing frames are locked, as are the reference wires joining them and the board's own ports
 * (../../circuit/presets.js). presetIds(level) lists all preset cards.
 * A level may also hold back parts it would carry (`without: [part]`): a proof that must do without the box; and a
 * A level names only the parts it brings in (`adds`): every part met or built before it carries into it, as far as
 * its tray lists it; see ../../course.js reach and offer. What a task holds is the kernel's rule (../../course.js
 * holds), and the domain says only what is its own: a task withholds its `without`; a machine board is given the rule
 * parts of its rule book (machine.js ruleParts), which holds every rule met whatever the tray; and a lemma's
 * shapes after its first are values of its `form` that the upgrade proving them opens (`revisions`: by, forms).
 * Returns { LEVELS, CHAPTERS, LABELS, course, offerIn(task, flags), holdsIn(task, flags), machines, lemmas,
 * facts, parts: the built parts, texts: what a player reads of them, proofs,
 * gates: the gates built, defs and defaultsOf: the parts parts.json defines and a new node's settings, truthCircuits and proofBoards: the truth circuits and
 * the proofs as the kernel's circuit screen reads a course, wrong: what reading the content found wrong, … }: each of LEVELS { id, title, …, tasks }, its
 * tasks as read (`task` the index, `taskId` the id). Reading builds all of it anew: the content is never written to.
 */
// A proof level's tests from its schema and cases (see logicWorks), and the schema kept for the cards' choices.
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
  const concrete = level.cases.length ? level.cases.map(test) : [test({})]
  const symbolic = { ...test(letters), symbolic: true, label: { zh: '字母', en: 'Letters' } }
  symbolic.caseBrief = proofBrief(symbolic, level, { ...notation, words: level.symbolicWords ?? null, propertyWords: false })
  return { schema, tests: [...concrete, symbolic] }
}

// A first-order level's vocabulary (fol.js): the predicates and names its sentences use, and any it adds as decoys.
const WORLD_KINDS = ['logic:translate', 'logic:query', 'logic:model']
// `names` are every name the level reads (level.consts), so a name typed that the level does not use still parses.
function vocabOf(level) {
  const names = level.consts ?? []
  const texts = level.kind === 'logic:model' ? claimSentences(level) : [level.target, ...(level.decoys ?? [])]
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
  const note = level.briefNote ?? (schema.term ? { zh: `证明项须为 ${schema.term}。`, en: `Its proof term must be ${schema.term}.` } : level.script ? { zh: '按照下方脚本连接证明。', en: 'Wire the proof shown in the script below.' } : { zh: '', en: '' })
  return {
    zh: `${premises.length ? `已知${given('zh', zhQuote).join('')}，证明出${goalZh}` : `不需要任何已知，证明出${goalZh}`}。${note.zh}`,
    en: `${premises.length ? `Given ${enList(given('en', enQuote))}, prove ${goalEn}` : `Prove ${goalEn} from nothing`}.${note.en ? ` ${note.en}` : ''}`,
  }
}

/** Words: the word sets named (by name, or written out), merged in order. */
const wordsOf = (list, sets) => Object.assign({}, ...list.map((w) => (typeof w === 'string' ? sets[w] : w)))

/**
 * A level's tasks as the course reads each (../../engine/tasks.js taskLevels): the level under the task, but for its
 * introduction and pass text, which are the level's own; what the level builds or proves comes of its last task. Each
 * keeps its name (`step`) and reads in its words.
 */
function readTasks(level, wordSets, positions) {
  const { builds, fact, intro: _intro, after: _after, ...base } = level
  return taskLevels(base, positions).map((t, k, all) => {
    const last = k === all.length - 1
    const one = { ...(last && builds ? { builds } : {}), ...(last && fact ? { fact } : {}), ...t, ...(level.tasks[k].step ? { step: level.tasks[k].step } : {}) }
    return { ...one, ...(one.words ? { words: wordsOf(one.words, wordSets) } : {}) }
  })
}

export const logicWorks = (content) => readWorks(content, prepareLogicWorks)

export function* prepareLogicWorks(content) {
  const circuitFor = (task) => ({ 'logic:proof': proofBoards, 'logic:machine': machineBoards, 'logic:gates': truthCircuits })[task?.kind]
  // The boards the player passed the building levels with, in this course.
  const kept = keptBoards((key, board) => {
    const task = taskById.get(key)
    const boards = circuitFor(task)
    if (!boards) return false
    const circuit = boards.forTask(task)
    return fitsCircuit(board, task, workView(board, circuit))
  })
  const { eras } = content
  const wordSets = content.registries?.wordset ?? {}
  const wrong = []
  const symbols = Object.fromEntries(Object.entries(content.registries?.symbol ?? {}).map(([type, symbol]) => [type, { ...symbol, type }]))
  const marks = new Set()
  for (const part of Object.values(symbols)) {
    if (marks.has(part.mark)) wrong.push(`symbols: ${part.type} repeats the strip mark ${part.mark}`)
    marks.add(part.mark)
  }
  const built = readBuilt(content)
  const { lemmas, facts, gates, machines } = built
  // The levels as the course reads them: each with the part it builds, and each task with the equation it proves.
  const levels = content.levels.map((l) => ({ ...l, ...(built.builds.has(l.id) ? { builds: built.builds.get(l.id) } : {}), tasks: l.tasks.map((t) => (built.proves.has(t.id) ? { ...t, fact: built.proves.get(t.id) } : t)) }))
  const words = wordsOf(content.words, wordSets)
  const tasksOf = new Map(levels.map((l) => [l.id, readTasks(l, wordSets, content.taskPositions)]))
  // What reading the content finds wrong with it beyond its schema (validate.js reports it).
  for (const l of levels) if (l.tasks.length > 1 && l.tasks.some((t) => !t.step)) wrong.push(`${l.id}: a level of several tasks names each (step)`)
  const isBuilt = (p) => Boolean(lemmas[p] || gates[p] || machines.includes(p))
  const plan = courseLayout(content)
  const given = new Map(levels.map((l) => [l.id, l]))
  const rawTasks = content.libraryLevels
    ? content.libraryLevels.flatMap(level => readTasks(level, wordSets))
    : [...tasksOf.values()].flat()
  const declaredWorks = rawTasks.flatMap((task) => [
    ...(task.datatype ? [{ kind: 'type', type: task.datatype.type, form: null, task, value: () => typeOf(task) }] : []),
    ...(playFor(plays, task)?.gives === 'reference' ? [{ kind: 'function', type: task.fn, form: null, task, value: () => equations(task, task.solution) }] : []),
    ...(task.fact ? [{ kind: 'fact', type: task.fact, form: null, task }] : []),
  ])
  const references = partReferences(declaredWorks, {
    before: (a, b) => course.before(a, b),
    passed: (task) => Boolean(kept.board(task.taskId)),
    useLatest: true,
    include: () => true,
  })
  const declaration = (kind, type, id) => {
    const entry = references.resolve(type, null, null, { kind, reference: true })
    if (!entry) throw new Error(`level ${id} names the ${kind} ${type}, which no level declares`)
    return entry
  }
  const declarations = (task, id) => ({
    ...(task.types ? { datatypes: Object.fromEntries(task.types.map((type) => [type, declaration('type', type, id).value()])) } : {}),
    ...(task.defs || task.stated ? { defs: [...(task.defs ?? []).flatMap((type) => declaration('function', type, id).value()), ...(task.stated ?? [])] } : {}),
  })
  const eraOf = new Map(eras.flatMap((era, e) => eraLevels(era).map((id) => [id, e])))
  // The gates the levels build, filled in once the levels that build them are read (builtGates); a board of gates is
  // read by their ports alone. A truth circuit holds those and the primitive gates (parts.json), each with its name.
  const gateParts = {}
  // The parts: parts.json's and the lemmas', each on the board of its family.
  const { PARTS, defs, defaultsOf } = partsOf(content.partDefs, lemmas)
  const resourcesOf = operationsOf
  const partResources = Object.fromEntries(Object.entries(defs).map(([type, def]) => [type, resourcesOf(def)[0]]))
  const partsForResource = Object.fromEntries(Object.entries(defs).flatMap(([type, def]) => resourcesOf(def).map((resource) => [resource, type])))
  const onBoard = (...families) => Object.fromEntries(Object.entries(PARTS).filter(([type]) => families.includes(defs[type].family)))
  const primitiveGates = onBoard('logic:family-gate')
  const boardGates = Object.fromEntries(Object.entries(primitiveGates).map(([type, part]) => [type, { ...part, name: defs[type].name, desc: defs[type].desc }]))
  // A proof's parts: the proof rules and the lemmas, and the board's premises and goal.
  const proofParts = { ...PROOF_BOARD.FIXED_PARTS, ...onBoard('logic:family-rule', 'logic:family-box', 'logic:family-lemma') }
  // A machine's parts: the machine board's parts.json parts, the parts the player builds and the rule parts of its
  // rule books (every rule part the same engine part, RULE_DEFINITION).
  const machineParts = onBoard('logic:family-tactic', 'logic:family-loop')
  const RULE_ENGINE = compileParts({ rules: RULE_DEFINITION }, OPS).PARTS.rules
  // The rule parts a task holds (none on the generator's board, which carries rules as values).
  const ruleTypes = (task) => (task.want === 'logic:want-elim' ? new Map() : rulePartsOf(task))
  // The proofs the lemmas run, filled in the same way (lemmaWorks).
  const lemmaParts = {}
  const gatePorts = Object.fromEntries(Object.entries(gates).map(([type, g]) => [type, { inputs: g.ports }]))
  const proofBlueprint = primitivesOnly(PROOF_BOARD, proofParts)
  const gateBlueprint = primitivesOnly(GATE_BOARD, { ...primitiveGates, ...gatePorts })
  // Authoring uses declared ports even before a part has a packed implementation. The same circuit board supplies
  // the fixed cards, wire and region rules, and settings text for the authoring and play views.
  const blueprints = []
  const blueprintProblem = (error) => error.errors?.map(({ en }) => en).join(' ') ?? error.en ?? error.message
  const answer = (one, field, circuit) => {
    const { board } = circuit
    const read = (lines) => board.fromText(lines, one, circuit)
    try {
      const graph = read(one[field])
      blueprints.push({ level: one.id, task: one.task, key: one.taskId, board: graph, write: (work) => board.toText(work, one, circuit), read, ...(field === 'naive' ? { naive: true } : {}) })
      return graph
    } catch (error) {
      wrong.push(`${one.id}: its ${field}: ${blueprintProblem(error)}`)
      return board.startBoard(one)
    }
  }
  const artifact = (task, circuit) => {
    const reference = built.references.get(task.taskId)
    if (!reference?.solution) return undefined
    try {
      return circuit.board.fromText(reference.solution, { ...task, ...reference }, circuit)
    } catch (error) {
      wrong.push(`${task.id}: its part implementation: ${blueprintProblem(error)}`)
      return undefined
    }
  }
  const readAnswers = (one, circuit) => ({
    partSolution: artifact(one, circuit),
    ...Object.fromEntries(['solution', 'naive'].filter((field) => one[field]).map((field) => [field, answer(one, field, circuit)])),
  })
  // Read a proof or gate now, and a machine once its rule book is known.
  const answers = (one) => {
    if (one.kind === 'logic:proof') return { ...one, parts: proofParts, ...readAnswers(one, proofBlueprint) }
    if (one.kind === 'logic:gates') return { ...one, tests: gateTests(one), ...readAnswers(one, gateBlueprint) }
    return one
  }
  // Register task metadata before resolving notation or reading any answers.
  const LEVELS = plan.order.map((id) => {
    const level = given.get(id)
    if (!level) throw new Error(`an era names a level that does not exist: ${id}`)
    const chapter = eraOf.get(id)
    const requires = plan.requires.get(id) ?? []
    const unlocks = level.builds ? [`lemma:${level.builds}`] : []
    const all = tasksOf.get(id).map((task) => ({
      ...task,
      adds: [...new Set([...(level.adds ?? []).filter((type) => symbols[type]), ...(task.adds ?? []),
        ...(task.kind === 'logic:machine' ? axiomPartsOf(task) : [])])],
      chapter, requires, unlocks,
    }))
    const last = all.at(-1)
    return {
      id, title: level.title, intro: level.intro, after: level.after, kind: last.kind, brief: last.brief, builds: level.builds, fact: last.fact,
      without: last.without, declare: last.declare, adds: [...new Set(all.flatMap((t) => t.adds))], chapter, requires, unlocks, tasks: all,
    }
  })
  const byId = new Map(LEVELS.map((l) => [l.id, l]))
  const TASKS = LEVELS.flatMap((l) => l.tasks)
  // The rules each connective's declaration brings in, by the connective's name.
  const rules = LEVELS.filter((level) => level.declare && level.adds?.length).map((level) => ({
    kind: 'declaration', type: keyOf(level.declare), form: null, task: level.tasks.at(-1), value: level.adds.filter((type) => !symbols[type]),
  }))
  const LABELS = levelLabels(eras)
  const CHAPTERS = eras.map((era) => ({ ...era.chapter, track: plan.tracks.get(era.id), rows: plan.rows.get(era.id) }))
  // Every axiom part stays in the levels that state it, and is no new idea: it is the level's own given.
  const axioms = [...new Set(TASKS.filter((t) => t.kind === 'logic:machine').flatMap(axiomPartsOf))]
  // A level's reference boards, every task's (or a task's own, `task` its index), without what each board starts with.
  const answersOf = (l) => byId.get(l.id).tasks.filter((t) => (l.task === undefined || t.task === l.task) && t.solution?.nodes).map((t) => ({ ...t.solution, nodes: t.solution.nodes.filter((n) => !presetIds(t).includes(n.id)) }))
  // A course level is a level, or one of its tasks (`task`, its index): a level plays with its last task's tray.
  // The proofs each lemma's shapes run: the proof tasks its references name.
  const taskById = new Map(TASKS.map((task) => [task.taskId, task]))
  const standalone = (id, reference, circuit) => {
    const task = { ...reference, id, task: 0, taskId: id, ...(reference.kind === 'logic:proof' && { schema: reference.tests[0] }) }
    try {
      return { ...task, partSolution: circuit.board.fromText(reference.solution, task, circuit) }
    } catch (error) {
      if (!error.en) throw error
      throw new Error(`${id}: ${blueprintProblem(error)}`, { cause: error })
    }
  }
  const lemmaWorks = built.lemmaRefs.map(({ type, form, task, reference }) => ({
    kind: 'lemma', type, form,
    task: taskById.get(task) ?? standalone(task ?? `${type}:${form}`, reference, proofBlueprint),
  }))
  references.register([
    ...rules, ...lemmaWorks,
    ...TASKS.filter((task) => task.kind === 'logic:machine' && machines.includes(task.builds)).map((task) => ({ kind: 'logic:machine', type: task.builds, form: null, task })),
    ...TASKS.filter((task) => task.kind === 'logic:gates' && gates[task.builds]).map((task) => ({ kind: 'gate', type: task.builds, form: null, task })),
  ])
  const course = yield {
    levels: LEVELS, plan,
    intrinsic: [...axioms, ...Object.keys(symbols)],
    local: axioms,
    additions: (l) => {
      const level = byId.get(l.id)
      if (l.task === undefined) return level.adds
      const stripAdds = level.tasks.filter(task => task.task <= l.task).flatMap((task) => task.adds.filter((type) => symbols[type]))
      return [...level.adds.filter((type) => !symbols[type]), ...stripAdds]
    },
    parts: Object.fromEntries(Object.keys(built.parts).filter(isBuilt).map(p => [p, { unlock: `lemma:${p}` }])),
    builds: (l) => (byId.get(l.id).builds ? [byId.get(l.id).builds] : []),
    grants: (l) => {
      const task = byId.get(l.id).tasks.find(task => task.task === l.task)
      return l.grantType !== 'symbol' && task?.kind === 'logic:machine'
        ? [...ruleTypes(task).keys()].filter((p) => !machineParts[p]) : []
    },
    machine: (l) => eras[eraOf.get(l.id)]?.machine ?? null,
    needed: (l) => { const answers = answersOf(l); return answers.length ? answers.flatMap(rulesIn) : null },
    references, boards: answersOf,
  }
  const noFlags = new Set()
  for (const one of TASKS) {
    // Machine rulebook parts are board gives. Fixed formula keys come from the same selected trays.
    const availableSymbols = course.state({ id: one.id, task: one.task }, noFlags, ['symbol']).symbol
    const formulaSymbols = Object.fromEntries(Object.keys(availableSymbols).flatMap((type) => {
      const part = availableSymbols[type]
      return part && Object.hasOwn(symbolFor, part.mark) ? [[symbolFor[part.mark], part]] : []
    }))
    const notation = {
      words: one.words ?? words,
      symbols: Object.keys(formulaSymbols),
      formulaSymbols,
      propertyWords: one.propertyWords ?? one.kind === 'logic:proof',
    }
    const expanded = one.cases ? expand(one, notation) : {}
    Object.assign(one, answers({
      ...one, ...declarations(one, one.id), ...(!one.brief && expanded.schema ? { brief: expanded.tests.at(-1).caseBrief } : {}),
      ...(WORLD_KINDS.includes(one.kind) ? { vocab: vocabOf(one) } : {}), ...expanded,
      ...(one.kind === 'logic:machine' ? { tests: one.tests.map((t) => ({ label: machineLabel(t, notation), ...t })) } : {}),
      lemmas, proofs: lemmaParts, facts, gates: boardGates, partDefs: defs, notation,
    }))
  }
  for (const level of LEVELS) level.brief = level.tasks.at(-1).brief
  for (const one of TASKS) {
    const source = tasksOf.get(one.id).find(task => task.task === one.task)
    for (const [kind, names, action] of [['type', source.types, 'declared'], ['function', source.defs, 'defined']]) {
      for (const type of names ?? []) {
        if (!content.standalone && !references.prior(kind, one).some((entry) => entry === declaration(kind, type, one.id))) {
          throw new Error(`level ${one.id} names the ${kind} ${type} before it is ${action}`)
        }
      }
    }
  }
  for (const { type, form, task } of references.entriesOf('lemma')) {
    const shapes = lemmaParts[type] ??= {}
    shapes[form] = { level: task, board: () => kept.board(task.taskId) ?? task.partSolution }
  }
  // A machine level's (and a script's) rule book has every rule the level has met, whatever its tray (machine.js
  // ruleBookOf): the kernel's rules opened by chapter, the lemmas built before it, each in the shapes it has gained by
  // then. A task after the first may use what its level proves already (a law proved on the proof board, then put to
  // work), in every shape it proves.
  for (const level of LEVELS.filter((l) => l.tasks.some((t) => t.kind === 'logic:machine' || t.kind === 'logic:script'))) {
    // The equations proved before it (by the levels it comes after), and in a later task its own.
    const proven = content.standalone ? Object.keys(facts) : Object.keys(facts).filter((type) => references.prior('fact', { id: level.id, task: 0 }).some((entry) => entry.type === type))
    for (const one of level.tasks) {
      const later = one.task > 0
      // A task has what the tasks before it in its level proved.
      const before = references.prior('fact', one).filter(({ task }) => task.id === one.id).map(({ type }) => type)
      one.ruleParts = partsForResource
      one.holds = content.standalone ? Object.keys(content.registries['circuit/part']) : met(course, { id: level.id, task: one.task })
      one.proven = [...new Set([...proven, ...before, ...(later && level.fact ? [level.fact] : [])])]
      const has = holds(course, { id: level.id, task: one.task }, new Set())
      one.forms = Object.fromEntries(Object.entries(lemmas).filter(([, l]) => l.forms).map(([type, l]) => [type, l.forms.map((f) => f.key).filter((key) => content.standalone || has(type, 'form', key))]))
    }
  }
  // A built machine part's ports are the inputs of the board of the first task it refers to.
  const builtPorts = Object.fromEntries(machines.map((type) => [type, inputsOfLevel(taskById.get(built.publishers[type][0]) ?? built.parts[type].inside[0].reference).map((i) => i.name)]))
  const declaredMachines = Object.fromEntries(Object.entries(builtPorts).map(([type, inputs]) => [type, { inputs }]))
  const machineBlueprint = (task) => primitivesOnly(MACHINE_BOARD, {
    ...Object.fromEntries([...ruleTypes(task).keys()].map((type) => [type, RULE_ENGINE])),
    ...declaredMachines,
    ...machineParts,
  })
  // A machine's answers are read now that its rule book, and so its rule parts, are known.
  for (const one of TASKS.filter((t) => t.kind === 'logic:machine')) Object.assign(one, readAnswers(one, machineBlueprint(one)))
  for (const { type, variant, task, reference } of built.machineRefs) if (!taskById.has(task)) {
    const one = { ...reference, ...declarations(reference, type), lemmas, facts, ruleParts: partsForResource, partDefs: defs }
    references.register([{ kind: 'logic:machine', type, form: null, task: standalone(`${type}:${variant}`, one, machineBlueprint(one)) }])
  }
  // The gates the levels build run their boards (gates.js builtGates).
  const gateBuilders = Object.fromEntries(references.entriesOf('gate').map(({ type, task }) => [type, task]))
  for (const type of Object.keys(gates)) if (!gateBuilders[type]) {
    const reference = built.parts[type].inside[0].reference
    const task = standalone(type, reference, gateBlueprint)
    gateBuilders[type] = { ...task, tests: gateTests(task), gates: boardGates }
  }
  Object.assign(gateParts, builtGates(gates, gateBuilders, kept.board))
  Object.assign(boardGates, gateParts)
  // Machine cards share a packed instance when their visible sequence of references is the same.
  const running = new Map()
  const machineTypes = [...new Set(references.entriesOf('logic:machine').map(({ type }) => type))]
  for (const one of TASKS) {
    one.partResources = partResources
    const has = holds(course, one, new Set())
    const part = (type, strict) => {
      const options = { strict, reference: true, kind: 'logic:machine' }
      const reference = has.inside(type, null, options)?.task
      if (!reference) return null
      const key = JSON.stringify([type, strict, reference.taskId])
      if (!running.has(key)) {
        const builder = () => has.inside(type, null, { strict, kind: 'logic:machine' }).task
        running.set(key, builtMachine(type, builder, reference, kept.board, settingsOf(built.parts[type]).map((x) => x.key)))
      }
      return running.get(key)
    }
    one.built = Object.fromEntries(machineTypes.map((type) => [type, part(type, false)]))
    if (one.kind === 'logic:machine' && machineTypes.includes(one.builds)) one.upgrades = part(one.builds, true) ?? undefined
    // What a machine (and a script's `by`) runs: the board's own cards, the parts built, the machine's and rule parts.
    if (one.kind === 'logic:machine' || one.kind === 'logic:script') one.parts = (type) => MACHINE_BOARD.FIXED_PARTS[type] ?? (builtPorts[type] ? one.built[type] ?? undefined : machineParts[type] ?? RULE_ENGINE)
  }
  const at = (task) => ({ id: task.id, task: task.task })
  // The parts a machine task has built, named.
  const builtOf = (task) => Object.fromEntries(Object.entries(task?.built ?? {}).filter(([, p]) => p).map(([type, p]) => [type, { ...p, name: built.parts[type].name, desc: built.parts[type].desc }]))
  // The parts a machine task registers itself: its rule parts, and a built part's face where it takes settings.
  const parts = new WeakMap()
  const taskPartsOf = (task) => {
    if (!parts.has(task)) parts.set(task, compileParts({ ...ruleParts(task), ...builtFaces(task) }, OPS).defs)
    return parts.get(task)
  }
  const builtFaces = (task) => Object.fromEntries(Object.entries(task.built ?? {}).filter(([type, p]) => p && settingsOf(built.parts[type]).length).map(([type, p]) => {
    const { name, desc, settings } = built.parts[type]
    return [type, { name, desc, icon: 'CircuitBoard', family: 'logic:family-built', inputs: p.inputs.map((port) => ({ name: port, type: p.inputTypes?.[port] ?? 'logic:machine-value', ...(port === 'rules' ? { label: T('规则', 'Rules') } : {}) })), settings, outputType: p.outputType ?? 'logic:machine-value', op: 'circuit:zero' }]
  }))
  /** What a task's tray holds for a player with `flags`, as what it shows and what it folds away. */
  course.registerObjects('circuit/part', Object.fromEntries(TASKS.filter(task => task.kind === 'logic:machine').flatMap(task => [...ruleTypes(task).keys()].map(type => [type, RULE_DEFINITION]))))
  const offerIn = (task, flags) => {
    const { shown, folded, types } = offer(course, at(task), flags)
    const state = course.state(at(task), flags)
    const circuit = (type) => Object.hasOwn(state['circuit/part'], type) && (task.kind !== 'logic:gates' || Object.hasOwn(task.gates, type))
    return { shown: shown.filter(circuit), folded: folded.filter(circuit), types: types.filter(circuit) }
  }
  /** Whether a task holds a part, or a shape of one: has(part), has(part, 'form', shape) (../../course.js holds). */
  const holdsIn = (task, flags) => holds(course, at(task), flags)
  // The truth circuits as the kernel's circuit screen reads them (gates.js gateCourse).
  const truthCircuits = gateCourse({ built: gateParts, builders: gateBuilders, offerIn, holdsIn, syncOwn: kept.sync })
  // The proofs, the same way: their parts are the proof rules and the lemmas (proofParts).
  const proofBoards = {
    ...boardView({
      board: PROOF_BOARD, parts: () => proofParts,
      built: () => Object.fromEntries(Object.keys(lemmaParts).filter(type => !lemmas[type].card).map(type => [type, {
        ...proofParts[type],
        opens: params => {
          const proof = lemmaReference({ type, params }, lemmas, lemmaParts)
          return proof && { circuit: proof.board(), level: proof.level }
        },
      }])),
      builder: (type, _task, params) => lemmaReference({ type, params }, lemmas, lemmaParts)?.level ?? null,
      offerIn, holdsIn, syncOwn: kept.sync, tasksAt: (id) => byId.get(id)?.tasks,
    }),
    runtimeReferences: proofWorkReferences,
  }
  // The machines: the parts the player built as packed parts, a task's rule parts registered for it.
  const machineBoards = boardView({
    board: MACHINE_BOARD,
    parts: (task) => ({ ...machineParts, ...Object.fromEntries([...ruleTypes(task).keys()].filter((t) => !machineParts[t]).map((t) => [t, RULE_ENGINE])), ...builtOf(task) }),
    built: builtOf,
    builder: (type, task) => task?.built?.[type]?.opens().level ?? null,
    defined: (task) => ({ of: (type) => taskPartsOf(task)[type] ?? defs[type] ?? null, defaults: (type) => (taskPartsOf(task)[type] ? {} : defaultsOf(type)), ops: OPS }),
    offerIn,
    holdsIn,
    syncOwn: kept.sync,
    // A machine level that upgrades a part opens on the board that part runs; a preset stays locked in.
    opening: (task, _progress, viewOf) => {
      const from = task.upgrades?.opens().circuit
      return withPreset(from && fitsCircuit(from, task, viewOf(task)) ? from : startMachine(task), presetFor(task))
    },
  })
  function proofWorkReferences(task, work) {
    if (task.kind !== 'logic:proof') return []
    return (work?.nodes ?? []).flatMap((node) => {
      const proof = lemmaReference(node, lemmas, lemmaParts)
      return proof ? [{ key: proof.level.taskId, task: proof.level, work: proof.board() }] : []
    })
  }
  function workReferences(task, work) {
    if (!task) return []
    const source = tasksOf.get(task.id)?.find(source => source.task === task.task)
    const named = [
      ...(source?.types ?? []).map((type) => declaration('type', type, task.id)),
      ...(source?.defs ?? []).map((type) => declaration('function', type, task.id)),
      ...references.prior('fact', task).filter(({ type }) => task.proven?.includes(type)),
    ].map((entry) => {
      const source = entry.task
      const builder = LEVELS.find(({ id }) => id === source.id)?.tasks.find(task => task.task === source.task)
      const work = entry.value?.() ?? facts[entry.type]?.statement ?? builder?.partSolution
      return { key: source.taskId, task: builder, work }
    })
    return [...named, ...proofWorkReferences(task, work)]
  }
  return { partResources, machineBoards, symbols, LEVELS, CHAPTERS, LABELS, course, circuitFor, workReferences, offerIn, holdsIn, machines, lemmas, facts, parts: built.parts, publishers: built.publishers, texts: { lemmas, facts, gates }, proofs: lemmaParts, gates: gateParts, defs, defaultsOf, truthCircuits, proofBoards, provers: new Set(lemmaWorks.map(({ task }) => task.id)), blueprints, wrong, syncOwn: kept.sync }
}
