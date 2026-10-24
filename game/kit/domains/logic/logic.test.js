// node --test games/kit/domains/logic — formulas, rules as parts, boxes, and countermodels. Proofs are written as a
// level's spec writes them (build.js).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runLevel } from '../../engine/tests.js'
import { parse, same, show, subst, tvar } from './formula.js'
import { countermodel, countermodelSearch, holds } from './models.js'
import { proof } from './build.js'
import { LOGIC_TESTS, lemmaGives } from './proof.js'
import { validate } from './validate.js'

const run = (level, circuit) => runLevel(LOGIC_TESTS, level, circuit)
// K and S as a course proves them (lemmas of the kernel, no longer axioms).
const KS = { axK: { statement: 'A → (B → A)', metas: ['A', 'B'] }, axS: { statement: '(A → (B → C)) → ((A → B) → (A → C))', metas: ['A', 'B', 'C'] } }

test('parse and show round-trip with the usual precedence', () => {
  for (const text of ['A → B → C', '(A → B) → C', 'A ∧ B ∨ C', 'A ∧ (B ∨ C)', '¬¬A', '∀x. P(x) → ∃y. Q(x, y)', 'f(a) = b']) {
    const f = parse(text, { consts: ['a', 'b'] })
    assert.ok(same(parse(show(f), { consts: ['a', 'b'] }), f), text)
  }
  assert.equal(show(parse('A -> B -> C')), 'A → B → C')
  assert.equal(show(parse('(A -> B) -> C')), '(A → B) → C')
})

test('substitution does not capture', () => {
  const f = parse('∀y. P(x, y)')
  assert.equal(show(subst(f, 'x', tvar('y'))), '∀y1. P(y, y1)')
})

test('Hilbert: A → A from K and S in five steps', () => {
  const level = { tests: [{ goal: 'A → A' }], lemmas: KS }
  const c = proof({
    s: ['axS', { A: 'A', B: 'A → A', C: 'A' }],
    k1: ['axK', { A: 'A', B: 'A → A' }],
    m1: ['mp'],
    k2: ['axK', { A: 'A', B: 'A' }],
    m2: ['mp'],
  }, ['s>m1.imp', 'k1>m1.a', 'm1>m2.imp', 'k2>m2.a', 'm2>goal'])
  const r = run(level, c)
  assert.equal(r.pass, true, JSON.stringify(r.results[0].checks))
  assert.equal(r.score.steps, 5)
})

test('a wrong premise is named with what it needed', () => {
  const level = { tests: [{ premises: { p: 'A → B', q: 'C' }, goal: 'B' }] }
  const c = proof({ m: ['mp'] }, ['p>m.imp', 'q>m.a', 'm>goal'], { premises: ['p', 'q'] })
  const r = run(level, c)
  assert.equal(r.pass, false)
  assert.deepEqual(r.results[0].errors.get('m'), { zh: '这里要 A，接进来的是 C', en: 'This needs A; it got C' })
})

test('→ introduction closes its assumption; an open one fails', () => {
  const level = { tests: [{ goal: 'A → B → A' }], lemmas: KS }
  // The outer box assumes A; inside it, K and Apply give B → A from it.
  const good = proof({ i: ['impI', { A: 'A' }], k: ['axK', { A: 'A', B: 'B' }, 'i'], m: ['mp', {}, 'i'] }, ['k>m.imp', 'i#body>m.a', 'm>i.body', 'i>goal'])
  assert.equal(run(level, good).pass, true)
  // The same goal with two boxes, the inner one handing back the outer box's assumption.
  assert.equal(run(level, proof({ i: ['impI', { A: 'A' }], j: ['impI', { A: 'B' }, 'i'] }, ['i#body>j.body', 'j>i.body', 'i>goal'])).pass, true)
  // Handing back the inner box's own assumption proves A → B → B, not the goal.
  assert.equal(run(level, proof({ i: ['impI', { A: 'A' }], j: ['impI', { A: 'B' }, 'i'] }, ['j#body>j.body', 'j>i.body', 'i>goal'])).pass, false)
  // An assumption taken out of its box stays open: the goal reached that way does not count.
  const leak = { tests: [{ goal: 'A' }] }
  const r = run(leak, proof({ i: ['impI', { A: 'A' }] }, ['i#body>goal']))
  assert.equal(r.pass, false)
  assert.match(r.results[0].checks[0].reason.en, /still open/)
})

