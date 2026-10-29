// Writing a declaration's elimination rule by hand (《证明完毕》 chapter 3, the task after each declaration board): the
// same assumption cards as the declaration board (iso.js), wired into an elimination rule card instead. The card's
// first premise is always the declared sentence (an elimination rule uses it up); each chain wired into it is a case,
// a way to go on (assume these, reach the conclusion), and the card picks the conclusion: ?R, any sentence at all, or
// one of the level's sentences. The tray has more cards: a set of elimination rules (two projections) is judged as a
// whole.
//
// What is written is not believed: it is checked against the ways in (`intros`, the declaration's), the harmony of
// introduction and elimination rules. Both checks ask one small question, whether a set of sentences and a set of
// ways to go on (⟦assumptions⟧ ⟹ conclusion, an ⋀x one fitting any thing) reach a sentence, by going on until nothing
// new comes (saturate); ?R is a sentence nothing else mentions.
//
//   gives no more   one row for each way in ({ gives: its sentences, takes: the things it takes }): from what it handed in (its things named afresh), with the rule's cases
//                   as the ways to go on, every rule's conclusion is reached. ⊥, with no way in, has no such row.
//   gives no less   the last row: from the declared sentence alone, with "reach ?R" from each way in, the rules (each
//                   adding its conclusion once its cases all reach it) bring ?R within reach.
//
// A level: the declaration's own fields (declare, target, sentences, things, binder, tray) and `intros`: its ways in,
// [{ needs: [sentence], binds: [name] }] (iso.js waysIn of its reference board).
import { runBoard } from '../../engine/boards.js'
import { show } from './formula.js'
import { GROWING, ISO_PARTS, general, growingInputs, match, premise, renumber, sentenceOf, substThings, thing, wayOf } from './iso.js'
import { ruleText } from './schematic.js'

const T = (zh, en) => ({ zh, en })
/** The elimination rule card's type, and the id of the one a board starts with. */
export const TAKE = 'take'
/** The conclusion that is any sentence at all. */
export const ANY = '?R'
const CASES = 'cases'
export const takeInputs = (node) => growingInputs(node, CASES)

/** The board's parts: the declaration board's assumption cards, and the elimination rule card. */
export const TAKE_PARTS = {
  hyp: ISO_PARTS.hyp,
  thing: ISO_PARTS.thing,
  none: ISO_PARTS.none,
  // A rule: its cases (one for each chain wired in) and its conclusion.
  [TAKE]: {
    inputs: takeInputs,
    optional: GROWING,
    bare: true,
    eval: (ins, node) => ({ kind: 'elim', to: node.params?.to ?? ANY, cases: takeInputs(node).filter((p) => ins[p]).map((p) => wayOf(ins[p])) }),
  },
}

/** Every elimination rule card's inputs numbered from 1 (iso.js renumber). */
export const settleTake = (graph) => graph.nodes.filter((n) => n.type === TAKE).reduce((g, n) => renumber(g, n.id, CASES), graph)
/** The board a level starts from: one elimination rule card, concluding ?R. */
export const startTake = () => ({ nodes: [{ id: TAKE, type: TAKE, params: { to: ANY, [CASES]: 0 }, locked: true, x: 320, y: 40 }], wires: [] })

/** The rules on a board, in the order of their cards: { id, to, cases: [{ needs, binds }] }. */
export function rulesOn(circuit) {
  const { values } = runBoard(circuit, { parts: TAKE_PARTS, bind: {} })
  return circuit.nodes.filter((n) => n.type === TAKE).map((n) => ({ id: n.id, ...values.get(n.id) }))
}

// ?R as a sentence: one nothing else mentions.
const STAR = { op: 'atom', pred: '?R', args: [] }
const key = (f) => show(f)
// The sentences a set reaches with these ways to go on: [{ needs: [pattern], vars: Set, to }], until nothing new comes.
function saturate(facts, ways) {
  const known = new Map(facts.map((f) => [key(f), f]))
  let grew = true
  while (grew) {
    grew = false
    for (const w of ways) {
      const fits = (k, σ) => (k === w.needs.length ? [σ] : [...known.values()].flatMap((f) => {
        const next = match(w.needs[k], f, w.vars, σ)
        return next ? fits(k + 1, next) : []
      }))
      for (const σ of fits(0, {})) {
        const got = substThings(w.to, σ)
        if (!known.has(key(got))) { known.set(key(got), got); grew = true }
      }
    }
  }
  return known
}
// What a way hands over, its things named afresh.
let fresh = 0
const handed = (way, read) => {
  const σ = Object.fromEntries(way.binds.map((b) => [b, thing(`${b}${++fresh}′`)]))
  return way.needs.map((s) => substThings(read(s), σ))
}

/**
 * Every check: { pass, rows: [{ kind: 'way', way, gives: [sentence], pass, reason } … { kind: 'all', pass, reason }] };
 * words(sentence) gives a sentence's words.
 */
