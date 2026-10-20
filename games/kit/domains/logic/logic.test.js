// node --test games/kit/domains/logic — formulas, rules as parts, boxes, and countermodels.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runLevel } from '../../engine/tests.js'
import { parse, same, show, subst, tvar } from './formula.js'
import { countermodel, countermodelSearch, holds } from './models.js'
import { LOGIC_TESTS } from './proof.js'
import { validate } from './validate.js'

// A proof from a compact description: nodes { id: [type, params, boards] }, wires 'from>to.port' (port 'in' for sinks).
const proof = (nodes, wires, extra = []) => ({
  nodes: [...extra, ...Object.entries(nodes).map(([id, [type, params = {}, boards]]) => ({ id, type, params, ...(boards ? { boards } : {}) }))],
  wires: wires.map((s) => { const [from, to] = s.split('>'); const [id, port = 'in'] = to.split('.'); return { from, to: id, port } }),
})
const ends = (premises = []) => [...premises.map((p) => ({ id: p, type: 'premise', params: { name: p } })), { id: 'goal', type: 'goal', params: { name: 'goal' } }]
const run = (level, circuit) => runLevel(LOGIC_TESTS, level, circuit)

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
  const level = { tests: [{ goal: 'A → A' }] }
  const c = proof({
    s: ['axS', { A: 'A', B: 'A → A', C: 'A' }],
    k1: ['axK', { A: 'A', B: 'A → A' }],
    m1: ['mp'],
    k2: ['axK', { A: 'A', B: 'A' }],
    m2: ['mp'],
  }, ['s>m1.imp', 'k1>m1.a', 'm1>m2.imp', 'k2>m2.a', 'm2>goal'], ends())
  const r = run(level, c)
  assert.equal(r.pass, true, JSON.stringify(r.results[0].checks))
  assert.equal(r.score.steps, 5)
})

test('a wrong premise is named with what it needed', () => {
  const level = { tests: [{ premises: { p: 'A → B', q: 'C' }, goal: 'B' }] }
  const c = proof({ m: ['mp'] }, ['p>m.imp', 'q>m.a', 'm>goal'], ends(['p', 'q']))
  const r = run(level, c)
  assert.equal(r.pass, false)
  assert.deepEqual(r.results[0].errors.get('m'), { zh: '这里要 A，接进来的是 C', en: 'This needs A; it got C' })
})

test('→ introduction closes its assumption; an open one fails', () => {
  const level = { tests: [{ goal: 'A → B → A' }] }
  // The outer box assumes A; inside it a box assumes B and gives back A, which comes from the outer assumption.
  const outerBody = {
    nodes: [{ id: 'a', type: 'assume', params: { name: 'assume' } }, { id: 'o', type: 'out', params: { name: 'out' } }, { id: 'k', type: 'axK', params: { A: 'A', B: 'B' } }, { id: 'm', type: 'mp', params: {} }],
    wires: [{ from: 'k', to: 'm', port: 'imp' }, { from: 'a', to: 'm', port: 'a' }, { from: 'm', to: 'o', port: 'in' }],
  }
  const good = proof({ i: ['impI', { A: 'A' }, { body: outerBody }] }, ['i>goal'], ends())
  assert.equal(run(level, good).pass, true)
  // The same goal with two boxes, the inner one using the outer box's assumption by its id.
  const innerBody = { nodes: [{ id: 'a', type: 'assume', params: { name: 'i/body' } }, { id: 'o', type: 'out', params: { name: 'out' } }], wires: [{ from: 'a', to: 'o', port: 'in' }] }
  const outer2 = { nodes: [{ id: 'j', type: 'impI', params: { A: 'B' }, boards: { body: innerBody } }, { id: 'o', type: 'out', params: { name: 'out' } }], wires: [{ from: 'j', to: 'o', port: 'in' }] }
  assert.equal(run(level, proof({ i: ['impI', { A: 'A' }, { body: outer2 }] }, ['i>goal'], ends())).pass, true)
  // Leaving the inner box's own assumption as the answer proves A → B → B, not the goal.
  const wrongBody = { nodes: [{ id: 'a', type: 'assume', params: { name: 'assume' } }, { id: 'o', type: 'out', params: { name: 'out' } }], wires: [{ from: 'a', to: 'o', port: 'in' }] }
  const outer3 = { nodes: [{ id: 'j', type: 'impI', params: { A: 'B' }, boards: { body: wrongBody } }, { id: 'o', type: 'out', params: { name: 'out' } }], wires: [{ from: 'j', to: 'o', port: 'in' }] }
  assert.equal(run(level, proof({ i: ['impI', { A: 'A' }, { body: outer3 }] }, ['i>goal'], ends())).pass, false)
  // Proving A → A under an unrelated premise left open: the premise counts, an assumption never closed does not.
  const leak = { tests: [{ premises: { p: 'A' }, goal: 'A' }] }
  assert.equal(run(leak, proof({}, ['p>goal'], ends(['p']))).pass, true)
})

test('∨ elimination needs both cases to agree', () => {
  const level = { tests: [{ premises: { p: 'A ∨ B' }, goal: 'B ∨ A' }] }
  const caseBody = (side) => ({
    nodes: [{ id: 'a', type: 'assume', params: { name: 'assume' } }, { id: 'o', type: 'out', params: { name: 'out' } }, { id: 'i', type: 'orI', params: side === 'left' ? { other: 'B', side: 'right' } : { other: 'A', side: 'left' } }],
    wires: [{ from: 'a', to: 'i', port: 'a' }, { from: 'i', to: 'o', port: 'in' }],
  })
  const c = proof({ e: ['orE', {}, { left: caseBody('left'), right: caseBody('right') }] }, ['p>e.ab', 'e>goal'], ends(['p']))
  assert.equal(run(level, c).pass, true)
})

test('∀ introduction refuses a variable an open hypothesis mentions', () => {
  const level = { tests: [{ premises: { p: 'P(x)' }, goal: '∀x. P(x)' }] }
  const body = { nodes: [{ id: 'p', type: 'premise', params: { name: 'p' } }, { id: 'o', type: 'out', params: { name: 'out' } }], wires: [{ from: 'p', to: 'o', port: 'in' }] }
  const c = proof({ g: ['allI', { x: 'x' }, { body }] }, ['g>goal'], ends(['p']))
  const r = run(level, c)
  assert.equal(r.pass, false)
  assert.match(r.results[0].errors.get('g').en, /not arbitrary/)
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
  const s = proof({ m: ['mp'] }, ['p>m.imp', 'q>m.a', 'm>goal'], ends(['p', 'q']))
  const lines = validate({ levels: [
    { id: 'mp', kind: 'proof', title: 'mp', tests: [{ premises: { p: 'A → B', q: 'A' }, goal: 'B' }], solution: s, naive: proof({}, ['q>goal'], ends(['p', 'q'])) },
    { id: 'no', kind: 'proof', title: 'no', unprovable: true, tests: [{ goal: '(A → B) → A' }] },
  ] })
  assert.deepEqual(lines.filter((l) => l.fail), [])
})