test('a box reads back what was made from its own assumption', () => {
  const level = { tests: [{ premises: { p: 'A → B' }, goal: 'A → B' }] }
  assert.equal(run(level, proof({ i: ['impI', { A: 'A' }], m: ['mp', {}, 'i'] }, ['p>m.imp', 'i#body>m.a', 'm>i.body', 'i>goal'], { premises: ['p'] })).pass, true)
})

test('∨ elimination needs both cases to agree', () => {
  const level = { tests: [{ premises: { p: 'A ∨ B' }, goal: 'B ∨ A' }] }
  const both = proof({ e: ['orE'], l: ['orI', { other: 'B', side: 'left' }, 'e/left'], r: ['orI', { other: 'A', side: 'right' }, 'e/right'] }, ['p>e.ab', 'e#left>l.a', 'l>e.left', 'e#right>r.a', 'r>e.right', 'e>goal'], { premises: ['p'] })
  assert.equal(run(level, both).pass, true)
  const apart = proof({ e: ['orE'], l: ['orI', { other: 'B', side: 'right' }, 'e/left'], r: ['orI', { other: 'A', side: 'right' }, 'e/right'] }, ['p>e.ab', 'e#left>l.a', 'l>e.left', 'e#right>r.a', 'r>e.right', 'e>goal'], { premises: ['p'] })
  assert.match(run(level, apart).results[0].errors.get('e').en, /different/)
})

test('∀ introduction refuses a variable an open hypothesis mentions', () => {
  const level = { tests: [{ premises: { p: 'P(x)' }, goal: '∀x. P(x)' }] }
  const r = run(level, proof({ g: ['allI', { x: 'x' }] }, ['p>g.body', 'g>goal'], { premises: ['p'] }))
  assert.equal(r.pass, false)
  assert.match(r.results[0].errors.get('g').en, /not arbitrary/)
})

test('a lemma with premises: what is wired in fixes its letters, the card the rest', () => {
  const lemmas = { chain: { statement: 'A → C', premises: ['A → B', 'B → C'], metas: ['A', 'B', 'C'] }, id: { statement: 'A → A', metas: ['A'] } }
  const level = { lemmas, tests: [{ premises: { p: 'P → Q', q: 'Q → R' }, goal: 'P → R' }] }
  assert.equal(run(level, proof({ c: ['chain'] }, ['p>c.p0', 'q>c.p1', 'c>goal'], { premises: ['p', 'q'] })).pass, true)
  const wrong = run(level, proof({ c: ['chain'] }, ['q>c.p0', 'p>c.p1', 'c>goal'], { premises: ['p', 'q'] }))
  assert.equal(wrong.pass, false)
  const one = { lemmas, tests: [{ goal: 'P ∧ Q → P ∧ Q' }] }
  assert.equal(run(one, proof({ i: ['id', { A: 'P ∧ Q' }] }, ['i>goal'])).pass, true)
})

test('countermodels: Peirce has none classically, (A → B) → A has one, the quantifier swap has one', () => {
  assert.equal(countermodel([], parse('((A → B) → A) → A')), null)
  const m = countermodel([], parse('(A → B) → A'))
  assert.equal(m.preds.A, false)
  const swap = countermodelSearch([parse('∀x. ∃y. R(y, x)')], parse('∃y. ∀x. R(y, x)'))
  assert.equal(swap.size, 2)
  assert.ok(holds(parse('∀x. ∃y. R(y, x)'), swap.model))
})

