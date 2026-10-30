// Declaring something new (《证明完毕》's declaration boards: the connectives in chapter 3, "there is" and = with the
// quantifiers, the numbers before induction): by its ways to make it, each a rule of its own, written as the game
// writes every rule, ⟦A; B⟧ ⟹ A ∧ B. Three operations, the three marks of that notation, each card showing what it has
// made so far: a premise card is ⟦⟧ (it picks its sentence: ⟦A⟧); Join is ; (two lists into one: ⟦A; B⟧); a wire is ⟹
// (a list wired into a premise card makes a premise that carries premises of its own, ⟦⟦A⟧ ⟹ B⟧; wired into the
// declared card, the board's output, it is one way to make it, ⟦A; B⟧ ⟹ A ∧ B, and each input that card is given
// brings one more). A thing card takes any thing, named on the level (x), which the sentences joined after it may
// mention (a way that takes a thing is a rule for any thing: ⋀x. ⟦x is human⟧ ⟹ ∃y. y is human); a card assuming
// nothing makes a way that needs nothing. A declared rule has no proof inside, so it is drawn as cards, not as the
// proof board's boxes.
//
// The way to take it apart is not written: the ways in are all the ways there are, so it is made from them
// (declaredRules), a case for every way, numbered as the ways are, which gets back just what that way took. Chapter 12
// has the player build the machine that makes it (elimgen.js).
//
// A test is a test case (检验条例): what is given, a goal (the declared sentence unless it says, or a sentence of its
// shape when the declared sentence mentions a thing: "the Morning Star = the Morning Star"), and whether the goal
// should be derivable (derives). When the declared sentence is not given and the goal is of its shape, an intro rule
// must make it: the way using the most of what is given makes it (the first such), with the things its thing cards
// take found among the level's (`things`). When the declared sentence is given, the elimination rule made from the
// player's ways decides (follows): a case for each way, given what that way took, and Apply on what is given; the
// goal follows when every case reaches it. A sentence nothing else mentions stands for any sentence R, so these cases
// show the declared sentence gives just what its ways in give: no more, no less. A specification is tested on cases,
// not proved.
//
// Checking or correcting by the diagram (`play`, ../../shell/useBoardCases.js): the level's test cases are boards
// (`boards: [{ board }]`), each someone's declaration that is wrong. In 'audit' they are locked and the player writes
// the test cases instead (judgeCases), in the same form as the level's. Each expectation is judged by the level's
// reference answer, so a case that says what the requirement does not mean is wrong; a board passes when every
// expectation is right and the board goes wrong on one of them. Fewer cases is the better score. In 'repair' each
// board is the player's to correct, judged by the level's test cases as a declaration is.
//
// A level: { kind: 'iso', declare: { zh, en } its name, target: its sentence (with a thing's name where a way takes
// one: 'x = x'), sentences: [sentence] an assumption card may pick (letters, or sentences like "A → B" or "Human(x)"),
// things: [name] the things of the level, binder: the name a thing card gives ('x' unless it says), tests: [{ given:
// [sentence], goal?: sentence, make: bool (derivable or not), uses?: [sentence] what the way it is made by must take }],
// play: 'audit' | 'repair' with boards:
// [{ label?, board }] someone's declarations to find the fault in or to correct, answer: [test] the reference cases
// for an audit, slots: how many cases are set out to fill in, caseGoal, caseMake: the
// goal and the expectation every case of an audit has (the player cannot change them), tray: the cards it
// offers (['hyp'] unless it says: 'hyp', 'thing', 'none'), ways: the rules the declaration must have, when the
// situations alone cannot tell (a way's assumptions in order, [[sentence]]), take: the rule that takes it apart, when
// it is not the plain cases (a family indexed by things, as =): { premises: [text], conclusion: text } in metavariables
// (schematic.js), datatype: the type it declares (chapter 12, typeOf), whose rules the kernel makes (datatype.js) }.
import { runBoard } from '../../engine/boards.js'
import { meta, parse, show, subst as substF } from './formula.js'
import { premisesText, ruleOf, ruleText } from './schematic.js'

