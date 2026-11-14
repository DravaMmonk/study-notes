// A logic game's course, from its content (games/<id>/: game.json, levels, glossary, parts.json; vocabulary.js says what
// may be in it): the play order and the tree from its eras (../../course.js layout), each level's number and the parts it
// can really offer, its reference and naive answers as the boards they write (blueprint.js), and its built pieces
// (parts.json `inside`, readBuilt): a lemma proved on the proof board, a gate built on a truth circuit (gates.js
// builtGates), a machine part (machine.js builtMachine), an equation proved; every one runs the player's work (a lemma,
// the proof of each of its shapes).
import { playFor } from '../../engine/plays.js'
import { plays } from './plays.js'
import { builtPieces, cardOf, pieceReferences, revisionsOf, settingsOf } from '../../engine/pieces.js'
import { defineCourse, eraLevels, holds, itemOf, layout, met, numbered, offer } from '../../course.js'
import { taskLevels } from '../../engine/tasks.js'
import { trayIn } from '../../engine/trays.js'
import { parse, replaceAtoms, show } from './formula.js'
import { claimSentences, vocabulary } from './fol.js'
import { parseEquation, parseS } from './schematic.js'
import { MACHINE_BOARD, RULE_PIECE, axiomPartsOf, builtMachine, inputsOfLevel, rulePartsOf, rulePieces, startMachine } from './machine.js'
import { defineParts } from '../../engine/parts/define.js'
import { presetOf, withPreset } from '../../circuit/model.js'
import { T } from '../../shell/i18n.js'
import { render, say, sayTerm } from './notation.js'
import { typeOf } from './iso.js'
import { equations } from './define.js'
import { PROOF_BOARD, startProof } from './proof.js'
import { OPS, partsOf } from './ops.js'
import { boardView } from '../../engine/board-view.js'
import { keptBoards } from './built.js'
import { builtGates, gateCourse, gateTests, startGates } from './gates.js'
import { lettersOf } from './truth.js'
import { boardOf } from './ruleLines.js'
import { fromLines, gateShape, machineShape, proofShape, toLines } from './blueprint.js'

/** A machine level's preset (`preset`: ids of its reference answer), locked on its board (../../circuit/model.js). */
export const presetFor = (task) => (task.preset ? presetOf(task.solution, task.preset, new Set(startMachine(task).nodes.map((n) => n.id))) : null)
/** The ids of the cards a level presets on its board. */
export const presetIds = (level) => level.preset ?? []
const rulesIn = (circuit) => circuit.nodes.map((n) => n.type)

// A lemma's schema written as its proof task writes it: a letter of the lemma applied to the variable a quantifier binds
// (¬∃x. P(x)) is the letter itself, the quantifier's body (¬∃x. P).
const asSchema = (text, metas) => metas.reduce((t, m) => t.replace(new RegExp(`\\b${m}\\(([a-z]\\w*)\\)`, 'g'), m), text)

/**
 * A game's built pieces (parts.json, ../../engine/pieces.js builtPieces) read as the course's tables. Its family says
 * what a piece is: a lemma (`lemma`: each shape the premises and goal of the proof task it refers to, its letters its
 * tree settings, the first reference its first shape and the rest, by `form`, shapes an upgrade adds), a gate (`gate`:
 * its ports the letters of its truth circuit), a machine part (`built`) or an equation proved (`rule`: its statement
 * its task's goal; the task may say how it enters the rule book, `rule`). The level of a piece's first reference (of
 * every one, for a chain of upgrades) builds it; a task an equation refers to proves it. Returns { lemmas, facts,
 * gates, machines, pieces, revisions, builds: level → type, proves: task → type, lemmaRefs: [{ type, form, task }] }.
 */
