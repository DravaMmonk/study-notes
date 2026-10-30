// Declaring something new (《证明完毕》's declaration boards: the connectives in chapter 3, "there is" and = with the
// quantifiers, the numbers before induction): by its ways to make it, each a rule of its own, written as the game
// writes every rule, ⟦A; B⟧ ⟹ A ∧ B. The player takes cards from the tray: an assumption card picks the sentence it
// assumes; a thing card takes any thing, named on the level (x), which the sentences after it may mention (a way that
// takes a thing is a rule for any thing: ⋀x. ⟦x is human⟧ ⟹ ∃y. y is human); a card assuming nothing makes a way that
// needs nothing. A card wired into another's "assumed first" makes one rule of both, read along the wire; a card
// wired into the declared card, the board's output, is one way to make it, and each input that card is given brings
// one more. Written as a proof these would be nested assumption boxes; a declared rule has no proof inside, so it is a
// chain of cards, its conclusion given by the declaration.
//
// The way to take it apart is not written: the ways in are all the ways there are, so it is made from them
// (declaredRules), a case for every way, numbered as the ways are, which gets back just what that way took. Chapter 12
// has the player build the machine that makes it (elimgen.js).
//
// A test is a situation: the proofs at hand (numbered: "it rains #1"), and whether the declared sentence can be
// proved from them, or a sentence of its shape (`goal`, when the declared sentence mentions a thing: "the Morning
// Star = the Morning Star"). When it can, the way using the most of what is at hand makes it (the first such), with
// the things its thing cards take found among the level's (`things`); when it cannot, nothing is made. A specification
// is tested on situations, not proved.
//
// A situation may also use it (`get`): with the declared sentence at hand, and `holds` besides, does `get` follow? The
// elimination rule made from the player's ways decides (follows): a case for each way, given what that way took, and
// Apply on what is at hand; `get` follows when every case reaches it. A sentence nothing else mentions stands for any
// sentence R, so these rows show the declared sentence gives just what its ways in give: no more, no less.
//
// Checking or correcting by the diagram (`play`, ../../shell/useBoardCases.js): the level's test cases are boards
// (`boards: [{ board }]`), each someone's declaration that is wrong. In 'audit' they are locked and the player writes
// the situations instead (judgeCases): each the proofs at hand and whether, as the requirement means it, the declared
// sentence should be proved. Each expectation is judged by the level's reference answer, so a row that says what the
// requirement does not mean is wrong; a board passes when every expectation is right and the board goes wrong on one
// of them. Fewer cases is the better score. In 'repair' each board is the player's to correct, judged by the level's
// situations as a declaration is.
//
// A level: { kind: 'iso', declare: { zh, en } its name, target: its sentence (with a thing's name where a way takes
// one: 'x = x'), sentences: [sentence] an assumption card may pick (letters, or sentences like "A → B" or "Human(x)"),
// things: [name] the things of the level, binder: the name a thing card gives ('x' unless it says), tests: [{ have:
// { sentence: n }, goal?, make: bool, uses?: [sentence] what the way it is made by must take } | { holds?: [sentence], get,
// make: bool }], play: 'audit' | 'repair' with boards:
// [{ label?, board }] someone's declarations to find the fault in or to correct, answer: [{ have, make }] the reference
// cases for an audit, tray: the cards it
// offers (['hyp'] unless it says: 'hyp', 'thing', 'none'), ways: the rules the declaration must have, when the
// situations alone cannot tell (a way's assumptions in order, [[sentence]]), take: the rule that takes it apart, when
// it is not the plain cases (a family indexed by things, as =): { premises: [text], conclusion: text } in metavariables
// (schematic.js), datatype: the type it declares (chapter 12, typeOf), whose rules the kernel makes (datatype.js) }.
import { runBoard } from '../../engine/boards.js'
import { meta, parse, show, subst as substF } from './formula.js'
import { ruleOf, ruleText } from './schematic.js'

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
const needsOf = (rule) => rule.steps.filter((s) => s.need !== undefined).map((s) => s.need)
const bindsOf = (rule) => rule.steps.filter((s) => s.bind !== undefined).map((s) => s.bind)
const chain = (before, step) => ({ kind: 'rule', steps: [...(before?.steps ?? []), ...(step ? [step] : [])] })

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
    const items = rule.steps.map((s) => (s.bind !== undefined ? { kind: 'thing', name: σ[s.bind].f } : ctx.have.get(keyOf(subst(ctx.read(s.need), σ)))))
    if (items.every(Boolean)) return items
  }
  return null
}