const T = (zh, en) => ({ zh, en })
export const DECL = 'decl'
const MOST = 3
const wayPort = (k) => `c${k}`
const cardId = (token) => `hyp-${token}`

/** How many ways the declared card has wired (its inputs are one more, up to three). */
export const waysOf = (node) => node.params?.ways ?? 0
export const declInputs = (node) => Array.from({ length: Math.min(MOST, waysOf(node) + 1) }, (_, k) => wayPort(k + 1))

/** A sentence of the level, its things read as names (not variables). */
export const sentenceOf = (level, text) => parse(text, { consts: level.things ?? [] })
const keyOf = (f) => show(f)
const thing = (name) => ({ t: 'fn', f: name, args: [] })

// A sentence with the things in σ put in for their names.
function subst(x, σ) {
  if (Array.isArray(x)) return x.map((y) => subst(y, σ))
  if (!x || typeof x !== 'object') return x
  if (x.t === 'var' && σ[x.name]) return σ[x.name]
  return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, subst(v, σ)]))
}
// σ extended so that `pattern`, with `vars` free, is `inst`; null when it cannot be.
function match(pattern, inst, vars, σ) {
  if (pattern && pattern.t === 'var' && vars.has(pattern.name)) {
    if (σ[pattern.name]) return JSON.stringify(σ[pattern.name]) === JSON.stringify(inst) ? σ : null
    return { ...σ, [pattern.name]: inst }
  }
  if (Array.isArray(pattern)) {
    if (!Array.isArray(inst) || inst.length !== pattern.length) return null
    return pattern.reduce((s, p, k) => s && match(p, inst[k], vars, s), σ)
  }
  if (!pattern || typeof pattern !== 'object') return pattern === inst ? σ : null
  if (!inst || typeof inst !== 'object') return null
  const keys = new Set([...Object.keys(pattern), ...Object.keys(inst)])
  return [...keys].reduce((s, k) => s && match(pattern[k], inst[k], vars, s), σ)
}

const evidence = (sentence, n) => ({ kind: 'ev', sentence, n })
// A card's value: a list of premises in order, { kind: 'rule', steps }, each step a sentence needed ({ need }, with
// `under`: the steps it is needed under, ⟦⟦A⟧ ⟹ B⟧) or a thing taken ({ bind }). A way's needs are each a sentence, or
// { need, under: [needs] } for one needed under premises of its own.
const list = (steps) => ({ kind: 'rule', steps })
const needsOf = (rule) => rule.steps.filter((s) => s.need !== undefined).map((s) => (s.under ? { need: s.need, under: needsOf({ steps: s.under }) } : s.need))
const bindsOf = (rule) => rule.steps.filter((s) => s.bind !== undefined).map((s) => s.bind)
/** A need's sentence, and what it is needed under ([] for a plain one). */
export const needSentence = (n) => (typeof n === 'string' ? n : n.need)
export const needUnder = (n) => (typeof n === 'string' ? [] : n.under)

// Every way a rule is satisfied in a situation: the things it takes (from the goal it must match, then from the
// level's things) and the proofs at hand it needs, in the order the rule takes them.
function satisfy(rule, ctx) {
  const vars = new Set(bindsOf(rule))
  const start = ctx.goal ? match(ctx.target, ctx.goal, vars, {}) : {}
  if (!start) return null
  const open = [...vars].filter((v) => !start[v])
  const assignments = open.reduce((all, v) => all.flatMap((σ) => ctx.things.map((t) => ({ ...σ, [v]: thing(t) }))), [start])
  for (const σ of assignments) {
    // A way whose sentence still names a free thing does not make the goal's sentence.
    if (!ctx.goal && Object.keys(σ).length < vars.size) continue
    // A sentence needed under premises of its own is there when it is at hand or among those premises.
    const under = (s) => (s.under ?? []).some((u) => u.need !== undefined && keyOf(subst(ctx.read(u.need), σ)) === keyOf(subst(ctx.read(s.need), σ)))
    const items = rule.steps.map((s) => (s.bind !== undefined ? { kind: 'thing', name: σ[s.bind].f } : ctx.have.get(keyOf(subst(ctx.read(s.need), σ))) ?? (under(s) ? { kind: 'under', sentence: s.need } : null)))
    if (items.every(Boolean)) return items
  }
  return null
}

