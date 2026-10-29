// Writing a declaration's elimination rule by hand (《证明完毕》 chapter 3, the task after each declaration board). It
// runs the other way round from the declaration board: there, assumptions are what goes in (a chain wired into the
// declared card); here they are what comes out. A locked card on the left is the declared sentence, a sealed proof,
// wired into an elimination rule frame; each of the frame's regions is a case, and what the player puts in it is what
// that case receives when the proof is opened (Receive: a sentence; Receive a thing: ⋀x), for whoever uses the rule to
// reach the conclusion: a region closes nothing (../../circuit/frames.js `closes: false`). On the frame: how many
// cases, and the conclusion, ?R (any sentence at all) or one of the level's sentences. More frames make a set of
// elimination rules (two projections), judged as a whole.
//
// What is written is not believed: it is checked against the ways in (`intros`, the declaration's), the harmony of
// introduction and elimination rules. Both checks ask one small question, whether a set of sentences and a set of
// ways to go on (⟦assumptions⟧ ⟹ conclusion, an ⋀x one fitting any thing) reach a sentence, by going on until nothing
// new comes (saturate); ?R is a sentence nothing else mentions. The check is two kinds of test case, shown with no
// words, only sentences:
//
//   opened          one for each way in: a sealed proof made by it, holding what it handed in (its things named
//                   afresh); opened, every rule's conclusion is within reach of its cases (gives no more), and the
//                   case shows what the user holds. ⊥, with no way in, has none.
//   any ?R          the last: a sealed proof of the declared sentence, with "reach ?R" from each way in; the rules
//                   (each adding its conclusion once its cases all reach it) bring ?R within reach (gives no less).
//
// A level: the declaration's own fields (declare, target, sentences, things, binder, tray) and `intros`: its ways in,
// [{ needs: [sentence], binds: [name] }] (iso.js waysIn of its reference board).
import { show } from './formula.js'
import { general, match, premise, sentenceOf, substThings, thing } from './iso.js'
import { ruleText } from './schematic.js'

/** The elimination rule frame's type, and the id of the one a board starts with. */
export const TAKE = 'take'
/** The sealed proof of the declared sentence, on the left. */
export const IT = 'it'
/** The conclusion that is any sentence at all. */
export const ANY = '?R'
export const MOST = 3
const REGIONS = Array.from({ length: MOST }, (_, k) => `c${k + 1}`)
/** A frame's cases, as many as it says: each a region that closes nothing. */
export const casesOf = (node) => REGIONS.slice(0, Math.max(0, Math.min(MOST, Number(node?.params?.ways) || 0))).map((name) => ({ name, opens: false, closes: false }))

/** The board's parts: the sealed proof, the elimination rule frame, and what a case receives. */
export const TAKE_PARTS = {
  [IT]: { inputs: [], eval: () => null },
  [TAKE]: { inputs: ['it'], frames: casesOf, outputs: () => [null], params: ['ways', 'to'], eval: () => null },
  get: { inputs: [], params: ['name'], eval: () => null },
  getThing: { inputs: [], params: ['name'], eval: () => null },
}

const frame = (id, at, extra = {}) => ({ id, type: TAKE, params: { to: ANY, ways: 0 }, ...at, ...extra })
/** A new frame of the set, wired to the sealed proof. */
export const addFrame = (graph, id, at) => ({ nodes: [...graph.nodes, frame(id, at)], wires: [...graph.wires, { from: IT, to: id, port: 'it', locked: true }] })
/** The board a level starts from: the sealed proof wired into one elimination rule frame, with no case yet. */
export const startTake = () => ({
  nodes: [{ id: IT, type: IT, params: {}, locked: true, x: 20, y: 40 }, frame(TAKE, { x: 300, y: 40 }, { locked: true })],
  wires: [{ from: IT, to: TAKE, port: 'it', locked: true }],
})