test('the domain check runs reference and naive proofs', () => {
  const s = proof({ m: ['mp'] }, ['p>m.imp', 'q>m.a', 'm>goal'], { premises: ['p', 'q'] })
  const lines = validate({ levels: [
    { id: 'mp', kind: 'proof', title: 'mp', tests: [{ premises: { p: 'A → B', q: 'A' }, goal: 'B' }], solution: s, naive: proof({}, ['q>goal'], { premises: ['p', 'q'] }) },
    { id: 'no', kind: 'proof', title: 'no', unprovable: true, tests: [{ goal: '(A → B) → A' }] },
  ] })
  assert.deepEqual(lines.filter((l) => l.fail), [])
})

test('a lemma gives a goal in one step only when the givens fit its premises', () => {
  const chain = { statement: 'A → C', premises: ['A → B', 'B → C'], metas: ['A', 'B', 'C'] }
  assert.equal(lemmaGives(chain, [parse('Q → R'), parse('P → Q')], parse('P → R')), true)
  assert.equal(lemmaGives(chain, [parse('P → (Q → R)'), parse('Q')], parse('P → R')), false)
})

test('proof terms: written, printed, checked, reduced', async () => {
  const { parseTerm, printTerm, checkTerm, normalize, alphaEq } = await import('./pterm.js')
  const t = parseTerm('fun p => p.elim (fun a => Or.inr a) (fun b => Or.inl b)')
  assert.equal(printTerm(t), 'fun p => p.elim (fun a => Or.inr a) (fun b => Or.inl b)')
  assert.equal(checkTerm(t, parse('A ∨ B → B ∨ A')), '')
  assert.ok(checkTerm(parseTerm('fun a k => a k'), parse('A → ¬¬A')))
  assert.equal(checkTerm(parseTerm('fun a k => k a'), parse('A → ¬¬A')), '')
  assert.equal(checkTerm(parseTerm('h.elim (fun y hy => ⟨y, hy.1⟩)'), parse('∃x. P(x)'), { hyps: { h: parse('∃x. P(x) ∧ Q(x)') } }), '')
  assert.equal(printTerm(normalize(parseTerm('(fun h => ⟨h, q⟩.1) a'))), 'a')
  assert.ok(alphaEq(parseTerm('fun x y => x'), parseTerm('fun a b => a')))
  assert.ok(!alphaEq(parseTerm('fun x y => x'), parseTerm('fun a b => b')))
})

test('formulas built from chips: holes in reading order, pieces taken out whole', async () => {
  const { chipsOf, complete, holesOf, kindAt, missingChips, setAt } = await import('./formulaTree.js')
  const level = { kind: 'translate', consts: ['soc'], vocab: { preds: [['Mortal', 1], ['Human', 1]], consts: ['soc'] }, notation: { symbols: ['∀'] } }
  const chips = new Map(chipsOf(level).map((c) => [c.key, c]))
  const put = (tree, key) => setAt(tree, holesOf(tree).find((h) => h.kind === chips.get(key).kind).path, chips.get(key).make())
  let tree = ['∀x', '→', 'P:Human', 'v:x', 'P:Mortal', 'v:x'].reduce(put, null)
  assert.ok(complete(tree))
  assert.ok(same(tree, parse('∀x. Human(x) → Mortal(x)')))
  assert.equal(kindAt(tree, [0, 0, 0]), 'term')
  tree = setAt(tree, [0, 0], null)
  assert.deepEqual(holesOf(tree), [{ path: [0, 0], kind: 'formula' }])
  assert.deepEqual(missingChips(parse('∃x. Human(x)'), [...chips.values()]), ['∃x'])
})