/** The engine's parts: premise cards, Join, thing cards, a card assuming nothing, and the declared card. */
export const ISO_PARTS = {
  // A premise card, ⟦A⟧: its sentence; with a list wired into its port, a premise needing those first, ⟦⟦…⟧ ⟹ A⟧.
  hyp: { inputs: ['under'], optional: ['under'], bare: true, eval: ({ under }, node) => list([{ need: node.params.name, ...(under && { under: under.steps }) }]) },
  // Join, ;: the first list, then the second.
  join: { inputs: ['a', 'b'], bare: true, eval: ({ a, b }) => list([...a.steps, ...b.steps]) },
  // A thing card: any thing, by its name.
  thing: { inputs: [], bare: true, eval: (_, node) => list([{ bind: node.params.name }]) },
  // Assuming nothing: a way that needs no proof.
  none: { inputs: [], bare: true, eval: () => list([]) },
  // The declared sentence is made by the way using the most of what is at hand (the first such); with none, it is not.
  [DECL]: {
    inputs: declInputs,
    optional: Array.from({ length: MOST }, (_, k) => wayPort(k + 1)),
    bare: true,
    eval: (ins, node, ctx) => {
      if (!ctx.bind?.have) return null
      let best = null
      for (const [k, port] of declInputs(node).entries()) {
        const items = ins[port] && satisfy(ins[port], ctx.bind)
        if (items && (!best || items.length > best.items.length)) best = { kind: 'proof', way: k + 1, items }
      }
      return best
    },
  },
}

/**
 * The board as the kernel keeps it: the declared card's wired ways numbered from 1 with no gaps, and one input more
 * for the next.
 */
export function settle(graph) {
  const decl = graph.nodes.find((n) => n.id === DECL)
  if (!decl) return graph
  const ways = graph.wires.filter((w) => w.to === DECL).sort((a, b) => Number(a.port.slice(1)) - Number(b.port.slice(1)))
  const renumber = new Map(ways.map((w, k) => [w, wayPort(k + 1)]))
  const n = ways.length
  return {
    ...graph,
    nodes: graph.nodes.map((x) => (x.id === DECL ? { ...x, params: { ...x.params, ways: n } } : x)),
    wires: [...graph.wires.filter((w) => w.to !== DECL), ...ways.map((w) => ({ ...w, port: renumber.get(w) }))],
  }
}

/** What the board gives in one test: the engine's values, and the declared sentence (or null). */
export function runIso(level, circuit, test) {
  const read = (s) => sentenceOf(level, s)
  const have = new Map((test.given ?? []).map((s, n) => [keyOf(read(s)), evidence(s, n + 1)]))
  const bind = { have, read, things: level.things ?? [], target: read(level.target), goal: test.goal ? read(test.goal) : null }
  const run = runBoard(circuit, { parts: ISO_PARTS, bind })
  const made = run.values.get(DECL) ?? null
  return { ...run, made }
}

/**
 * Whether `get` follows from the declared sentence and `holds`, by its elimination rule (one case per way, a thing a
 * way takes named afresh) with Apply, Take one (on the things known) and Example (for a goal "there is").
 */