/** The rules on a board, in the order of their frames: { id, to, cases: [{ needs, binds }] }, from what each case holds. */
export function rulesOn(circuit) {
  return circuit.nodes.filter((n) => n.type === TAKE).map((n) => ({
    id: n.id,
    to: n.params?.to ?? ANY,
    cases: casesOf(n).map(({ name }) => {
      const inside = circuit.nodes.filter((c) => c.in === `${n.id}/${name}`)
      return { needs: inside.filter((c) => c.type === 'get').map((c) => c.params.name), binds: inside.filter((c) => c.type === 'getThing').map((c) => c.params.name) }
    }),
  }))
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
 * The check, two kinds of test case: { pass, rows: [{ kind: 'way', way, takes, gives, got, pass } … { kind: 'all',
 * pass }] }. A 'way' row is a sealed proof made by that way in, holding the things it takes and the sentences it gives;
 * `got` is, for each rule, what the user ends up holding once it is opened: [{ s: a sentence, a thing's name, or ?R,
 * thing, ok }], ok false for what the proof does not hold.
 */
export function checkTake(level, circuit) {
  const read = (s) => sentenceOf(level, s)
  const it = read(level.target)
  const rules = rulesOn(circuit)
  const goal = (r) => (r.to === ANY ? STAR : read(r.to))
  const caseWay = (r, c) => ({ needs: c.needs.map(read), vars: new Set(c.binds), to: goal(r) })
  const caseWays = (r) => r.cases.map((c) => caseWay(r, c))
  // What a rule hands over once a sealed proof is opened: its conclusion as it is, what the case it goes into receives
  // (the first whose receipts the proof holds), or, stuck, what its cases ask for, marking what the proof lacks.
  const opened = (r, facts) => {
    if (r.to !== ANY && facts.some((f) => key(f) === key(goal(r)))) return [{ s: r.to, ok: true }]
    const i = r.cases.findIndex((c) => saturate(facts, [caseWay(r, c)]).has(key(goal(r))))
    if (i >= 0) return [...r.cases[i].binds.map((x) => ({ s: x, thing: true, ok: true })), ...r.cases[i].needs.map((s) => ({ s, ok: true }))]
    const asked = r.cases.flatMap((c) => c.needs.map((s) => ({ s, ok: facts.some((f) => match(read(s), f, new Set(c.binds), {})) })))
    const marked = asked.every((a) => a.ok) ? asked.map((a) => ({ ...a, ok: false })) : asked
    return marked.length ? marked : [{ s: r.to, ok: false }]
  }
  // Gives no more: from what each way handed in, every rule's conclusion within reach of its cases.
  const ways = level.intros.map((way, k) => {
    const facts = handed(way, read)
    return { kind: 'way', way: k, takes: way.binds, gives: way.needs, got: rules.map((r) => opened(r, facts)), pass: rules.every((r) => saturate(facts, caseWays(r)).has(key(goal(r)))) }
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
  const rows = [...ways, { kind: 'all', pass: saturate(facts, target).has(key(STAR)) }]
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
 * A reference board written compactly, one entry per elimination rule frame: takeBoard([{ to: ANY, cases: [['Rain',
 * 'Wind']] }]): each case what it receives, a sentence (or a key of `cards`, for one that is no letter) or '⋀x', a thing
 * named x.
 */
export function takeBoard(rules, cards = {}) {
  let graph = startTake()
  rules.forEach((rule, r) => {
    const id = r ? `${TAKE}-${r + 1}` : TAKE
    if (r) graph = addFrame(graph, id, { x: 300, y: 40 + r * 300 })
    graph = { ...graph, nodes: graph.nodes.map((n) => (n.id === id ? { ...n, params: { to: rule.to ?? ANY, ways: (rule.cases ?? []).length } } : n)) }
    ;(rule.cases ?? []).forEach((got, c) => {
      got.forEach((token, k) => {
        const at = { in: `${id}/c${c + 1}`, x: 20 + k * 230, y: 20 }
        graph = { ...graph, nodes: [...graph.nodes, token.startsWith('⋀')
          ? { id: `${id}-${c + 1}-${k}`, type: 'getThing', params: { name: token.slice(1) }, ...at }
          : { id: `${id}-${c + 1}-${k}`, type: 'get', params: { name: cards[token] ?? token }, ...at }] }
      })
    })
  })
  return graph
}