function readBuilt(content) {
  const raw = new Map(content.levels.flatMap((L) => L.tasks.map((task) => [task.id, { level: L, task }])))
  const out = { lemmas: {}, facts: {}, gates: {}, machines: [], pieces: {}, revisions: {}, builds: new Map(), proves: new Map(), lemmaRefs: [] }
  for (const [type, def] of Object.entries(content.partDefs?.parts ?? {})) if (revisionsOf(def).length) out.revisions[type] = [...revisionsOf(def)]
  for (const [type, piece] of Object.entries(builtPieces(content.partDefs))) {
    const refs = piece.inside.map((ref) => {
      if (!raw.has(ref.task)) throw new Error(`parts.json's ${type} refers to task ${ref.task}, which no level has`)
      return { ...ref, ...raw.get(ref.task) }
    })
    out.pieces[type] = piece
    const build = (level) => {
      if (out.builds.has(level.id) && out.builds.get(level.id) !== type) throw new Error(`level ${level.id} builds both ${out.builds.get(level.id)} and ${type}`)
      out.builds.set(level.id, type)
    }
    // An equation is proved, not built; a shape after the first is one more form of the piece, opened where it is proved.
    if (piece.family !== 'rule') for (const [k, ref] of refs.entries()) if (!ref.form || k === 0) build(ref.level)
    const later = refs.slice(1).filter((ref) => ref.form)
    for (const id of [...new Set(later.map((ref) => ref.level.id))]) (out.revisions[type] ??= []).unshift({ by: id, forms: later.filter((ref) => ref.level.id === id).map((ref) => ref.form) })
    const { name, desc } = piece
    if (piece.family === 'lemma') {
      const trees = settingsOf(piece).filter((x) => x.control === 'tree')
      const metas = trees.map((x) => x.key)
      const labelled = trees.filter((x) => x.label)
      const shapes = refs.map((ref) => {
        const schema = ref.task.tests[0]
        const premises = Object.values(schema.premises ?? {}).map((text) => asSchema(text, metas))
        return { key: ref.form ?? '', label: ref.label, statement: asSchema(schema.goal, metas), ...(premises.length ? { premises } : {}) }
      })
      out.lemmas[type] = {
        name, desc, metas, ports: shapes[0].premises ?? [],
        ...(labelled.length ? { params: Object.fromEntries(labelled.map((x) => [x.key, x.label])) } : {}),
        ...(refs[0].form ? { forms: shapes } : { statement: shapes[0].statement, ...(shapes[0].premises ? { premises: shapes[0].premises } : {}) }),
        ...(cardOf(piece) ? { card: cardOf(piece) } : {}),
      }
      out.lemmaRefs.push(...refs.map((ref) => ({ type, form: ref.form ?? '', task: ref.task.id })))
    } else if (piece.family === 'gate') out.gates[type] = { name, desc, ports: lettersOf([parse(refs[0].task.target)]) }
    else if (piece.family === 'built') out.machines.push(type)
    else if (piece.family === 'rule') {
      const { task } = refs[0]
      out.facts[type] = { name, desc, statement: task.tests[0].goal, ...(task.rule ? { rule: task.rule } : {}) }
      out.proves.set(task.id, type)
    } else throw new Error(`parts.json's ${type} is a built piece of family ${piece.family}: a lemma, a gate, a built machine part or a rule (an equation)`)
  }
  return out
}

