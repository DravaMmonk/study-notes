import { test } from 'node:test'
import assert from 'node:assert/strict'
import { modules, capabilities, vocabulary } from './kernel.js'
import { moduleProblems } from './contract.js'
import { createCapabilityRegistry } from './capabilities.js'
import { typeProblems } from './parts/types.js'
import { S } from './schema.js'
import { parse, print } from './parts/expr.js'

for (const module of modules) test(`${module.id}: registered capabilities satisfy the module contract`, () => {
  assert.deepEqual(moduleProblems(module, capabilities), [])
})

test('each kind rejects duplicate names and permits a name shared across kinds', () => {
  const registry = createCapabilityRegistry()
  registry.add('valueType', 'toy:number', { about: 'number' })
  registry.add('operation', 'toy:number', { about: 'number' })
  assert.throws(() => registry.add('valueType', 'toy:number', {}), /duplicate/)
  assert.throws(() => registry.add('operation', 'plain', {}), /invalid capability name/)
  assert.ok(vocabulary.version >= 1)
})

test('qualified operation names round-trip beside match case delimiters', () => {
  const expression = "match $op { add: circuit:add(a, b), _: image:gauss(a, 1, 'crop') }"
  assert.equal(print(parse(expression)), expression)
})

test('types check nested operations, branches and outputs across modules', () => {
  const vocabulary = { kinds: {
    valueType: { 'toy:number': {}, 'toy:image': {} },
    op: {
      'math:add': { args: [{ name: 'a', type: 'toy:number' }, { name: 'b', type: 'toy:number' }], returns: 'toy:number', params: S.obj({}) },
      'picture:blur': { args: [{ name: 'a', type: 'toy:image' }], returns: 'toy:image', params: S.obj({}) },
    },
  } }
  const part = { inputs: [{ name: 'a', type: 'toy:number' }], outputType: 'toy:number', op: 'math:add' }
  assert.deepEqual(typeProblems({ parts: { sample: part } }, vocabulary), [])
  assert.match(typeProblems({ parts: { sample: { ...part, outputType: 'toy:image', op: 'picture:blur' } } }, vocabulary)[0].says, /input types/)
  assert.match(typeProblems({ parts: { sample: { ...part, outputType: 'toy:image' } } }, vocabulary)[0].says, /output type/)
})

test('named parameters are checked using their declared value type', () => {
  const schema = { kinds: { valueType: { 'circuit:number': {} }, op: {
    'toy:scale': { args: [{ name: 'a', type: 'circuit:number' }], returns: 'circuit:number', params: S.obj({ label: S.str() }) },
  } } }
  const file = { parts: { sample: {
    inputs: [{ name: 'a', type: 'circuit:number' }], outputType: 'circuit:number', settings: { 'label': { control: 'number', default: 1 } }, op: 'toy:scale',
  } } }
  assert.match(typeProblems(file, schema)[0].says, /parameter label/)
})

test('module contracts reject missing implementations and incomplete signatures', () => {
  const registry = createCapabilityRegistry()
  registry.add('operation', 'toy:empty', { about: 'Empty', signatures: [] })
  registry.add('operation', 'toy:missing', { about: 'Missing' })
  const problems = moduleProblems({ id: 'toy', register() {} }, registry)
  assert.ok(problems.some((problem) => problem.includes('no runtime implementation')))
  assert.ok(problems.some((problem) => problem.includes('no signatures')))
  assert.ok(problems.some((problem) => problem.includes('no argument signature')))
  assert.ok(problems.some((problem) => problem.includes('no parameter declaration')))
})

test('operations from another module execute through the normal part compiler', async () => {
  const { defineParts } = await import('./parts/define.js')
  const { PARTS } = defineParts({ parts: { sample: {
    inputs: [{ name: 'a', type: 'circuit:number' }], outputType: 'circuit:number', op: 'circuit:add',
  } } }, {})
  assert.equal(PARTS.sample.eval({ a: 3, b: 3 }, {}), 6)
})

test('circuit evaluation rejects an incompatible typed wire', async () => {
  const { evaluate } = await import('./circuit.js')
  const graph = { nodes: [{ id: 'source', type: 'source' }, { id: 'target', type: 'target' }], wires: [{ from: 'source', to: 'target', port: 'a' }] }
  const parts = {
    source: { inputs: [], outputType: 'circuit:boolean', eval: () => true },
    target: { inputs: ['a'], inputTypes: { a: 'circuit:number' }, outputType: 'circuit:number', eval: ({ a }) => a },
  }
  assert.match(evaluate(graph, { parts }).errors.get('target'), /expects circuit:number, received circuit:boolean/)
})


test('module contracts require a display implementation owned by that module', () => {
  const registry = createCapabilityRegistry()
  registry.add('display', 'toy:hero', { about: 'Map illustration', role: 'hero' })
  assert.ok(moduleProblems({ id: 'toy', register() {} }, registry).some((problem) => problem.includes('no display implementation')))
  registry.implementDisplays(['toy:hero'], '../modules/other/ui/displays.js')
  assert.ok(moduleProblems({ id: 'toy', register() {} }, registry).some((problem) => problem.includes('outside its module UI')))
})