export function checkTake(level, circuit, words) {
  const read = (s) => sentenceOf(level, s)
  const it = read(level.target)
  const rules = rulesOn(circuit)
  const goal = (r) => (r.to === ANY ? STAR : read(r.to))
  const said = (r) => (r.to === ANY ? T('任意一句 ?R', 'any sentence ?R') : words(r.to))
  const name = (r, k) => (rules.length > 1 ? T(`第 ${k + 1} 条消去规则`, `elimination rule ${k + 1}`) : T('消去规则', 'the elimination rule'))
  const list = (xs) => T(xs.map((x) => x.zh).join('、') || '什么都没有', xs.map((x) => x.en).join(', ') || 'nothing')
  const caseWays = (r) => r.cases.map((c) => ({ needs: c.needs.map(read), vars: new Set(c.binds), to: goal(r) }))
  // Gives no more: from what each way handed in, every rule's conclusion within reach of its cases.
  const ways = level.intros.map((way, k) => {
    const facts = handed(way, read)
    const bad = rules.findIndex((r) => !saturate(facts, caseWays(r)).has(key(goal(r))))
    const given = list(way.needs.map(words))
    if (bad < 0) return { kind: 'way', way: k, gives: way.needs, takes: way.binds, pass: true, reason: null }
    const r = rules[bad]
    const n = name(r, bad)
    return { kind: 'way', way: k, gives: way.needs, takes: way.binds, pass: false, reason: T(`用引入规则 ${k + 1} 造出的证明，交进去的只有${given.zh}；${n.zh}却得出了${said(r).zh}：它多给了`, `A proof made by intro rule ${k + 1} was handed only ${given.en}; yet ${n.en} gives ${said(r).en}: it gives more`) }
  })
  // Gives no less: from the declared sentence alone, the rules bring ?R within reach of "reach ?R" from each way in.
  const target = level.intros.map((w) => ({ needs: w.needs.map(read), vars: new Set(w.binds), to: STAR }))
  const facts = [it]
  let grew = true
  while (grew) {
    grew = false
    for (const r of rules) {
      const g = goal(r)
      if (facts.some((f) => key(f) === key(g))) continue
      if (r.cases.every((c) => saturate([...facts, ...handed(c, read)], target).has(key(g)))) { facts.push(g); grew = true }
    }
  }
  const whole = saturate(facts, target).has(key(STAR))
  const all = { kind: 'all', pass: whole, reason: whole ? null : T(`每条引入规则交进去的东西都推得出的 ?R，${rules.length > 1 ? '这组消去规则' : '消去规则'}却推不出：它少给了`, `Every way in reaches ?R from what it hands in, yet ${rules.length > 1 ? 'these elimination rules do' : 'the elimination rule does'} not: it gives less`) }
  const rows = [...ways, all]
  return { pass: rows.every((r) => r.pass), rows }
}

/** A rule on the board written as every rule is, for any sentences: ⟦it; (⟦A; B⟧ ⟹ ?R)⟧ ⟹ ?R. */
export function ruleOfCard(level, r, g = general(level)) {
  const read = (s) => g(sentenceOf(level, s))
  return {
    premises: [premise(g(sentenceOf(level, level.target))), ...r.cases.map((c) => premise(r.to === ANY ? STAR : read(r.to), c.needs.map(read), c.binds))],
    conclusion: r.to === ANY ? STAR : read(r.to),
  }
}
/** The rules a board writes, for any sentences (the pass dialog), as text. */
export const takenRules = (level, circuit, say) => rulesOn(circuit).map((r) => ruleText(ruleOfCard(level, r), say))

/**
 * A reference board written compactly, one entry per elimination rule card: takeBoard([{ to: ANY, wires: ['Rain>Wind',
 * 'Wind>1'] }]): chains written as iso.js isoBoard writes them ('A>B' A into B's "assumed first", 'B>1' into case 1;
 * '∅' assumes nothing, '⋀x' takes the thing x; a sentence that is no letter goes by a key of `cards`).
 */
export function takeBoard(rules, cards = {}) {
  const nodes = []
  const wires = []
  rules.forEach((rule, r) => {
    const id = r ? `${TAKE}-${r + 1}` : TAKE
    nodes.push({ id, type: TAKE, params: { to: rule.to ?? ANY, cases: 0 }, ...(r ? {} : { locked: true }), x: 320, y: 40 + r * 260 })
    const pairs = (rule.wires ?? []).map((s) => s.split('>'))
    const tokens = [...new Set(pairs.flatMap(([from, to]) => (/^\d$/.test(to) ? [from] : [from, to])))]
    const card = (token) => `${id}-${token === '∅' ? 'none' : token.startsWith('⋀') ? `thing-${token.slice(1)}` : token}`
    tokens.forEach((token, k) => {
      const at = { x: 20, y: 40 + r * 260 + k * 120 }
      nodes.push(token === '∅' ? { id: card(token), type: 'none', params: {}, ...at }
        : token.startsWith('⋀') ? { id: card(token), type: 'thing', params: { name: token.slice(1) }, ...at }
        : { id: card(token), type: 'hyp', params: { name: cards[token] ?? token }, ...at })
    })
    for (const [from, to] of pairs) wires.push(/^\d$/.test(to) ? { from: card(from), to: id, port: `c${to}` } : { from: card(from), to: card(to), port: 'before' })
  })
  return settleTake({ nodes, wires })
}