/**
 * content (../../engine/content.js assemble; the fields are vocabulary.js GAME): {
 *   eras        the course's eras, one proof machine each (games/DESIGN.md 2), each with its map chapter
 *               { title, question }; a topic has a `code` for its numbers
 *   levels      every level; a level may introduce connective symbols (`symbols`), see notation.js
 *   words       the word sets (wordSets, by name, merged in order) every level reads its letters, predicates and
 *               names in, unless it names its own (`words`): { letter: { zh, en } } the everyday sentence each reads as
 *
 * A proof level is a schema: its test (`tests: [{ premises, goal }]`) is written in letters, and each test case
 * (`cases`) fills the letters in with sentences ({ A: 'Rain', B: 'Wet' }, a
 * compound sentence too: { A: 'Rain ∧ Wind' }). Every case becomes a test of its own, with the case as `subst` and its
 * sentences as its label, so one proof is checked on all of them; a last test keeps the bare letters, the pattern
 * itself. A level opens on its first case, the one its task is written in.
 *   partDefs    parts.json: the primitive gates, the proof rules and the machine board's parts
 *               (../../engine/parts/define.js) over the domain's engine resources (ops.js), and the built pieces
 *               (readBuilt): the lemmas the player proves, the gates built on a truth circuit (gates.js), the machine
 *               parts built on the machine board, and the equations proved (chapter 12 on), each from then on a rule
 *               and a rewrite rule of the rule book of numbers (machine.js MATH) in every level after it (`proven`); a
 *               piece's description grows along the course (`revisions`), and an upgrade adds shapes to its card
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
 * cards, and the answer's wires between them and the board's own inputs and outputs, are locked
 * (../../circuit/model.js): moved, never deleted or rewired. presetIds(level) lists the ids.
 * A level may also hold back parts it would carry (`without: [part]`): a proof that must do without the box; and a
 * level that shows a new part's use by itself says why its use is abstract (`showcase: 'reason'`, ../../course.js).
 * A level names only the parts it brings in (`adds`): every part met or built before it carries into it, as far as
 * its tray lists it; see ../../course.js reach and offer. What a task holds is the kernel's rule (../../course.js
 * holds), and the domain says only what is its own: a task withholds its `without`; a machine board is given the rule
 * parts of its rule book (machine.js rulePieces), which holds every rule met whatever the tray; and a lemma's
 * shapes after its first are values of its `form` that the upgrade proving them opens (`revisions`: by, forms).
 * Returns { LEVELS, CHAPTERS, LABELS, course, offerIn(task, flags), holdsIn(task, flags), machines, revisions, lemmas,
 * facts, pieces: the built pieces, texts: what a player reads of them, proofs,
 * gates: the gates built, defs and defaultsOf: the parts parts.json defines and a new node's settings, truthCircuits and proofBoards: the truth circuits and
 * the proofs as the kernel's circuit screen reads a course, wrong: what reading the content found wrong, … }: each of LEVELS { id, title, …, tasks }, its
 * tasks as read (`task` the index, `taskId` the id). Reading builds all of it anew: the content is never written to.
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
  const concrete = level.cases.length ? level.cases.map(test) : [test({})]
  const symbolic = { ...test(letters), symbolic: true, label: { zh: '字母', en: 'Letters' } }
  symbolic.caseBrief = proofBrief(symbolic, level, { ...notation, words: level.symbolicWords ?? null, propertyWords: false })
  return { schema, tests: [...concrete, symbolic] }
}

// A first-order level's vocabulary (fol.js): the predicates and names its sentences use, and any it adds as decoys.
const WORLD_KINDS = ['translate', 'query', 'model']
// `names` are every name the level reads (level.consts), so a name typed that the level does not use still parses.
function vocabOf(level) {
  const names = level.consts ?? []
  const texts = level.kind === 'model' ? claimSentences(level) : [level.target, ...(level.decoys ?? [])]
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

/** A declaration's answers as boards (ruleLines.js boardOf): its reference and naive rules (an audit's naive answer
 *  is cases instead), and the declarations someone else wrote (`boards`). */
function declaredBoards(one) {
  const declared = (field) => (one[field]?.every((r) => r.needs) ? { [field]: boardOf(one[field]) } : {})
  return { ...one, ...declared('solution'), ...declared('naive'), ...(one.boards ? { boards: one.boards.map(({ rules, ...rest }) => ({ ...rest, board: boardOf(rules) })) } : {}) }
}

/**
 * A level's tasks as the course reads each (../../engine/tasks.js taskLevels): the level under the task, but for its
 * introduction and pass text, which are the level's own; what the level builds or proves comes of its last task. Each
 * keeps its name (`step`), reads in its words, and a declaration's answers are boards.
 */
function readTasks(level, wordSets) {
  const { builds, fact, intro: _intro, after: _after, ...base } = level
  return taskLevels(base).map((t, k, all) => {
    const last = k === all.length - 1
    const one = { ...(last && builds ? { builds } : {}), ...(last && fact ? { fact } : {}), ...t, ...(level.tasks[k].step ? { step: level.tasks[k].step } : {}) }
    return { ...(one.kind === 'iso' ? declaredBoards(one) : one), ...(one.words ? { words: wordsOf(one.words, wordSets) } : {}) }
  })
}

