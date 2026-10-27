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

test('a lemma of several shapes computes as the shape its card is switched to', async () => {
  const { lemma } = await import('./proof.js')
  const dm = lemma({ metas: ['A', 'B', 'P'], forms: [
    { key: 'notOr', statement: '¬A ∧ ¬B', premises: ['¬(A ∨ B)'] },
    { key: 'notAll', statement: '∃x. ¬P', premises: ['¬∀x. P'] },
  ] })
  const j = (f) => ({ p0: { formula: parse(f), hyps: new Map(), term: null } })
  assert.deepEqual(dm.forms, ['notOr', 'notAll'])
  assert.ok(same(dm.eval(j('¬(Rain ∨ Wind)'), { type: 'dm', params: {} }, {}).formula, parse('¬Rain ∧ ¬Wind')))
  assert.ok(same(dm.eval(j('¬∀y. D(y)'), { type: 'dm', params: { form: 'notAll' } }, {}).formula, parse('∃y. ¬D(y)')))
  assert.ok(lemmaGives({ metas: ['P'], forms: [{ key: 'notAll', statement: '∃x. ¬P', premises: ['¬∀x. P'] }] }, [parse('¬∀y. D(y)')], parse('∃y. ¬D(y)'), ['notAll']))
  assert.equal(lemmaGives({ metas: ['P'], forms: [{ key: 'notAll', statement: '∃x. ¬P', premises: ['¬∀x. P'] }] }, [parse('¬∀y. D(y)')], parse('∃y. ¬D(y)'), []), false)
})

test('unification solves sentences with ?-letters, patterns as functions, and refuses what has no solution', async () => {
  const { FULL, parseEquation, sideText, solveEqs } = await import('./schematic.js')
  const solve = (text) => {
    const set = solveEqs([parseEquation(text)], { rules: FULL })
    return set.fail ? 'fail' : set.eqs.map((e) => `${sideText(e.s)} ≐ ${sideText(e.t)}`).join('; ')
  }
  assert.equal(solve('?A ∧ ?B ≐ Rain ∧ Wind'), '?A ≐ Rain; ?B ≐ Wind')
  assert.equal(solve('?A ∧ ?A ≐ Rain ∧ Wind'), 'fail')
  assert.equal(solve('?A ≐ ?A → Wet'), 'fail')
  assert.equal(solve('¬?A ≐ Rain → ⊥'), '?A ≐ Rain')
  assert.equal(solve('∀x. ?P(x) ≐ ∀y. Likes(y, ann)'), '?P ≐ fun x => Likes(x, ann)')
  // ?A may not take a bound variable out of its quantifier.
  assert.equal(solve('∀x. ?A ≐ ∀x. Human(x)'), 'fail')
})

test('rules used backwards leave ?-letters that a given settles later, and a fixed thing comes too late for an older one', async () => {
  const { parseS } = await import('./schematic.js')
  const { KERNEL, assumption, erule, frule, rule, startState } = await import('./tactics.js')
  const step = (s, ...r) => { const out = r[0](s, ...r.slice(1)); assert.ok(out.results, JSON.stringify(out.fail)); return out.results[0] }
  let s = startState(parseS('Wet'), ['Rain → Wet', 'Rain'].map(parseS))
  s = step(s, rule, KERNEL.mp)
  assert.equal(show(s.goals[1].goal), '?A')
  s = step(s, assumption)
  assert.equal(show(s.goals[0].goal), 'Rain')
  assert.equal(step(s, assumption).goals.length, 0)
  // Take one only fits forwards: backwards ?P(?t) is no pattern.
  const t = startState(parseS('Mortal(soc)'), ['∀x. Human(x) → Mortal(x)', 'Human(soc)'].map(parseS))
  assert.ok(rule(t, KERNEL.spec).fail)
  // Forward is Have, then the rule on a given: the given stays, and the rule's conclusion joins it.
  const f = step(t, frule, KERNEL.spec)
  assert.equal(f.goals[0].hyps.length, 3)
  assert.equal(step(step(f, erule, KERNEL.mp), assumption).goals.length, 0)
  // An example left before the thing was taken out cannot become it.
  let u = startState(parseS('∃x. Rich(x)'), [parseS('∃x. Human(x) ∧ Rich(x)')])
  u = step(step(step(u, rule, KERNEL.exI), erule, KERNEL.exE), erule, KERNEL.conjE)
  assert.match(assumption(u).fail.en, /was left before/)
})

test('a search does not follow a step that gives nothing new, so using givens again comes to an end', async () => {
  const { parseS } = await import('./schematic.js')
  const { auto, startState } = await import('./tactics.js')
  const run = (goal) => auto([startState(parseS(goal))])
  assert.ok(run('(∃x. Human(x) ∧ Likes(x, ann)) → ∃x. Likes(x, ann)').found.length)
  // Not provable without proof by contradiction: the search runs out of new steps rather than of time.
  const lost = run('(¬Rain → Rain) → Rain')
  assert.equal(lost.found.length + Number(lost.stopped), 0)
})

