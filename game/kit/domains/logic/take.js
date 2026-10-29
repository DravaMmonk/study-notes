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
// new comes (saturate); ?R is a sentence nothing else mentions. The rows are sealed proofs, opened as the check runs:
//
//   gives no more   one row for each way in ({ gives: its sentences, takes: the things it takes, opens: what each rule
//                   does with it }): from what it handed in (its things named afresh), with the rule's cases as the
//                   ways to go on, every rule's conclusion is reached. ⊥, with no way in, has no such row.
//   gives no less   the last row: from the declared sentence alone, with "reach ?R" from each way in, the rules (each
//                   adding its conclusion once its cases all reach it) bring ?R within reach.
//
// A level: the declaration's own fields (declare, target, sentences, things, binder, tray) and `intros`: its ways in,
// [{ needs: [sentence], binds: [name] }] (iso.js waysIn of its reference board).
import { show } from './formula.js'
import { general, match, premise, sentenceOf, substThings, thing } from './iso.js'
import { ruleText } from './schematic.js'

const T = (zh, en) => ({ zh, en })
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
  const caseWay = (r, c) => ({ needs: c.needs.map(read), vars: new Set(c.binds), to: goal(r) })
  const caseWays = (r) => r.cases.map((c) => caseWay(r, c))
  // What a rule does with a sealed proof opened: hands back its conclusion as it is, goes into the case that what
  // it holds fits, or is stuck.
  const opened = (r, facts) => {
    if (r.to !== ANY && facts.some((f) => key(f) === key(goal(r)))) return { took: r.to }
    const i = r.cases.findIndex((c) => saturate(facts, [caseWay(r, c)]).has(key(goal(r))))
    return i < 0 ? { stuck: true } : { case: i }
  }
  // Gives no more: from what each way handed in, every rule's conclusion within reach of its cases.
  const ways = level.intros.map((way, k) => {
    const facts = handed(way, read)
    const bad = rules.findIndex((r) => !saturate(facts, caseWays(r)).has(key(goal(r))))
    const given = list(way.needs.map(words))
    const base = { kind: 'way', way: k, gives: way.needs, takes: way.binds, opens: rules.map((r) => opened(r, facts)) }
    if (bad < 0) return { ...base, pass: true, reason: null }
    const r = rules[bad]
    const n = name(r, bad)
    return { ...base, pass: false, reason: T(`这份证明是用引入规则 ${k + 1} 造的，里面只有${given.zh}；${n.zh}却要从它得出${said(r).zh}：哪一种情况都收不下它，它多给了`, `This proof was made by intro rule ${k + 1} and holds only ${given.en}; yet ${n.en} would get ${said(r).en} from it: no case takes what it holds, so it gives more`) }
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
