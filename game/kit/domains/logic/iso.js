// Declaring a connective by its two ways round (《证明完毕》's connectives chapter). The board holds evidence: a card
// for each letter gives a numbered proof of it ("it rains #1") when the test has one, and nothing when it does not.
// The player builds both ways through the connective's card in the middle: ways to prove it (`pack`, each taking the
// proofs it needs) wired into it, and its proof taken apart (`unpack`) into the outputs that hand each proof back.
//
// A test is a situation: which proofs are at hand, and whether the connective can be proved from them. When it can,
// what goes in must come back out, the very same numbered proofs (made, then taken apart, it is as it was: Lean's
// And.left (And.intro a b) is a, the "harmony" of an introduction and an elimination rule). When it cannot, the
// card must stay empty: there is no other way to prove it.
//
// A level: { kind: 'iso', declare: { zh, en } the connective's name, letters: [letter], tests: [{ have: { letter: n },
// make: bool }] }.
import { runBoard, sink, source } from '../../engine/boards.js'

const T = (zh, en) => ({ zh, en })
const NEEDS = ['f1', 'f2', 'f3']
const WAYS = ['c1', 'c2', 'c3']
const ITEMS = ['1', '2', '3']
export const DECL = 'decl'
// An input of a way left unwired: the way does not need it.
const UNUSED = Symbol('unused')

/** The cards the player places, as the tray and the editor read them. */
export const ISO_TEXT = {
  pack: { name: T('一种证法', 'A way to prove it'), desc: T('接进这种证法要交出的证明，最多三份：都交了，就证明了它。', 'Wire in the proofs this way needs, up to three: hand them all in, and it is proved.') },
  unpack: { name: T('拆开', 'Take apart'), desc: T('接进它的一份证明，从出口取回造它时交进去的证明：第 1 份、第 2 份、第 3 份。', 'Wire in a proof of it, and take back out the proofs handed in to make it: the 1st, the 2nd, the 3rd.') },
}

/** The engine's parts: evidence cards, the ways and the connective, taking apart, and the outputs. */
export const ISO_PARTS = {
  ev: source(),
  exit: sink(),
  pack: { inputs: NEEDS, idle: () => UNUSED, eval: (ins) => ({ kind: 'proof', items: NEEDS.map((p) => ins[p]).filter((v) => v !== UNUSED) }) },
  // The connective holds a proof once some way into it has all it needs: the first such way.
  [DECL]: {
    inputs: WAYS,
    optional: WAYS,
    eval: (ins) => {
      const k = WAYS.findIndex((p) => ins[p] !== undefined)
      return { ...ins[WAYS[k]], way: k + 1 }
    },
  },
  unpack: {
    inputs: ['card'],
    outputs: () => ITEMS,
    // An output past what the proof holds gives nothing: whatever reads it gets nothing back.
    eval: ({ card }, _node, _ctx, key) => card.items[Number(key) - 1],
  },
}

const evidence = (letter, n) => ({ kind: 'ev', letter, n })
const sameEvidence = (a, b) => a?.kind === 'ev' && a.letter === b.letter && a.n === b.n

/** What the board gives in one test: the engine's values, the connective's proof (or undefined) and each output. */
export function runIso(level, circuit, test) {
  const bind = Object.fromEntries(Object.entries(test.have).map(([letter, n]) => [letter, evidence(letter, n)]))
  const run = runBoard(circuit, { parts: ISO_PARTS, bind })
  return { ...run, made: run.values.get(DECL), back: run.outputs }
}

/** Every test checked: { pass, results: [{ pass, reason, made, back }], cards }; say(letter) gives its words. */
export function checkIso(level, circuit, say) {
  const results = level.tests.map((test) => {
    const run = runIso(level, circuit, test)
    const has = Object.keys(test.have).map(say)
    if (!test.make) {
      const pass = run.made === undefined
      return { pass, reason: pass ? null : T(`只有${has.length ? has.map((h) => h.zh).join('、') : '什么都没有'}，也证出了「${level.declare.zh}」`, `With only ${has.length ? has.map((h) => h.en).join(', ') : 'nothing'}, “${level.declare.en}” is proved`), ...run }
    }
    if (run.made === undefined) return { pass: false, reason: T(`手里有${has.map((h) => h.zh).join('、')}，却证不出「${level.declare.zh}」`, `With ${has.map((h) => h.en).join(', ')} at hand, “${level.declare.en}” is not proved`), ...run }
    for (const letter of level.letters) {
      const want = evidence(letter, test.have[letter])
      const got = run.back[letter]
      if (!sameEvidence(got, want)) {
        const w = say(letter)
        return { pass: false, reason: got === undefined ? T(`拆开以后，「${w.zh}」没有取回来`, `Taken apart, “${w.en}” does not come back`) : T(`拆开以后，取回「${w.zh}」的地方拿到的是${showEvidence(got, say).zh}`, `Taken apart, where “${w.en}” comes back there is ${showEvidence(got, say).en}`), ...run }
      }
    }
    return { pass: true, reason: null, ...run }
  })
  return { pass: results.every((r) => r.pass), results, cards: countCards(circuit) }
}

export const countCards = (circuit) => circuit.nodes.filter((n) => ISO_TEXT[n.type]).length

/** A proof as words: a numbered proof of a letter, or the connective's proof and what it holds. */
export function showEvidence(v, say) {
  if (v?.kind === 'ev') {
    const w = say(v.letter)
    return T(`「${w.zh}」#${v.n}`, `“${w.en}” #${v.n}`)
  }
  const items = v.items.map((x) => showEvidence(x, say))
  const [zh, en] = [items.map((x) => x.zh).join('、') || '什么都没交', items.map((x) => x.en).join(', ') || 'nothing handed in']
  return v.way ? T(`第 ${v.way} 种证法：${zh}`, `way ${v.way}: ${en}`) : T(`交了：${zh}`, `handed in: ${en}`)
}

/** The board a level starts from: the evidence on the left, the connective in the middle, the outputs on the right. */
export function startIso(level) {
  return {
    nodes: [
      ...level.letters.map((letter, k) => ({ id: `in-${letter}`, type: 'ev', params: { name: letter }, x: 20, y: 40 + k * 140 })),
      { id: DECL, type: DECL, params: {}, locked: true, x: 420, y: 40 },
      ...level.letters.map((letter, k) => ({ id: `out-${letter}`, type: 'exit', params: { name: letter }, x: 820, y: 40 + k * 140 })),
    ],
    wires: [],
  }
}

/**
 * A reference board written compactly: isoBoard({ p: 'pack', u: 'unpack' }, ['Rain>p.f1', 'p>decl.c1', 'decl>u.card',
 * 'u#1>Rain']). A letter alone names its evidence (as a source) or its output (as a destination).
 */
export function isoBoard(nodes, wires, level) {
  const start = startIso(level)
  const cards = Object.entries(nodes).map(([id, type], k) => ({ id, type, params: {}, x: 220 + (k % 3) * 200, y: 260 + Math.floor(k / 3) * 150 }))
  const letters = new Set(level.letters)
  return {
    nodes: [...start.nodes, ...cards],
    wires: wires.map((s) => {
      const [from, to] = s.split('>')
      const [id, port = 'in'] = letters.has(to) ? [`out-${to}`] : to.split('.')
      return { from: letters.has(from) ? `in-${from}` : from, to: id, port }
    }),
  }
}
