// Declaring a connective (《证明完毕》's chapter of definitions and declarations), the way Lean declares one: by its
// ways to make it, each a rule of its own, `And.intro : A → B → A ∧ B`. The player takes assumption cards from the
// tray and picks on each which sentence it assumes. One card wired into another's "then assume" makes one rule of
// both, assume A, then assume B; a card wired into the connective's card is one way to make it, and each input the
// card is given brings one more. So the boards write the constructors' types, `A → B → A ∧ B` (and) or `A → A ∨ B`
// and `B → A ∨ B` (or), or nothing (⊥). Written as a proof these would be nested assumption boxes; a declared rule
// has no proof inside, so it is a chain of assumptions, its conclusion given by the declaration.
//
// The way to take it apart is not the player's to build: for every way in, the kernel makes a case of its own (Lean's
// `cases`, the recursor), numbered as the ways are, which gets back just what that way took. They appear on the
// board as the ways are wired, as its outputs, and the board shows them working.
//
// A test is a situation: the proofs at hand (numbered: "it rains #1"), and whether the connective can be proved from
// them. When it can, the first way with all it needs makes it, and its case gets back the very proofs it took; when
// it cannot, nothing is made. A specification is tested on situations, not proved.
//
// A level: { kind: 'iso', declare: { zh, en } the connective's name, target: its sentence (for the rules' words),
// letters: [letter], tests: [{ have: { letter: n }, make: bool }] }.
import { runBoard } from '../../engine/boards.js'
import { parse } from './formula.js'
import { say } from './notation.js'

const T = (zh, en) => ({ zh, en })
export const DECL = 'decl'
const MOST = 3
const wayPort = (k) => `c${k}`
const caseId = (k) => `case-${k}`
const cardId = (letter) => `hyp-${letter}`

/** How many ways the connective's card has wired (its inputs are one more, up to three). */
export const waysOf = (node) => node.params?.ways ?? 0
export const declInputs = (node) => Array.from({ length: Math.min(MOST, waysOf(node) + 1) }, (_, k) => wayPort(k + 1))

const evidence = (letter, n) => ({ kind: 'ev', letter, n })

/** The engine's parts: assumption cards, the connective, and the cases the kernel makes. */
export const ISO_PARTS = {
  // An assumption gives a rule: its own sentence, then whatever is wired into its "then assume".
  hyp: {
    inputs: ['then'],
    optional: ['then'],
    bare: true,
    eval: ({ then }, node) => ({ kind: 'rule', needs: [node.params.name, ...(then?.needs ?? [])] }),
  },
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
  // A case gets back what its way took, when the connective was made that way.
  case: {
    inputs: ['p'],
    eval: ({ p }, node) => (p && p.way === node.params.k ? { kind: 'back', way: p.way, items: p.items } : null),
  },
}

/**
 * The board as the kernel keeps it: the connective's wired ways numbered from 1 with no gaps, one input more for the
 * next, and one case for each way, wired from the connective (locked: they are the kernel's, not the player's).
 */
export function settle(graph) {
  const decl = graph.nodes.find((n) => n.id === DECL)
  if (!decl) return graph
  const ways = graph.wires.filter((w) => w.to === DECL).sort((a, b) => Number(a.port.slice(1)) - Number(b.port.slice(1)))
  const renumber = new Map(ways.map((w, k) => [w, wayPort(k + 1)]))
  const n = ways.length
  const old = new Map(graph.nodes.filter((x) => x.type === 'case').map((x) => [x.params.k, x]))
  const cases = Array.from({ length: n }, (_, k) => old.get(k + 1) ?? { id: caseId(k + 1), type: 'case', params: { k: k + 1 }, locked: true, x: decl.x + 280, y: (decl.y ?? 40) + k * 130 })
  return {
    ...graph,
    nodes: [...graph.nodes.filter((x) => x.type !== 'case').map((x) => (x.id === DECL ? { ...x, params: { ...x.params, ways: n } } : x)), ...cases],
    wires: [
      ...graph.wires.filter((w) => w.to !== DECL && !w.to.startsWith('case-')),
      ...ways.map((w) => ({ ...w, port: renumber.get(w) })),
      ...cases.map((c) => ({ from: DECL, to: c.id, port: 'p', locked: true })),
    ],
  }
}

/** What the board gives in one test: the engine's values, the connective (or null) and each case. */
export function runIso(level, circuit, test) {
  const bind = Object.fromEntries(Object.entries(test.have).map(([letter, n]) => [letter, evidence(letter, n)]))
  const run = runBoard(circuit, { parts: ISO_PARTS, bind })
  return { ...run, made: run.values.get(DECL) ?? null }
}

/** Every test checked: { pass, results: [{ pass, reason, made, back }] }; words(letter) gives a letter's words. */
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
    if (!run.made) return { pass: false, reason: T(`手里有${at.zh}，却证不出「${name.zh}」`, `With ${at.en} at hand, “${name.en}” is not proved`), ...run }
    // What the kernel guarantees, shown working: the case of the way it was made by gets back what that way took.
    const back = run.values.get(caseId(run.made.way))
    const pass = Boolean(back) && back.items.length === run.made.items.length && back.items.every((x, k) => x === run.made.items[k])
    return { pass, reason: pass ? null : T('拆开没有取回交进去的证明', 'Taken apart, it does not give back the proofs handed in'), ...run }
  })
  return { pass: results.every((r) => r.pass), results }
}

/** A proof in words: a numbered proof of a letter. */
export const showEvidence = (v, words) => T(`「${words(v.letter).zh}」#${v.n}`, `“${words(v.letter).en}” #${v.n}`)
/** A rule in words, the way Lean writes a constructor's type: its assumptions in turn, then the connective. */
export function showRule(rule, level, words) {
  const goal = say(parse(level.target), level.notation)
  const steps = rule.needs.map(words)
  return T([...steps.map((s) => s.zh), goal.zh].join(' → '), [...steps.map((s) => s.en), goal.en].join(' → '))
}

/** The board a level starts from: the connective, with no way yet. */
export const startIso = () => ({ nodes: [{ id: DECL, type: DECL, params: { ways: 0 }, locked: true, x: 320, y: 40 }], wires: [] })

/** An assumption card for `letter`, as the tray gives it. */
export const hypCard = (id, letter, at) => ({ id, type: 'hyp', params: { name: letter }, ...at })

/**
 * A reference board written compactly: isoBoard(['Wind>Rain', 'Rain>1']): a card assuming Wind wired into the
 * "then assume" of a card assuming Rain, the Rain card into the connective's first way.
 */
export function isoBoard(wires) {
  const pairs = wires.map((s) => s.split('>'))
  const letters = [...new Set(pairs.flatMap(([from, to]) => (/^\d$/.test(to) ? [from] : [from, to])))]
  const start = startIso()
  return settle({
    nodes: [...start.nodes, ...letters.map((l, k) => hypCard(cardId(l), l, { x: 20, y: 40 + k * 200 }))],
    wires: pairs.map(([from, to]) => (/^\d$/.test(to) ? { from: cardId(from), to: DECL, port: wayPort(Number(to)) } : { from: cardId(from), to: cardId(to), port: 'then' })),
  })
}