test('a connective put after a whole sentence takes it as its first side', async () => {
  const { chipsOf, holesOf, setAt, nodeAt, joinsOnto } = await import('./formulaTree.js')
  const level = { kind: 'translate', consts: [], vocab: { preds: [['Mortal', 1], ['Human', 1]], consts: [] }, notation: { symbols: ['∀'] } }
  const chips = new Map(chipsOf(level).map((c) => [c.key, c]))
  const fill = (tree, key) => setAt(tree, holesOf(tree).find((h) => h.kind === chips.get(key).kind).path, chips.get(key).make())
  let tree = ['∀x', 'P:Human', 'v:x'].reduce(fill, null)
  const join = (t, op) => { const at = joinsOnto(t, op); return setAt(t, at, setAt(chips.get(op).make(), [0], nodeAt(t, at))) }
  assert.deepEqual(joinsOnto(tree, '→'), [0])
  tree = ['P:Mortal', 'v:x'].reduce(fill, join(tree, '→'))
  assert.ok(same(tree, parse('∀x. Human(x) → Mortal(x)')))
  assert.equal(joinsOnto(['∀x', 'P:Human'].reduce(fill, null), '→'), null)
  // A ∧ B then → takes A ∧ B; A → B then → takes only B.
  const ab = ['∧', 'P:Human', 'v:x', 'P:Mortal', 'v:x'].reduce(fill, null)
  assert.ok(same(['P:Human', 'v:x'].reduce(fill, join(ab, '→')), parse('Human(x) ∧ Mortal(x) → Human(x)')))
  const ib = ['→', 'P:Human', 'v:x', 'P:Mortal', 'v:x'].reduce(fill, null)
  assert.ok(same(['P:Human', 'v:x'].reduce(fill, join(ib, '→')), parse('Human(x) → (Mortal(x) → Human(x))')))
})

test('a thing put where a sentence goes waits for a predicate to take it', async () => {
  const { chipsOf, holesOf, setAt, nodeAt, joinsOnto, straysOf } = await import('./formulaTree.js')
  const level = { kind: 'translate', consts: ['ann', 'bo'], vocab: { preds: [['Parent', 2]], consts: ['ann', 'bo'] }, notation: { symbols: [] } }
  const chips = new Map(chipsOf(level).map((c) => [c.key, c]))
  let tree = chips.get('c:ann').make()
  assert.deepEqual(straysOf(tree), [[]])
  const at = joinsOnto(tree, 'P:Parent')
  tree = setAt(tree, at, setAt(chips.get('P:Parent').make(), [0], nodeAt(tree, at)))
  tree = setAt(tree, holesOf(tree)[0].path, chips.get('c:bo').make())
  assert.deepEqual(straysOf(tree), [])
  assert.ok(same(tree, parse('Parent(ann, bo)', { consts: ['ann', 'bo'] })))
})

test('a lemma over a quantified letter fits any variable and keeps it', async () => {
  const { lemma } = await import('./proof.js')
  const qdm = lemma({ statement: '∃x. ¬P', premises: ['¬∀x. P'], metas: ['P'] })
  const got = qdm.eval({ p0: { formula: parse('¬∀y. D(y)'), hyps: new Map(), term: null } }, { type: 'qdm', params: {} }, {})
  assert.ok(same(got.formula, parse('∃y. ¬D(y)')))
  assert.ok(lemmaGives({ statement: '∃x. ¬P', premises: ['¬∀x. P'], metas: ['P'] }, [parse('¬∀z. R(z, z)')], parse('∃z. ¬R(z, z)')))
})

test('Example reads off its example, and picks the one ∃ sentence that fits', async () => {
  const { RULES } = await import('./proof.js')
  const input = { a: { formula: parse('Likes(a, a)'), hyps: new Map(), term: null } }
  const ctx = { consts: [], subst: {}, exists: [parse('∃x. Likes(x, x)')] }
  assert.ok(same(RULES.exI.eval(input, { params: {} }, ctx).formula, parse('∃x. Likes(x, x)')))
  assert.ok(same(RULES.exI.eval(input, { params: { target: '∃x. Likes(a, x)' } }, ctx).formula, parse('∃x. Likes(a, x)')))
  assert.throws(() => RULES.exI.eval(input, { params: {} }, { ...ctx, exists: [parse('∃x. Likes(x, x)'), parse('∃x. Likes(x, a)')] }))
})