export function logicCourse(content) {
  // The boards the player passed the building levels with: this content's (built.js).
  const kept = keptBoards()
  const { eras, trays, wordSets = {}, primitives, concept = {}, local = [] } = content
  const built = readBuilt(content)
  const { lemmas, facts, gates, machines, revisions } = built
  // The levels as the course reads them: each with the piece it builds, and each task with the equation it proves.
  const levels = content.levels.map((l) => ({ ...l, ...(built.builds.has(l.id) ? { builds: built.builds.get(l.id) } : {}), tasks: l.tasks.map((t) => (built.proves.has(t.id) ? { ...t, fact: built.proves.get(t.id) } : t)) }))
  const words = wordsOf(content.words, wordSets)
  const tasksOf = new Map(levels.map((l) => [l.id, readTasks(l, wordSets)]))
  // What reading the content finds wrong with it beyond its schema (validate.js reports it).
  const wrong = []
  for (const l of levels) if (l.tasks.length > 1 && l.tasks.some((t) => !t.step)) wrong.push(`${l.id}: a level of several tasks names each (step)`)
  const isBuilt = (p) => Boolean(lemmas[p] || gates[p] || machines.includes(p))
  const plan = layout(eras)
  const given = new Map(levels.map((l) => [l.id, l]))
  const rawTasks = [...tasksOf.values()].flat()
  const declaredWorks = rawTasks.flatMap((task) => [
    ...(task.datatype ? [{ kind: 'type', type: task.datatype.type, form: null, task, value: () => typeOf(task) }] : []),
    ...(playFor(plays, task)?.gives === 'reference' ? [{ kind: 'function', type: task.fn, form: null, task, value: () => equations(task, task.solution) }] : []),
    ...(task.fact ? [{ kind: 'fact', type: task.fact, form: null, task }] : []),
  ])
  const symbols = plan.order.flatMap((id) => (given.get(id)?.symbols ?? []).map((type) => ({
    kind: 'symbol', type, form: null, task: tasksOf.get(id)[0],
  })))
  const references = pieceReferences([...declaredWorks, ...symbols], {
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
  const gatePieces = {}
  // The parts: parts.json's and the lemmas', each on the board of its family.
  const { PARTS, defs, defaultsOf } = partsOf(content.partDefs, lemmas)
  const onBoard = (...families) => Object.fromEntries(Object.entries(PARTS).filter(([type]) => families.includes(defs[type].family)))
  const primitiveGates = onBoard('gate')
  const boardGates = Object.fromEntries(Object.entries(primitiveGates).map(([type, part]) => [type, { ...part, name: defs[type].name, desc: defs[type].desc }]))
  // A proof's parts: the proof rules and the lemmas, and the board's premises and goal.
  const proofTypes = Object.keys(onBoard('rule', 'box', 'lemma'))
  const proofParts = { ...PROOF_BOARD.FIXED_PARTS, ...onBoard('rule', 'box', 'lemma') }
  // A machine's parts: the machine board's parts.json parts, the parts the player builds and the rule parts of its
  // rule books (every rule part the same engine part, RULE_PIECE).
  const machineParts = onBoard('tactic', 'loop')
  const RULE_ENGINE = defineParts({ parts: { rules: RULE_PIECE } }, OPS).PARTS.rules
  // The rule parts a task holds (none on the generator's board, which carries rules as values).
  const ruleTypes = (task) => (task.want === 'elim' ? new Map() : rulePartsOf(task))
  // The proofs the lemmas run, filled in the same way (lemmaWorks).
  const lemmaPieces = {}
  const gatePorts = Object.fromEntries(Object.entries(gates).map(([type, g]) => [type, { inputs: g.ports }]))
  /** A board some blueprint lines write, on what the level gives (an empty one, its fault said, when they cannot be read). */
  // Every board the content writes as blueprint text, with how it reads back on its level (domain.js blueprints).
  const blueprints = []
  const board = (one, field, start, shape, types) => {
    try {
      const read = (lines) => fromLines(lines, start, shape, types)
      const b = read(one[field])
      // Its place in the saves (built.js): its task's id.
      blueprints.push({ level: one.id, task: one.task, key: one.taskId, board: b, write: (x) => toLines(x, shape), read, ...(field === 'naive' ? { naive: true } : {}) })
      return b
    } catch (e) {
      wrong.push(`${one.id}: its ${field}: ${e.message}`)
      return start
    }
  }
  // A task's answers as boards: a proof's and a truth circuit's here, a machine's once its rule book is known (below).
  const answers = (one) => {
    const read = (field, start, shape, types) => (one[field] ? { [field]: board(one, field, start, shape, types) } : {})
    if (one.kind === 'proof') {
      const shape = proofShape(proofParts)
      return { ...one, parts: proofParts, ...read('solution', startProof(one), shape, proofTypes), ...read('naive', startProof(one), shape, proofTypes) }
    }
    if (one.kind === 'gates') {
      const shape = gateShape({ ...primitiveGates, ...gatePorts })
      const types = [...Object.keys(primitiveGates), ...Object.keys(gates)]
      return { ...one, tests: gateTests(one), ...read('solution', startGates(one), shape, types), ...read('naive', startGates(one), shape, types) }
    }
    return one
  }
  // A level writes formulas in its own words (notation.js) and with every symbol introduced by then: the symbols of
  // the levels before it in play order, and its own.
  const LEVELS = plan.order.map((id) => {
    const level = given.get(id)
    if (!level) throw new Error(`an era names a level that does not exist: ${id}`)
    const known = references.entriesOf('symbol').filter(({ task }) => task.id === id || plan.order.indexOf(task.id) < plan.order.indexOf(id)).map(({ type }) => type)
    const chapter = eraOf.get(id)
    const requires = plan.requires.get(id) ?? []
    const unlocks = level.builds ? [`lemma:${level.builds}`] : []
    const read = (l) => {
      const notation = { words: l.words ?? words, symbols: known, propertyWords: l.propertyWords ?? l.kind === 'proof' }
      const expanded = l.cases ? expand(l, notation) : {}
      // A machine board's axioms are parts the level brings with it (machine.js axiomPartsOf).
      return answers({ ...l, ...declarations(l, id), ...(!l.brief && expanded.schema ? { brief: expanded.tests.at(-1).caseBrief } : {}), adds: [...(l.adds ?? []), ...(l.kind === 'machine' ? axiomPartsOf(l) : [])], ...(WORLD_KINDS.includes(l.kind) ? { vocab: vocabOf(l) } : {}), ...expanded, ...(l.kind === 'machine' ? { tests: l.tests.map((t) => ({ label: machineLabel(t, notation), ...t })) } : {}), chapter, requires, unlocks, lemmas, proofs: lemmaPieces, facts, gates: boardGates, partDefs: defs, revisions, notation })
    }
    const all = tasksOf.get(id).map(read)
    const last = all.at(-1)
    // The level: what it says once, and what the course reads of it off its last task (its kind and brief on the map,
    // what it holds back, the connective it declares). A part the level or any task brings in is new to the level,
    // whichever task it is.
    return {
      id, title: level.title, intro: level.intro, after: level.after, kind: last.kind, brief: last.brief, builds: level.builds, fact: last.fact, showcase: level.showcase,
      without: last.without, declare: last.declare, adds: [...new Set(all.flatMap((t) => t.adds))], chapter, requires, unlocks, tasks: all,
    }
  })
  for (const l of levels) if (!eraOf.has(l.id)) throw new Error(`level ${l.id} is in no era`)
  const byId = new Map(LEVELS.map((l) => [l.id, l]))
  const TASKS = LEVELS.flatMap((l) => l.tasks)
  // The rules each connective's declaration brings in, by the connective's name.
  const rules = LEVELS.filter((level) => level.declare && level.adds?.length).map((level) => ({
    kind: 'declaration', type: level.declare.zh, form: null, task: level.tasks.at(-1), value: level.adds,
  }))
  for (const [type, list] of Object.entries(revisions)) for (const r of list) if (!byId.has(r.at ?? r.by)) throw new Error(`the revision of ${type} names a level that does not exist: ${r.at ?? r.by}`)
  // A level's number: on an era's main path the era and its place, a parallel set row by row ('1-4', numbered), in a topic its
  // code and place ('D2'), C1 …
  // for the era's challenges.
  const LABELS = new Map(eras.flatMap((era, e) => [
    ...numbered([...era.foundation, ...(era.practice ?? [])], plan.requires).map((id, k) => [id, `${e}-${k + 1}`]),
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
  const axioms = [...new Set(TASKS.filter((t) => t.kind === 'machine').flatMap(axiomPartsOf))]
  // A level's reference boards, every task's (or a task's own, `task` its index), without what each board starts with.
  const answersOf = (l) => byId.get(l.id).tasks.filter((t) => (l.task === undefined || t.task === l.task) && t.solution?.nodes).map((t) => ({ ...t.solution, nodes: t.solution.nodes.filter((n) => !presetIds(t).includes(n.id)) }))
  // A course level is a level, or one of its tasks (`task`, its index): a level plays with its last task's tray.
  const taskOf = (l) => byId.get(l.id).tasks[l.task ?? byId.get(l.id).tasks.length - 1]
  // The proofs each lemma's shapes run: the proof tasks its references name.
  const taskById = new Map(TASKS.map((task) => [task.taskId, task]))
  const lemmaWorks = built.lemmaRefs.flatMap(({ type, form, task }) => {
    const one = taskById.get(task)
    if (one?.kind === 'proof') return [{ kind: 'lemma', type, form, task: one }]
    wrong.push(`parts.json's lemma ${type}${form ? ` (${form})` : ''} refers to task ${task}, which is no proof`)
    return []
  })
  references.register([
    ...rules, ...lemmaWorks,
    ...TASKS.filter((task) => task.kind === 'machine' && machines.includes(task.builds)).map((task) => ({ kind: 'machine', type: task.builds, form: null, task })),
    ...TASKS.filter((task) => task.kind === 'gates' && gates[task.builds]).map((task) => ({ kind: 'gate', type: task.builds, form: null, task })),
  ])
  const course = defineCourse({
    levels: LEVELS.map((l) => ({ id: l.id, unlocks: l.unlocks })),
    eras,
    trays,
    tray: (l) => trayIn(trays, taskOf(l).tray),
    primitives: [...primitives, ...axioms],
    concept: (p) => concept[p] ?? (axioms.includes(p) ? null : p),
    adds: (l) => byId.get(l.id).adds,
    needs: (p) => (isBuilt(p) ? `lemma:${p}` : null),
    local: (p) => local.includes(p) || axioms.includes(p),
    builds: (l) => (byId.get(l.id).builds ? [byId.get(l.id).builds] : []),
    // A shape an upgrade proves is held by the levels after it, and in its own level by the tasks after the one that
    // proves it (lemmaWorks).
    opens: (l) => Object.entries(revisions).flatMap(([type, list]) => list.filter((r) => r.by === l.id).flatMap((r) => r.forms ?? [])
      .filter((form) => l.task === undefined || references.resolve(type, form, null, { kind: 'lemma', reference: true })?.task.task < l.task).map((form) => itemOf(type, 'form', form))),
    // On a machine board, the rule parts of the task's rule book among the parts met, whatever its tray lists.
    gives: (l) => {
      const task = byId.get(l.id).tasks[l.task]
      if (task?.kind !== 'machine') return []
      const rules = ruleTypes(task)
      return met(course, l).filter((p) => rules.has(p) && !machineParts[p])
    },
    withholds: (l) => byId.get(l.id).tasks[l.task]?.without ?? [],
    machine: (l) => eras[eraOf.get(l.id)].machine ?? null,
    naive: (l) => byId.get(l.id).tasks.some((task) => task.naive),
    // Every task's answer counts: a part the level's first task uses is used; what its board starts with does not.
    needed: (l) => {
      const answers = answersOf(l)
      return answers.length ? answers.flatMap(rulesIn) : null
    },
    // A declaration's answer is the rules it declares: writing them puts them to work, and so does a level working on
    // a declared connective (checking a declaration, too strong or too weak), named by `declare` as where it is declared.
    declares: (l) => (byId.get(l.id).declare ? references.resolve(byId.get(l.id).declare.zh, null, null, { kind: 'declaration', reference: true })?.value ?? [] : []),
    references,
    boards: answersOf,
    showcase: (l) => byId.get(l.id).showcase ?? null,
    abstraction: true,
  })
  for (const one of TASKS) {
    const source = tasksOf.get(one.id)[one.task]
    for (const [kind, names, action] of [['type', source.types, 'declared'], ['function', source.defs, 'defined']]) {
      for (const type of names ?? []) {
        if (!references.prior(kind, one).some((entry) => entry === declaration(kind, type, one.id))) {
          throw new Error(`level ${one.id} names the ${kind} ${type} before it is ${action}`)
        }
      }
    }
  }
  for (const { type, form, task } of references.entriesOf('lemma')) {
    const shapes = lemmaPieces[type] ??= {}
    shapes[form] = { level: task, board: () => kept.board(task.taskId) ?? task.solution }
  }
  // A machine level's (and a script's) rule book has every rule the level has met, whatever its tray (machine.js
  // ruleBookOf): the kernel's rules opened by chapter, the lemmas built before it, each in the shapes it has gained by
  // then. A task after the first may use what its level proves already (a law proved on the proof board, then put to
  // work), in every shape it proves.
  for (const level of LEVELS.filter((l) => l.tasks.some((t) => t.kind === 'machine' || t.kind === 'script'))) {
    // The equations proved before it (by the levels it comes after), and in a later task its own.
    const proven = Object.keys(facts).filter((type) => references.prior('fact', { id: level.id, task: 0 }).some((entry) => entry.type === type))
    for (const one of level.tasks) {
      const later = one.task > 0
      // A task has what the tasks before it in its level proved.
      const before = references.prior('fact', one).filter(({ task }) => task.id === one.id).map(({ type }) => type)
      one.holds = met(course, { id: level.id, task: one.task })
      one.proven = [...new Set([...proven, ...before, ...(later && level.fact ? [level.fact] : [])])]
      const has = holds(course, { id: level.id, task: one.task }, new Set())
      one.forms = Object.fromEntries(Object.entries(lemmas).filter(([, l]) => l.forms).map(([type, l]) => [type, l.forms.map((f) => f.key).filter((key) => has(type, 'form', key))]))
    }
  }
  // A built machine part's ports are the inputs of the board of the first task it refers to.
  const builtPorts = Object.fromEntries(machines.map((type) => [type, inputsOfLevel(taskById.get(built.pieces[type].inside[0].task)).map((i) => i.name)]))
  // A machine's answers are read now that its rule book, and so its rule parts, are known.
  for (const one of TASKS.filter((t) => t.kind === 'machine')) {
    const rules = ruleTypes(one)
    const shape = machineShape((type) => machineParts[type] ?? (builtPorts[type] ? { inputs: builtPorts[type] } : rules.has(type) ? RULE_ENGINE : undefined))
    const types = [...Object.keys(machineParts), ...Object.keys(builtPorts), ...rules.keys()]
    for (const field of ['solution', 'naive']) if (one[field]) one[field] = board(one, field, startMachine(one), shape, types)
  }
  // The gates the levels build run their boards (gates.js builtGates).
  const gateBuilders = Object.fromEntries(references.entriesOf('gate').map(({ type, task }) => [type, task]))
  Object.assign(gatePieces, builtGates(gates, gateBuilders, kept.board))
  Object.assign(boardGates, gatePieces)
  // Machine cards share a packed instance when their visible sequence of references is the same.
  const running = new Map()
  const machineTypes = [...new Set(references.entriesOf('machine').map(({ type }) => type))]
  for (const one of TASKS) {
    const has = holds(course, one, new Set())
    const part = (type, strict) => {
      const options = { strict, reference: true, kind: 'machine' }
      const reference = has.inside(type, null, options)?.task
      if (!reference) return null
      const key = JSON.stringify([type, strict, reference.taskId])
      if (!running.has(key)) {
        const builder = () => has.inside(type, null, { strict, kind: 'machine' }).task
        running.set(key, builtMachine(type, builder, reference, kept.board, settingsOf(built.pieces[type]).map((x) => x.key)))
      }
      return running.get(key)
    }
    one.built = Object.fromEntries(machineTypes.map((type) => [type, part(type, false)]))
    if (one.kind === 'machine' && machineTypes.includes(one.builds)) one.upgrades = part(one.builds, true) ?? undefined
    // What a machine (and a script's `by`) runs: the board's own cards, the parts built, the machine's and rule parts.
    if (one.kind === 'machine' || one.kind === 'script') one.parts = (type) => MACHINE_BOARD.FIXED_PARTS[type] ?? (builtPorts[type] ? one.built[type] ?? undefined : machineParts[type] ?? RULE_ENGINE)
  }
  const at = (task) => ({ id: task.id, task: task.task })
  // The parts a machine task has built, named.
  const builtOf = (task) => Object.fromEntries(Object.entries(task?.built ?? {}).filter(([, p]) => p).map(([type, p]) => [type, { ...p, name: built.pieces[type].name, desc: built.pieces[type].desc }]))
  // The parts a machine task registers itself: its rule parts, and a built part's face where it takes settings.
  const pieces = new WeakMap()
  const piecesOf = (task) => {
    if (!pieces.has(task)) pieces.set(task, defineParts({ parts: { ...rulePieces(task), ...builtFaces(task) } }, OPS).defs)
    return pieces.get(task)
  }
  const builtFaces = (task) => Object.fromEntries(Object.entries(task.built ?? {}).filter(([type, p]) => p && settingsOf(built.pieces[type]).length).map(([type, p]) => {
    const { name, desc, settings } = built.pieces[type]
    return [type, { name, desc, icon: 'CircuitBoard', family: 'built', inputs: p.inputs.map((port) => ({ name: port, ...(port === 'rules' ? { label: T('规则', 'Rules') } : {}) })), settings, compute: '0' }]
  }))
  /** What a task's tray holds for a player with `flags`, as what it shows and what it folds away. */
  const offerIn = (task, flags) => offer(course, at(task), flags)
  /** Whether a task holds a part, or a shape of one: has(part), has(part, 'form', shape) (../../course.js holds). */
  const holdsIn = (task, flags) => holds(course, at(task), flags)
  // The truth circuits as the kernel's circuit screen reads them (gates.js gateCourse).
  const truthCircuits = gateCourse({ built: gatePieces, builders: gateBuilders, offerIn, holdsIn, syncOwn: kept.sync })
  // The proofs, the same way: their parts are the proof rules and the lemmas (proofParts).
  const proofBoards = boardView({ board: PROOF_BOARD, parts: () => proofParts, offerIn, holdsIn, syncOwn: kept.sync })
  // The machines: the parts the player built as packed parts, a task's rule parts registered for it.
  const machineBoards = boardView({
    board: MACHINE_BOARD,
    parts: (task) => ({ ...machineParts, ...Object.fromEntries([...ruleTypes(task).keys()].filter((t) => !machineParts[t]).map((t) => [t, RULE_ENGINE])), ...builtOf(task) }),
    built: builtOf,
    builder: (type, task) => task?.built?.[type]?.opens().level ?? null,
    defined: (task) => ({ of: (type) => piecesOf(task)[type] ?? defs[type] ?? null, defaults: (type) => (piecesOf(task)[type] ? {} : defaultsOf(type)), ops: OPS }),
    offerIn,
    holdsIn,
    syncOwn: kept.sync,
    // A machine level that upgrades a part opens on the board that part runs; a preset stays locked in.
    opening: (task) => {
      const from = task.upgrades?.opens().circuit
      return withPreset(from && MACHINE_BOARD.fits(from, task, machineBoards.forTask(task).partOf) ? from : startMachine(task), presetFor(task))
    },
  })
  function workReferences(task, work) {
    if (!task) return []
    const source = tasksOf.get(task.id)?.[task.task]
    const named = [
      ...(source?.types ?? []).map((type) => declaration('type', type, task.id)),
      ...(source?.defs ?? []).map((type) => declaration('function', type, task.id)),
      ...references.prior('fact', task).filter(({ type }) => task.proven?.includes(type)),
    ].map((entry) => {
      const source = entry.task
      const builder = LEVELS.find(({ id }) => id === source.id)?.tasks[source.task]
      const work = entry.value?.() ?? facts[entry.type]?.statement ?? builder?.solution
      return { key: source.taskId, task: builder, work }
    })
    const boards = (work?.nodes ?? []).flatMap((node) => {
      const open = (task.built?.[node.type] ?? gatePieces[node.type])?.opens?.()
      if (open) return [{ key: open.level.taskId, task: open.level, work: open.circuit }]
      const proof = lemmaPieces[node.type]?.[node.params?.form ?? (lemmas[node.type]?.forms?.[0]?.key ?? '')]
      return proof && !lemmas[node.type]?.card ? [{ key: proof.level.taskId, task: proof.level, work: proof.board() }] : []
    })
    return [...named, ...boards]
  }
  return { machineBoards, LEVELS, CHAPTERS, LABELS, course, workReferences, offerIn, holdsIn, machines, revisions, lemmas, facts, pieces: built.pieces, texts: { lemmas, facts, gates, revisions }, proofs: lemmaPieces, gates: gatePieces, defs, defaultsOf, truthCircuits, proofBoards, provers: new Set(lemmaWorks.map(({ task }) => task.id)), blueprints, wrong, syncOwn: kept.sync }
}