/** The engine's parts: assumption cards, thing cards, a card assuming nothing, and the declared card. */
export const ISO_PARTS = {
  // An assumption gives a rule: whatever is wired into its "assumed first", then its own sentence.
  hyp: { inputs: ['before'], optional: ['before'], bare: true, eval: ({ before }, node) => chain(before, { need: node.params.name }) },
  // A thing card: what is wired before it, then any thing, by its name.
  thing: { inputs: ['before'], optional: ['before'], bare: true, eval: ({ before }, node) => chain(before, { bind: node.params.name }) },
  // Assuming nothing: a way that needs no proof.
  none: { inputs: [], bare: true, eval: () => chain(null, null) },
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
  const have = new Map(Object.entries(test.have ?? {}).map(([s, n]) => [keyOf(read(s)), evidence(s, n)]))
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
  const goal = read(test.get)
  const reached = (known, own) => known.has(keyOf(goal)) || (goal.op === '∃' && [...things, ...own].some((t) => known.has(keyOf(substF(goal.body, goal.v, t)))))
  const start = [read(level.target), ...(test.holds ?? []).map(read)]
  if (reached(reach(start, []), [])) return true
  return waysIn(circuit).every((w, k) => {
    const own = w.binds.map((b) => thing(`${b}${k + 1}′`))
    const σ = Object.fromEntries(w.binds.map((b, j) => [b, own[j]]))
    return reached(reach([...start, ...w.needs.map((s) => subst(read(s), σ))], own), own)
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
 * Every test checked: { pass, results: [{ pass, reason, made, got? }], ways }; words(sentence) gives a sentence's
 * words. `ways` says why the rules are not the ones the level asks for (level.ways), when every situation is right.
 */
export function checkIso(level, circuit, words) {
  const name = level.declare
  const results = level.tests.map((test) => {
    const run = runIso(level, circuit, test)
    if (test.get) {
      const got = follows(level, circuit, test)
      const has = [level.target, ...(test.holds ?? [])].map(words)
      const at = T(has.map((h) => `「${h.zh}」`).join('、'), has.map((h) => `“${h.en}”`).join(', '))
      const what = words(test.get)
      const reason = got === test.make ? null : test.make
        ? T(`手里有${at.zh}，应该推得出「${what.zh}」，按这份声明却推不出`, `With ${at.en} at hand, “${what.en}” should follow, yet by this declaration it does not`)
        : T(`手里有${at.zh}，按这份声明竟推得出「${what.zh}」：它给得太多了`, `With ${at.en} at hand, this declaration gives “${what.en}”: it gives too much`)
      return { pass: !reason, reason, ...run, got }
    }
    const has = Object.keys(test.have).map(words)
    const at = T(has.map((h) => h.zh).join('、') || '什么都没有', has.map((h) => h.en).join(', ') || 'nothing')
    const what = test.goal ? words(test.goal) : name
    if (!test.make) {
      const pass = !run.made
      return { pass, reason: pass ? null : T(`手里只有${at.zh}，也证出了「${what.zh}」`, `With only ${at.en} at hand, “${what.en}” is proved`), ...run }
    }
    if (!run.made) return { pass: false, reason: T(`手里有${at.zh}，却证不出「${what.zh}」`, `With ${at.en} at hand, “${what.en}” is not proved`), ...run }
    // A way that takes what is at hand, where the situation asks for one (the next number from the one at hand).
    const taken = new Set(run.made.items.filter((x) => x.kind === 'ev').map((x) => x.sentence))
    const unused = (test.uses ?? []).filter((s) => !taken.has(s)).map(words)
    const pass = !unused.length
    return { pass, reason: pass ? null : T(`证出了「${what.zh}」，可用的引入规则没有用上手里的${unused.map((u) => u.zh).join('、')}`, `“${what.en}” is proved, but by a way that does not take the ${unused.map((u) => u.en).join(', ')} at hand`), ...run }
  })
  // A way as written in `ways`: what it takes in order, a thing as '⋀x'.
  const key = (ways) => ways.map((w) => w.map((s) => (s.startsWith('⋀') ? '⋀' : s)).join('|')).sort().join('/')
  const said = (s) => (s.startsWith('⋀') ? T('任取一样东西', 'any thing') : words(s))
  const ways = level.ways && key(waysIn(circuit).map((w) => [...w.binds.map((b) => `⋀${b}`), ...w.needs])) !== key(level.ways)
    ? T(`每种情况都对，但引入规则不是要求的那样：${level.ways.map((w) => `⟦${w.map((s) => said(s).zh).join('; ')}⟧ ⟹ 「${name.zh}」`).join('；')}`, `Every situation is right, but the ways are not the ones asked for: ${level.ways.map((w) => `⟦${w.map((s) => said(s).en).join('; ')}⟧ ⟹ “${name.en}”`).join('; ')}`)
    : null
  return { pass: results.every((r) => r.pass) && !ways, results, ways }
}

/** A case the player writes, as a test: the sentences at hand numbered in order. */
export const caseTest = (c) => ({ have: Object.fromEntries(c.have.map((s, k) => [s, k + 1])), make: c.make })

/**
 * The player's cases against the level's boards (the play 'audit', ../../shell/useBoardCases.js): { rows: [{ right,
 * wants, made: [made per board] }], caught: [k of the case that catches each board, or -1], wrong: why the cases
 * themselves do not do (none yet, or an expectation the requirement does not mean), or null; judge(b): why board b
 * passes, or null }. A row is right when its expectation is what the reference answer gives; a board is caught by a
 * right row it answers otherwise.
 */
export function judgeCases(level, cases, words) {
  const name = level.declare
  const boards = level.boards.map((b) => b.board)
  const rows = cases.map((c) => {
    const test = caseTest(c)
    const wants = Boolean(runIso(level, level.solution, test).made)
    return { right: wants === c.make, wants, made: boards.map((board) => runIso(level, board, test).made) }
  })
  const caught = boards.map((_, b) => rows.findIndex((r) => r.right && Boolean(r.made[b]) !== r.wants))
  const at = (c) => {
    const has = c.have.map(words)
    return T(has.map((h) => `「${h.zh}」`).join('、') || '什么都没有', has.map((h) => `“${h.en}”`).join(', ') || 'nothing')
  }
  const bad = rows.findIndex((r) => !r.right)
  const wrong = !cases.length ? T(`还没有条例。请添加一条，写明手里有哪些证明，以及此时能否引入「${name.zh}」。`, `No test case yet. Add one, stating which proofs are held and whether “${name.en}” may then be introduced.`)
    : bad >= 0 ? T(`第 ${bad + 1} 条条例的预期与需求不符。请重新考虑：手里有${at(cases[bad]).zh}时，按需求能否引入「${name.zh}」？`, `The expectation of case ${bad + 1} does not agree with the requirement. Reconsider: with ${at(cases[bad]).en} held, may “${name.en}” be introduced according to the requirement?`)
    : null
  const judge = (b) => wrong ?? (caught[b] >= 0 ? null : T('各条条例的预期都正确，但这份声明在每一条上都得出了正确结论，还没有暴露它的错误。', 'Every expectation is correct, but this declaration reaches the right conclusion on every case: its fault has not yet been revealed.'))
  return { rows, caught, wrong, judge }
}

const premise = (show, hyps = [], fixes = []) => ({ fixes, hyps, show })
/**
 * A way as a rule: its assumptions in turn are the premises, the declared sentence the conclusion, and a way that
 * takes things is a rule for any of them (`fixes`): ⋀x. ⟦x is human⟧ ⟹ ∃y. y is human.
 */
export const wayRule = (way, level, g = (f) => f) => ({ fixes: way.binds, premises: way.needs.map((s) => premise(g(sentenceOf(level, s)))), conclusion: g(sentenceOf(level, level.target)) })

/** A rule written out, with the things a way takes in front: ⋀x. ⟦x is human⟧ ⟹ ∃y. y is human. */
export const wayText = (rule, say) => `${rule.fixes?.length ? `⋀${rule.fixes.join(' ')}. ` : ''}${ruleText(rule, say)}`
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
      : { premises: [premise(g(sentenceOf(level, level.target))), ...ways.map((way) => premise(R, way.needs.map((s) => g(sentenceOf(level, s))), way.binds))], conclusion: R },
  }
}

/** The board a level starts from: the declared card, with no way yet. */
export const startIso = () => ({ nodes: [{ id: DECL, type: DECL, params: { ways: 0 }, locked: true, x: 320, y: 40 }], wires: [] })

/** A card from the tray: an assumption of `sentence`, or a thing card naming its thing `name`. */
export const hypCard = (id, sentence, at) => ({ id, type: 'hyp', params: { name: sentence }, ...at })
export const thingCard = (id, name, at) => ({ id, type: 'thing', params: { name }, ...at })

/**
 * A reference board written compactly: isoBoard(['Rain>Wind', 'Wind>1']): a card assuming Rain wired into the
 * "assumed first" of a card assuming Wind, the Wind card into the declared card's first way. A card is named by its
 * sentence, or by a key of `cards` ({ key: sentence }) when it is not a letter or two cards assume one sentence; '∅'
 * (or '∅1', '∅2' … for several) assumes nothing, and '⋀x' takes the thing x.
 */
export function isoBoard(wires, cards = {}) {
  const pairs = wires.map((s) => s.split('>'))
  const tokens = [...new Set(pairs.flatMap(([from, to]) => (/^\d$/.test(to) ? [from] : [from, to])))]
  const id = (token) => cardId(token.startsWith('∅') ? `none${token.slice(1)}` : token.startsWith('⋀') ? `thing-${token.slice(1)}` : token)
  const card = (token, k) => {
    const at = { x: 20, y: 40 + k * 200 }
    if (token.startsWith('∅')) return { id: id(token), type: 'none', params: {}, ...at }
    if (token.startsWith('⋀')) return thingCard(id(token), token.slice(1), at)
    return hypCard(id(token), cards[token] ?? token, at)
  }
  const start = startIso()
  return settle({
    nodes: [...start.nodes, ...tokens.map(card)],
    wires: pairs.map(([from, to]) => (/^\d$/.test(to) ? { from: id(from), to: DECL, port: wayPort(Number(to)) } : { from: id(from), to: id(to), port: 'before' })),
  })
}
