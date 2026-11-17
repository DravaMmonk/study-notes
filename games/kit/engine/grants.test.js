import { test } from 'node:test'
import assert from 'node:assert/strict'
import { grants, grantIndex, resolveGrant, unavailableGrants } from './grants.js'
import { contentCourse } from './course-model.js'
import { referenceResolver } from './objects.js'
import { SYMBOL } from './content-kinds.js'
import { validate } from './schema.js'

const symbol = { name: '∧', desc: 'Conjunction', icon: 'Rows3', mark: 'logic:mark-formulaAnd', stages: [{ id: 'wide', name: 'AND' }] }
const content = () => ({
  partDefs: { parts: { 'sample/gate': { name: 'Gate' } } },
  registries: { symbol: { 'sample/and': structuredClone(symbol) }, part: { 'sample/gate': { name: 'Gate' } } },
  primitives: ['sample/gate', 'sample/and'], trays: {}, eras: [],
  levels: [{ id: 'first', adds: ['sample/gate', 'sample/and'], tasks: [{ id: 'one', opens: ['sample/wide'] }, { id: 'two', withholds: ['sample/wide'] }] }],
})

test('mixed grants keep stages and availability separate by object type', () => {
  const data = content()
  const course = contentCourse(data, { plan: { place: new Map([['first', {}]]), requires: new Map(), order: ['first'] } })
  const state = course.state({ id: 'first', task: 0 }, new Set())
  assert.deepEqual(Object.keys(state), ['part', 'symbol'])
  assert.deepEqual(Object.keys(state.part), ['sample/gate'])
  assert.equal(state.symbol['sample/and'].name, 'AND')
  assert.equal(state.symbol['sample/and'].stage, 'sample/wide')
  assert.equal(course.state({ id: 'first', task: 1 }, new Set()).symbol['sample/and'].name, '∧')
})

test('grant resolution rejects unknown types and cross-type base or stage collisions', () => {
  const index = grantIndex(content().registries)
  assert.equal(resolveGrant(index, 'sample/wide').type, 'symbol')
  assert.throws(() => resolveGrant(index, 'sample/missing'), /unknown grantable/)
  assert.throws(() => grantIndex({ part: { shared: {} }, symbol: { shared: symbol } }), /ambiguous grant shared/)
  assert.throws(() => grantIndex({ part: { 'sample/wide': {} }, symbol: { 'sample/and': structuredClone(symbol) } }), /ambiguous grant sample\/wide/)
  const problems = []
  referenceResolver({ quote: { 'sample/text': {} } }, problems)('sample/text', 'grant')
  assert.deepEqual(problems, [])
  assert.deepEqual(validate(SYMBOL, { ...symbol, editor: 'strip' }, { vocabulary: { kinds: { mark: { 'logic:mark-formulaAnd': {} } } } }).map(problem => problem.at), ['.editor'])
})

test('a newly registered object type participates without edits to the course or resolver', () => {
  grants.register({ type: 'token', used: work => work.tokens ?? [] })
  try {
    const data = content()
    data.registries.token = { 'sample/token': { name: 'Token', stages: [{ id: 'token-next', name: 'Next' }] } }
    data.levels[0].gives = ['sample/token-next']
    const course = contentCourse(data, { plan: { place: new Map([['first', {}]]), requires: new Map(), order: ['first'] } })
    assert.equal(course.state({ id: 'first', task: 0 }, new Set()).token['sample/token'].name, 'Next')
    assert.deepEqual(unavailableGrants(course, { tokens: ['sample/token'] }, { id: 'first', task: 0 }, new Set()), [])
    assert.match(unavailableGrants(course, { tokens: ['sample/missing'] }, { id: 'first', task: 0 }, new Set())[0], /unknown token/)
    data.levels[0].tasks[0].withholds = ['sample/token']
    assert.match(unavailableGrants(course, { tokens: ['sample/token'] }, { id: 'first', task: 0 }, new Set())[0], /unavailable/)
  } finally {
    grants.types.delete('token')
  }
})

test('a symbol reference requires the earliest stage that supplies its mark', () => {
  const data = content()
  data.registries.symbol['sample/and'].stages = [{ id: 'wide', mark: 'logic:mark-formulaOr' }]
  const course = contentCourse(data, { plan: { place: new Map([['first', {}]]), requires: new Map(), order: ['first'] } })
  const work = { kind: 'logic:translate', target: 'A ∨ B' }
  assert.deepEqual(unavailableGrants(course, work, { id: 'first', task: 0 }, new Set()), [])
  assert.match(unavailableGrants(course, work, { id: 'first', task: 1 }, new Set())[0], /symbol sample\/wide is unavailable/)
})