test('a machine backtracks once its level says so, and a search finds every answer to a question', async () => {
  const { MACHINE_TESTS } = await import('./machine.js')
  const { machine } = await import('./build.js')
  const script = machine({ a: ['rule', { rule: 'exI' }], b: ['rule', { rule: 'conjI' }], c: ['assumption'], d: ['assumption'] }, ['in>a.in', 'a>b.in', 'b>c.in', 'c>d.in', 'd>out'])
  const test1 = { goal: '∃x. Human(x) ∧ Likes(x, ann)', hyps: ['Human(cy)', 'Human(bo)', 'Likes(bo, ann)'] }
  const level = { kind: 'machine', want: 'proved', tests: [test1] }
  assert.equal(runLevel(MACHINE_TESTS, level, script).pass, false)
  assert.equal(runLevel(MACHINE_TESTS, { ...level, backtrack: true }, script).pass, true)
  const ask = {
    kind: 'machine', want: 'answers', backtrack: true,
    rules: { grand: { name: { zh: '祖父母', en: 'Grandparent' }, premises: ['Parent(?x, ?y)', 'Parent(?y, ?z)'], conclusion: 'Grand(?x, ?z)' } },
    tests: [{ goal: 'Grand(ann, ?w)', hyps: ['Parent(ann, bo)', 'Parent(bo, cy)', 'Parent(bo, dee)'], answers: ['cy', 'dee'] }],
  }
  assert.equal(runLevel(MACHINE_TESTS, ask, machine({ g: ['rule', { rule: 'grand' }], a: ['assumption'], b: ['assumption'] }, ['in>g.in', 'g>a.in', 'a>b.in', 'b>out'])).pass, true)
})

test('a proof state can build its proof term, each goal a hole, and the kernel checks the finished term', async () => {
  const { parseS } = await import('./schematic.js')
  const { KERNEL, assumption, erule, proofTermOf, rule, startState } = await import('./tactics.js')
  const { kernelCheck } = await import('./machine.js')
  const { printTerm } = await import('./pterm.js')
  const step = (s, t, r) => t(s, r).results[0]
  let s = startState(parseS('Rain ∧ Wind → Wind ∧ Rain'), [], { terms: true })
  s = step(step(s, rule, KERNEL.impI), erule, KERNEL.conjE)
  s = step(s, rule, KERNEL.conjI)
  assert.equal(printTerm(proofTermOf(s)), 'fun h1 => ⟨?m4, ?m5⟩')
  s = step(step(s, assumption), assumption)
  assert.equal(printTerm(proofTermOf(s)), 'fun h1 => ⟨h1.2, h1.1⟩')
  assert.equal(kernelCheck({}, { goal: 'Rain ∧ Wind → Wind ∧ Rain' }, s), '')
  // A level's own rule is an axiom the kernel may use, unless nobody proved it.
  const conv = { conv: { name: { zh: '认识是相互的', en: 'Knowing goes both ways' }, premises: ['Knows(?x, ?y)'], conclusion: 'Knows(?y, ?x)' } }
  const test = { goal: 'Knows(bo, ann)', hyps: ['Knows(ann, bo)'] }
  let t = startState(parseS(test.goal), test.hyps.map(parseS), { terms: true })
  const level = { rules: conv }
  const { ruleBookOf } = await import('./machine.js')
  t = step(step(t, rule, ruleBookOf(level).conv), assumption)
  assert.equal(kernelCheck(level, test, t), '')
  const unproved = { rules: { conv: { ...conv.conv, unproved: true } } }
  assert.match(kernelCheck(unproved, test, t).en, /conv/)
})

test('a written term may use a lemma as a function of its premises, and take out what there is', async () => {
  const { checkTerm, parseTerm } = await import('./pterm.js')
  const { lemmaUse } = await import('./proof.js')
  const lemma = lemmaUse({ chain: { statement: 'A → C', premises: ['A → B', 'B → C'], metas: ['A', 'B', 'C'] } })
  const hyps = { p: parse('Rain → Wet'), q: parse('Wet → Slip') }
  assert.equal(checkTerm(parseTerm('chain p q'), parse('Rain → Slip'), { hyps, lemma }), '')
  assert.ok(checkTerm(parseTerm('chain q p'), parse('Rain → Slip'), { hyps, lemma }))
  assert.equal(checkTerm(parseTerm('p.elim (fun a b => ⟨a, b.2⟩)'), parse('∃x. Q(x)'), { hyps: { p: parse('∃x. P(x) ∧ Q(x)') } }), '')
})