export function follows(level, circuit, test) {
  const read = (s) => sentenceOf(level, s)
  const things = (level.things ?? []).map(thing)
  // Everything those rules reach from the facts, with these things to take.
  const reach = (facts, own) => {
    const known = new Map(facts.map((f) => [keyOf(f), f]))
    const add = (f) => !known.has(keyOf(f)) && known.set(keyOf(f), f)
    let grew = true
    while (grew) {
      const size = known.size
      for (const f of [...known.values()]) {
        if (f.op === '→' && known.has(keyOf(f.a))) add(f.b)
        if (f.op === '∀') for (const t of [...things, ...own]) add(substF(f.body, f.v, t))
      }
      grew = known.size > size
    }
    return known
  }
  const goal = read(test.goal)
  const reached = (known, own) => known.has(keyOf(goal)) || (goal.op === '∃' && [...things, ...own].some((t) => known.has(keyOf(substF(goal.body, goal.v, t)))))
  const start = test.given.map(read)
  if (reached(reach(start, []), [])) return true
  if (!test.given.some((s) => keyOf(read(s)) === keyOf(read(level.target)))) return false
  // What a case hands back: each sentence its way took, one needed under premises as the rule it is (A → B to Apply).
  const handed = (n) => needUnder(n).reduceRight((b, u) => ({ op: '→', a: read(needSentence(u)), b }), read(needSentence(n)))
  return waysIn(circuit).every((w, k) => {
    const own = w.binds.map((b) => thing(`${b}${k + 1}′`))
    const σ = Object.fromEntries(w.binds.map((b, j) => [b, own[j]]))
    return reached(reach([...start, ...w.needs.map((n) => subst(handed(n), σ))], own), own)
  })
}

/**
 * A type a declaration board declares (chapter 12, `datatype: { type, ctors, args }`): the k-th way is the constructor
 * ctors[k], its thing cards elements and each assumption the type args[sentence] names: 'zero | s(nat)'.
 */
export function typeOf(level) {
  const { ctors, args } = level.datatype
  return waysIn(level.solution).map((way, k) => {
    const of = [...way.binds.map(() => 'elem'), ...way.needs.map((s) => args[s])]
    return of.length ? `${ctors[k]}(${of.join(', ')})` : ctors[k]
  }).join(' | ')
}

/** The rules wired into the declared card, in the order of its ways: { needs, binds } each, in the order taken. */
export function waysIn(circuit) {
  const run = runBoard(circuit, { parts: ISO_PARTS, bind: {} })
  const decl = circuit.nodes.find((n) => n.id === DECL)
  return declInputs(decl).flatMap((port) => {
    const wire = circuit.wires.find((w) => w.to === DECL && w.port === port)
    const rule = wire && run.values.get(wire.from)
    return rule ? [{ needs: needsOf(rule), binds: bindsOf(rule) }] : []
  })
}

/**
 * Whether a test's goal is derivable on this board: { derived, made? }. An intro rule must make it (made: the way and
 * what it took) when the declared sentence is not given and the goal is of its shape; otherwise the elimination rule
 * and Apply decide (follows).
 */
export function derives(level, circuit, test) {
  const read = (s) => sentenceOf(level, s)
  const target = read(level.target)
  const goal = test.goal ? read(test.goal) : target
  const given = test.given.map((s) => keyOf(read(s)))
  const shape = (f) => [f.op, f.pred, f.v !== undefined].join('|')
  if (test.uses || (!given.includes(keyOf(target)) && shape(goal) === shape(target))) {
    const made = runIso(level, circuit, { given: test.given, goal: test.goal && keyOf(goal) !== keyOf(target) ? test.goal : null }).made
    return { derived: Boolean(made), made }
  }
  if (given.includes(keyOf(goal))) return { derived: true }
  return { derived: follows(level, circuit, { given: test.given, goal: test.goal ?? level.target }) }
}

/** A test's premises, as a phrase: 前提为「下雨」、「刮风」 (or 没有前提). */
const cap = (text) => text[0].toUpperCase() + text.slice(1)
const givenText = (test, words) => {
  const has = test.given.map(words)
  return has.length
    ? T(`前提为${has.map((h) => `「${h.zh}」`).join('、')}`, `with the premises ${has.map((h) => `“${h.en}”`).join(', ')}`)
    : T('没有前提', 'with no premises')
}

