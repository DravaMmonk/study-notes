import { test } from 'node:test'
import assert from 'node:assert/strict'
import { grants, grantIndex, resolveGrant, unavailableGrants } from '../../core/index.js'
import { contentCourse } from '../../core/index.js'
import { referenceResolver } from "../../../../games/kit/engine/objects.js"
const SYMBOL = S.obj({ mark: S.str(), name: S.str(), desc: S.str(), icon: S.str(), stages: S.opt(S.list(S.obj({ id: S.str(), name: S.str() }))) })
import { S, validate } from "../../../../games/kit/engine/schema.js"

if (!grants.types.has('sample/symbol')) grants.register({ type: 'sample/symbol', used: () => [] })

const symbol = { name: '∧', desc: 'Conjunction', icon: 'Rows3', mark: 'logic:mark-formulaAnd', stages: [{ id: 'wide', name: 'AND' }] }
const content = () => ({
  partDefs: { parts: { 'sample/gate': { name: 'Gate' } } },
  registries: { 'sample/symbol': { 'sample/and': structuredClone(symbol) }, 'circuit/part': { 'sample/gate': { name: 'Gate' } } },
  primitives: ['sample/gate', 'sample/and'], trays: {}, eras: [],
  levels: [{ id: 'first', adds: ['sample/gate', 'sample/and'], tasks: [{ id: 'one', opens: ['sample/wide'] }, { id: 'two', withholds: ['sample/wide'] }] }],
})

test('mixed grants keep stages and availability separate by object type', () => {
  const data = content()
  const course = contentCourse(data, { plan: { place: new Map([['first', {}]]), requires: new Map(), order: ['first'] } })
  const state = course.state({ id: 'first', task: 0 }, new Set())
  assert.deepEqual(Object.keys(state), ['circuit/part', 'sample/symbol'])
  assert.deepEqual(Object.keys(state['circuit/part']), ['sample/gate'])
  assert.equal(state['sample/symbol']['sample/and'].name, 'AND')
  assert.equal(state['sample/symbol']['sample/and'].stage, 'sample/wide')
  assert.equal(course.state({ id: 'first', task: 1 }, new Set())['sample/symbol']['sample/and'].name, '∧')
})

test('grant resolution rejects unknown types and cross-type base or stage collisions', () => {
  const index = grantIndex(content().registries)
  assert.equal(resolveGrant(index, 'sample/wide').type, 'sample/symbol')
  assert.throws(() => resolveGrant(index, 'sample/missing'), /unknown grantable/)
  assert.throws(() => grantIndex({ 'circuit/part': { shared: {} }, 'sample/symbol': { shared: symbol } }), /ambiguous grant shared/)
  assert.throws(() => grantIndex({ 'circuit/part': { 'sample/wide': {} }, 'sample/symbol': { 'sample/and': structuredClone(symbol) } }), /ambiguous grant sample\/wide/)
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
