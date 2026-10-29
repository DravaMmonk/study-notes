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
// The way to take it apart is not written here: the player's generator makes it from the ways in (elimgen.js), a case
// for every way, numbered as the ways are, which gets back just what that way took. The situations show it.
//
// A test is a situation: the proofs at hand (numbered: "it rains #1"), and whether the declared sentence can be
// proved from them, or a sentence of its shape (`goal`, when the declared sentence mentions a thing: "the Morning
// Star = the Morning Star"). When it can, the way using the most of what is at hand makes it (the first such), with
// the things its thing cards take found among the level's (`things`), and its case gets back the very things and
// proofs it took; when it cannot, nothing is made. A specification is tested on situations, not proved.
//
// A level: { kind: 'iso', declare: { zh, en } its name, target: its sentence (with a thing's name where a way takes
// one: 'x = x'), sentences: [sentence] an assumption card may pick (letters, or sentences like "A → B" or "Human(x)"),
// things: [name] the things of the level, binder: the name a thing card gives ('x' unless it says), tests: [{ have:
// { sentence: n }, goal?, make: bool, uses?: [sentence] what the way it is made by must take }], tray: the cards it
// offers (['hyp'] unless it says: 'hyp', 'thing', 'none'), ways: the rules the declaration must have, when the
// situations alone cannot tell (a way's assumptions in order, [[sentence]]), take: the rule that takes it apart, when
// it is not the plain cases (a family indexed by things, as =; one that takes its own kind, as the numbers):
// { premises: [text], conclusion: text } in metavariables (schematic.js) }.
import { runBoard } from '../../engine/boards.js'
import { meta, parse, show } from './formula.js'
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

/**
 * What the board gives in one test: the engine's values, the declared sentence (or null), and what its case gets back
 * (the case of the way it was made by: just the things and proofs that way took).
 */
export function runIso(level, circuit, test) {
  const read = (s) => sentenceOf(level, s)
  const have = new Map(Object.entries(test.have).map(([s, n]) => [keyOf(read(s)), evidence(s, n)]))
  const bind = { have, read, things: level.things ?? [], target: read(level.target), goal: test.goal ? read(test.goal) : null }
  const run = runBoard(circuit, { parts: ISO_PARTS, bind })
  const made = run.values.get(DECL) ?? null
  return { ...run, made, back: made?.items ?? null }
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
 * Every test checked: { pass, results: [{ pass, reason, made, back }], ways }; words(sentence) gives a sentence's
 * words. `ways` says why the rules are not the ones the level asks for (level.ways), when every situation is right.
 */
export function checkIso(level, circuit, words) {
  const name = level.declare
  const results = level.tests.map((test) => {
    const run = runIso(level, circuit, test)
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
  const key = (ways) => ways.map((w) => w.join('|')).sort().join('/')
  const ways = level.ways && key(waysIn(circuit).map((w) => w.needs)) !== key(level.ways)
    ? T(`每种情况都对，但引入规则不是要求的那条：${level.ways.map((w) => `⟦${w.map((s) => words(s).zh).join('; ')}⟧ ⟹ 「${name.zh}」`).join('；')}`, `Every situation is right, but the way is not the one asked for: ${level.ways.map((w) => `⟦${w.map((s) => words(s).en).join('; ')}⟧ ⟹ “${name.en}”`).join('; ')}`)
    : null
  return { pass: results.every((r) => r.pass) && !ways, results, ways }
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
 * What a declaration gives, for any sentences: its sentence, one rule for each way to make it, and the rule that takes
 * it apart when the level gives it (`take`: equality, the numbers). Otherwise that rule is the generator's, which the
 * player builds (elimgen.js), run on the sentence and the ways in.
 */
export function declaredRules(level, ways) {
  const g = general(level)
  return {
    it: g(sentenceOf(level, level.target)),
    make: ways.map((way) => wayRule(way, level, g)),
    take: level.take ? ruleOf('take', null, level.take.premises, level.take.conclusion) : null,
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
 * assumes nothing, and '⋀x' takes the thing x.
 */
export function isoBoard(wires, cards = {}) {
  const pairs = wires.map((s) => s.split('>'))
  const tokens = [...new Set(pairs.flatMap(([from, to]) => (/^\d$/.test(to) ? [from] : [from, to])))]
  const id = (token) => cardId(token === '∅' ? 'none' : token.startsWith('⋀') ? `thing-${token.slice(1)}` : token)
  const card = (token, k) => {
    const at = { x: 20, y: 40 + k * 200 }
    if (token === '∅') return { id: id(token), type: 'none', params: {}, ...at }
    if (token.startsWith('⋀')) return thingCard(id(token), token.slice(1), at)
    return hypCard(id(token), cards[token] ?? token, at)
  }
  const start = startIso()
  return settle({
    nodes: [...start.nodes, ...tokens.map(card)],
    wires: pairs.map(([from, to]) => (/^\d$/.test(to) ? { from: id(from), to: DECL, port: wayPort(Number(to)) } : { from: id(from), to: id(to), port: 'before' })),
  })
}