/**
 * Every test checked: { pass, results: [{ pass, reason, derived, made? }], ways }; words(sentence) gives a sentence's
 * words. `ways` says why the rules are not the ones the level asks for (level.ways), when every test is right.
 */
export function checkIso(level, circuit, words) {
  const name = level.declare
  const results = level.tests.map((test) => {
    const got = derives(level, circuit, test)
    const at = givenText(test, words)
    const what = test.goal ? words(test.goal) : name
    if (got.derived !== test.make) {
      const reason = test.make
        ? T(`${at.zh}时，「${what.zh}」应当可推导，这份声明却推导不出。`, `${cap(at.en)}, “${what.en}” should be derivable, but this declaration does not derive it.`)
        : T(`${at.zh}时，「${what.zh}」不应当可推导，这份声明却推导出了它。`, `${cap(at.en)}, “${what.en}” should not be derivable, but this declaration derives it.`)
      return { pass: false, reason, ...got }
    }
    // A way that takes what is given, where the test asks for one.
    const taken = new Set((got.made?.items ?? []).filter((x) => x.kind === 'ev').map((x) => x.sentence))
    const unused = (test.uses ?? []).filter((s) => !taken.has(s)).map(words)
    const pass = !unused.length
    return { pass, reason: pass ? null : T(`推导出了「${what.zh}」，但用到的引入规则没有用上前提${unused.map((u) => `「${u.zh}」`).join('、')}。`, `“${what.en}” is derived, but by an intro rule that does not take the premise ${unused.map((u) => `“${u.en}”`).join(', ')}.`), ...got }
  })
  // A way as written in `ways`: what it takes in order, a thing as '⋀x'.
  const flat = (n) => (typeof n === 'string' ? n : `[${n.under.map(flat).join('|')}]${n.need}`)
  const key = (ways) => ways.map((w) => w.map((s) => (s.startsWith('⋀') ? '⋀' : s)).join('|')).sort().join('/')
  const said = (s) => (s.startsWith('⋀') ? T('任取一样东西', 'any thing') : words(s))
  const ways = level.ways && key(waysIn(circuit).map((w) => [...w.binds.map((b) => `⋀${b}`), ...w.needs.map(flat)])) !== key(level.ways)
    ? T(`每条条例都正确，但引入规则与要求不符：${level.ways.map((w) => `⟦${w.map((s) => said(s).zh).join('; ')}⟧ ⟹ 「${name.zh}」`).join('；')}`, `Every test case is right, but the intro rules are not the ones asked for: ${level.ways.map((w) => `⟦${w.map((s) => said(s).en).join('; ')}⟧ ⟹ “${name.en}”`).join('; ')}`)
    : null
  return { pass: results.every((r) => r.pass) && !ways, results, ways }
}

/** Every sentence a test case of the level may give or aim at: its cards' sentences, its declared one, and its tests'. */
export function propositionsOf(level) {
  const all = [...level.sentences, level.target, ...level.tests.flatMap((t) => [...t.given, ...(t.goal ? [t.goal] : [])])]
  return [...new Set(all)]
}

/**
 * The player's cases (tests, as the level's) against the level's boards (the play 'audit', ../../shell/useBoardCases.js):
 * { rows: [{ right, wants, derived: [per board] }], caught: [k of the case that catches each board, or -1], wrong: why the cases
 * themselves do not do (none yet, or an expectation the requirement does not mean), or null; judge(b): why board b
 * passes, or null }. A row is right when its expectation is what the reference answer gives; a board is caught by a
 * right row it answers otherwise.
 */
