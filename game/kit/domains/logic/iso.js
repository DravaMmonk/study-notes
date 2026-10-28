// Declaring a connective (《证明完毕》's chapter of definitions and declarations), the way Lean declares one: by its
// ways to make it, each a rule of its own (Lean's `And.intro : a → b → a ∧ b`, which the game writes as every rule,
// ⟦A; B⟧ ⟹ A ∧ B). The player takes assumption cards from the tray and picks on each which sentence it assumes. A card
// wired into another's "assumed first" makes one rule of both, read along the wire: assume A, then assume B; a card
// wired into the connective's card, the board's output, is one way to make it, and each input the card is given
// brings one more. So the boards write the constructors, ⟦A; B⟧ ⟹ A ∧ B (and), ⟦A⟧ ⟹ A ∨ B and ⟦B⟧ ⟹ A ∨ B (or), or
// none (⊥). Written as a proof these would be nested assumption boxes; a declared rule has no proof inside, so it is a
// chain of assumptions, its conclusion given by the declaration.
//
// The way to take it apart is not the player's to build: for every way in, the kernel makes a case of its own (Lean's
// `cases`, the recursor), numbered as the ways are, which gets back just what that way took. The situations show it.
//
// A test is a situation: the proofs at hand (numbered: "it rains #1"), and whether the connective can be proved from
// them. When it can, the first way with all it needs makes it, and its case gets back the very proofs it took; when
// it cannot, nothing is made. A specification is tested on situations, not proved.
//
// A level: { kind: 'iso', declare: { zh, en } the connective's name, target: its sentence (for the rules' words),
// sentences: [sentence] an assumption card may pick (letters, or sentences like "A → B"), tests: [{ have:
// { sentence: n }, make: bool }], tray: the cards it offers (['hyp'] unless it says; 'none' assumes nothing, a way that
// needs no proof, Lean's `True.intro`), ways: the rules the declaration must have, when the situations alone cannot
// tell (a way's assumptions in order, [[sentence]]) }.
import { runBoard } from '../../engine/boards.js'
import { meta, parse } from './formula.js'

const T = (zh, en) => ({ zh, en })
export const DECL = 'decl'
const MOST = 3
const wayPort = (k) => `c${k}`
const cardId = (token) => `hyp-${token}`

/** How many ways the connective's card has wired (its inputs are one more, up to three). */
export const waysOf = (node) => node.params?.ways ?? 0
export const declInputs = (node) => Array.from({ length: Math.min(MOST, waysOf(node) + 1) }, (_, k) => wayPort(k + 1))

const evidence = (letter, n) => ({ kind: 'ev', letter, n })

/** The engine's parts: assumption cards, a card assuming nothing, and the connective. */
export const ISO_PARTS = {
  // An assumption gives a rule: whatever is wired into its "assumed first", then its own sentence.
  hyp: {
    inputs: ['before'],
    optional: ['before'],
    bare: true,
    eval: ({ before }, node) => ({ kind: 'rule', needs: [...(before?.needs ?? []), node.params.name] }),
  },
  // Assuming nothing: a way that needs no proof.
  none: { inputs: [], bare: true, eval: () => ({ kind: 'rule', needs: [] }) },
  // The connective is made by the first way all of whose assumptions are at hand; with none, it is not made.
  [DECL]: {
    inputs: declInputs,
    optional: Array.from({ length: MOST }, (_, k) => wayPort(k + 1)),
    bare: true,
    eval: (ins, node, ctx) => {
      const have = ctx.bind ?? {}
      for (const [k, port] of declInputs(node).entries()) {
        const rule = ins[port]
        if (rule && rule.needs.every((l) => l in have)) return { kind: 'proof', way: k + 1, items: rule.needs.map((l) => have[l]) }
      }
      return null
    },
  },
}

/**
 * The board as the kernel keeps it: the connective's wired ways numbered from 1 with no gaps, and one input more for
 * the next.
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
 * What the board gives in one test: the engine's values, the connective (or null), and what its case gets back (the
 * case of the way it was made by: just the proofs that way took).
 */
export function runIso(level, circuit, test) {
  const bind = Object.fromEntries(Object.entries(test.have).map(([letter, n]) => [letter, evidence(letter, n)]))
  const run = runBoard(circuit, { parts: ISO_PARTS, bind })
  const made = run.values.get(DECL) ?? null
  return { ...run, made, back: made?.items ?? null }
}