export function judgeCases(level, cases, words) {
  const name = level.declare
  const boards = level.boards.map((b) => b.board)
  const rows = cases.map((c) => {
    const wants = derives(level, level.solution, c).derived
    return { right: wants === c.make, wants, derived: boards.map((board) => derives(level, board, c).derived) }
  })
  const caught = boards.map((_, b) => rows.findIndex((r) => r.right && r.derived[b] !== r.wants))
  const bad = rows.findIndex((r) => !r.right)
  const goal = (c) => (c.goal ? words(c.goal) : name)
  const wrong = !cases.length ? T('还没有条例。请添加一条，写明前提、目标，以及目标是否应当可推导。', 'No test case yet. Add one, stating the premises, the goal, and whether the goal should be derivable.')
    : bad >= 0 ? T(`第 ${bad + 1} 条条例的预期与需求不符。请重新考虑：${givenText(cases[bad], words).zh}时，按需求「${goal(cases[bad]).zh}」是否可推导？`, `The expectation of case ${bad + 1} does not agree with the requirement. Reconsider: ${givenText(cases[bad], words).en}, is “${goal(cases[bad]).en}” derivable according to the requirement?`)
    : null
  const judge = (b) => wrong ?? (caught[b] >= 0 ? null : T('各条条例的预期都正确，但这份声明在每一条上都得出了正确结论，还没有暴露它的错误。', 'Every expectation is correct, but this declaration reaches the right conclusion on every case: its fault has not yet been revealed.'))
  return { rows, caught, wrong, judge }
}

const premise = (show, hyps = [], fixes = []) => ({ fixes, hyps, show })
// A need as a premise: its sentence, needed under its own premises (each a premise in turn).
const premiseFor = (n, level, g) => premise(g(sentenceOf(level, needSentence(n))), needUnder(n).map((u) => premiseFor(u, level, g)))
/**
 * A way as a rule: its assumptions in turn are the premises, the declared sentence the conclusion, and a way that
 * takes things is a rule for any of them (`fixes`): ⋀x. ⟦x is human⟧ ⟹ ∃y. y is human.
 */
export const wayRule = (way, level, g = (f) => f) => ({ fixes: way.binds, premises: way.needs.map((n) => premiseFor(n, level, g)), conclusion: g(sentenceOf(level, level.target)) })

/** A rule written out, with the things a way takes in front: ⋀x. ⟦x is human⟧ ⟹ ∃y. y is human. */
export const wayText = (rule, say) => `${rule.fixes?.length ? `⋀${rule.fixes.join(' ')}. ` : ''}${ruleText(rule, say)}`
/** What a card has made so far, as it is written before ⟹ in a rule: ⋀x. ⟦x is human⟧, ⟦⟦A⟧ ⟹ B⟧ ('' for none). */
export const listText = (value, level, say) => {
  const rule = wayRule(wayOf(value), level)
  return `${rule.fixes.length ? `⋀${rule.fixes.join(' ')}. ` : ''}${premisesText(rule.premises, say)}`
}
/** A rule's value on the board as a way: { needs, binds }. */
export const wayOf = (rule) => ({ needs: needsOf(rule), binds: bindsOf(rule) })

// The declared sentence's own letters and predicates, each a metavariable in turn (?A, ?B … for a sentence, ?P, ?Q …
// for one about things): the rules for any sentences, not just the level's. A new proposition (one whose sentence
// shares nothing with what it assumes) keeps its sentences.
function general(level) {
  const atoms = (f, out = []) => {
    if (f.op === 'atom') {
      if (f.pred !== '=' && !out.includes(f.pred)) out.push(f.pred)
      return out
    }
    for (const x of [f.a, f.b, f.body]) if (x) atoms(x, out)
    return out
  }
  const target = sentenceOf(level, level.target)
  const assumed = new Set(level.sentences.flatMap((s) => atoms(sentenceOf(level, s))))
  const props = []
  const preds = []
  const names = new Map()
  const arity = (f, p) => {
    if (f.op === 'atom') return f.pred === p ? f.args.length : null
    for (const x of [f.a, f.b, f.body]) if (x) { const n = arity(x, p); if (n !== null) return n }
    return null
  }
  for (const p of atoms(target).filter((l) => assumed.has(l))) {
    if (arity(target, p)) names.set(p, `?${'PQSTU'[preds.push(p) - 1]}`)
    else names.set(p, `?${'ABCDE'[props.push(p) - 1]}`)
  }
  const g = (f) => {
    if (f.op === 'atom') return names.has(f.pred) ? (f.args.length ? { op: 'meta', name: names.get(f.pred), args: f.args } : meta(names.get(f.pred))) : f
    return { ...f, ...(f.a && { a: g(f.a) }), ...(f.b && { b: g(f.b) }), ...(f.body && { body: g(f.body) }) }
  }
  return g
}