/** The rules wired into the connective, in the order of its ways: each the sentences it assumes, in turn. */
export function waysIn(circuit) {
  const run = runBoard(circuit, { parts: ISO_PARTS, bind: {} })
  const decl = circuit.nodes.find((n) => n.id === DECL)
  return declInputs(decl).flatMap((port) => {
    const wire = circuit.wires.find((w) => w.to === DECL && w.port === port)
    const rule = wire && run.values.get(wire.from)
    return rule ? [rule.needs] : []
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
    if (!test.make) {
      const pass = !run.made
      return { pass, reason: pass ? null : T(`手里只有${at.zh}，也证出了「${name.zh}」`, `With only ${at.en} at hand, “${name.en}” is proved`), ...run }
    }
    const pass = Boolean(run.made)
    return { pass, reason: pass ? null : T(`手里有${at.zh}，却证不出「${name.zh}」`, `With ${at.en} at hand, “${name.en}” is not proved`), ...run }
  })
  const key = (ways) => ways.map((w) => w.join('|')).sort().join('/')
  const ways = level.ways && key(waysIn(circuit)) !== key(level.ways)
    ? T(`每种情况都对，但造法不是要求的那条：${level.ways.map((w) => `⟦${w.map((s) => words(s).zh).join('; ')}⟧ ⟹ 「${name.zh}」`).join('；')}`, `Every situation is right, but the way is not the one asked for: ${level.ways.map((w) => `⟦${w.map((s) => words(s).en).join('; ')}⟧ ⟹ “${name.en}”`).join('; ')}`)
    : null
  return { pass: results.every((r) => r.pass) && !ways, results, ways }
}

/**
 * A way as a rule, the way Isabelle writes one and the game writes every rule (schematic.js): its assumptions in turn
 * are the premises, the declared sentence the conclusion: ⟦A; B⟧ ⟹ A ∧ B. (Lean writes the same constructor with its
 * one arrow, A → B → A ∧ B; the encyclopedia's entry on the rule arrow says how the two arrows meet.)
 */
export const wayRule = (needs, level, g = (f) => f) => ({ premises: needs.map((s) => premise(g(parse(s)))), conclusion: g(parse(level.target)) })
const premise = (show, hyps = []) => ({ fixes: [], hyps, show })

// The declared sentence's own letters, each a metavariable in turn (?A, ?B, ?C): the rules for any sentences, not
// just the level's. A new proposition (one whose sentence shares no letter with what it assumes) keeps its sentences.
function general(level) {
  const atoms = (f, out = []) => (f.op === 'atom' ? (out.includes(f.pred) || out.push(f.pred), out) : ([f.a, f.b].forEach((x) => x && atoms(x, out)), out))
  const assumed = new Set(level.sentences.flatMap((s) => atoms(parse(s))))
  const names = new Map(atoms(parse(level.target)).filter((l) => assumed.has(l)).map((l, k) => [l, `?${'ABCDE'[k]}`]))
  const g = (f) => (f.op === 'atom' ? (names.has(f.pred) ? meta(names.get(f.pred)) : f) : { ...f, ...(f.a && { a: g(f.a) }), ...(f.b && { b: g(f.b) }) })
  return g
}

/**
 * What a declaration gives, for any sentences: one rule for each way to make it (the constructors), and the rule
 * that takes it apart (its cases, the recursor: Isabelle's conjE, disjE, FalseE): having it, and for each way a
 * conclusion ?R from what that way took, gives ?R.
 */
export function declaredRules(level, ways) {
  const g = general(level)
  const R = meta('?R')
  return {
    make: ways.map((needs) => wayRule(needs, level, g)),
    take: { premises: [premise(g(parse(level.target))), ...ways.map((needs) => premise(R, needs.map((s) => g(parse(s)))))], conclusion: R },
  }
}

/** The board a level starts from: the connective, with no way yet. */
export const startIso = () => ({ nodes: [{ id: DECL, type: DECL, params: { ways: 0 }, locked: true, x: 320, y: 40 }], wires: [] })

/** An assumption card for `sentence`, as the tray gives it. */
export const hypCard = (id, sentence, at) => ({ id, type: 'hyp', params: { name: sentence }, ...at })

/**
 * A reference board written compactly: isoBoard(['Rain>Wind', 'Wind>1']): a card assuming Rain wired into the
 * "assumed first" of a card assuming Wind, the Wind card into the connective's first way. A card is named by its
 * sentence, or by a key of `cards` ({ key: sentence }) when it is not a letter or two cards assume one sentence; '∅'
 * assumes nothing.
 */
export function isoBoard(wires, cards = {}) {
  const pairs = wires.map((s) => s.split('>'))
  const tokens = [...new Set(pairs.flatMap(([from, to]) => (/^\d$/.test(to) ? [from] : [from, to])))]
  const card = (token, k) => {
    const at = { x: 20, y: 40 + k * 200 }
    return token === '∅' ? { id: cardId('none'), type: 'none', params: {}, ...at } : hypCard(cardId(token), cards[token] ?? token, at)
  }
  const id = (token) => cardId(token === '∅' ? 'none' : token)
  const start = startIso()
  return settle({
    nodes: [...start.nodes, ...tokens.map(card)],
    wires: pairs.map(([from, to]) => (/^\d$/.test(to) ? { from: id(from), to: DECL, port: wayPort(Number(to)) } : { from: id(from), to: id(to), port: 'before' })),
  })
}