/**
 * What a declaration gives, for any sentences: one rule for each way to make it, and the rule that takes it apart,
 * made from them (having it, and for each way a conclusion ?R from what that way took, for any thing it took, gives
 * ?R), or the level's own (`take`: equality).
 */
export function declaredRules(level, ways) {
  const g = general(level)
  const R = meta('?R')
  return {
    make: ways.map((way) => wayRule(way, level, g)),
    take: level.take
      ? ruleOf('take', null, level.take.premises, level.take.conclusion)
      : { premises: [premise(g(sentenceOf(level, level.target))), ...ways.map((way) => premise(R, way.needs.map((n) => (needUnder(n).length ? premiseFor(n, level, g) : g(sentenceOf(level, n)))), way.binds))], conclusion: R },
  }
}

/** The board a level starts from: the declared card, with no way yet. */
export const startIso = () => ({ nodes: [{ id: DECL, type: DECL, params: { ways: 0 }, locked: true, x: 320, y: 40 }], wires: [] })

/** A card from the tray: an assumption of `sentence`, or a thing card naming its thing `name`. */
export const hypCard = (id, sentence, at) => ({ id, type: 'hyp', params: { name: sentence }, ...at })
export const thingCard = (id, name, at) => ({ id, type: 'thing', params: { name }, ...at })

/**
 * A reference board written compactly: isoBoard(['Rain+Wind>1']): premise cards of Rain and Wind joined, ⟦Rain; Wind⟧,
 * into the declared card's first way; 'Rain>Wet' wires Rain into the Wet card's port, ⟦⟦Rain⟧ ⟹ Wet⟧. A card is named
 * by its sentence, or by a key of `cards` ({ key: sentence }) when it is not a letter or two cards assume one sentence;
 * '∅' (or '∅1', '∅2' … for several) assumes nothing, and '⋀x' takes the thing x. Joins go left to right: 'A+B+C' is
 * (A; B); C.
 */
export function isoBoard(wires, cards = {}) {
  const pairs = wires.map((s) => s.split('>'))
  const tokens = [...new Set(pairs.flatMap(([from, to]) => [...from.split('+'), ...(/^\d$/.test(to) ? [] : [to])]))]
  const id = (token) => cardId(token.startsWith('∅') ? `none${token.slice(1)}` : token.startsWith('⋀') ? `thing-${token.slice(1)}` : token)
  const card = (token, k) => {
    const at = { x: 20, y: 40 + k * 200 }
    if (token.startsWith('∅')) return { id: id(token), type: 'none', params: {}, ...at }
    if (token.startsWith('⋀')) return thingCard(id(token), token.slice(1), at)
    return hypCard(id(token), cards[token] ?? token, at)
  }
  const joins = []
  const out = []
  // A join of several cards: one Join each step, left to right; its id, the last one's.
  const source = (from) => from.split('+').map(id).reduce((a, b) => {
    const j = `join-${joins.length + 1}`
    joins.push({ id: j, type: 'join', params: {}, x: 260, y: 40 + joins.length * 200 })
    out.push({ from: a, to: j, port: 'a' }, { from: b, to: j, port: 'b' })
    return j
  })
  for (const [from, to] of pairs) out.push(/^\d$/.test(to) ? { from: source(from), to: DECL, port: wayPort(Number(to)) } : { from: source(from), to: id(to), port: 'under' })
  const start = startIso()
  return settle({ nodes: [...start.nodes, ...tokens.map(card), ...joins], wires: out })
}
