import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createCapabilityRegistry } from '../../engine/capabilities.js'
import logic from './module.js'
import { OPS } from './ops.js'

test('logic registers its boards, languages and typed executable operations', () => {
  const registry = createCapabilityRegistry()
  logic.register(registry)
  assert.deepEqual(Object.keys(registry.tables.board).sort(), ['logic:gates', 'logic:machine', 'logic:proof'])
  assert.deepEqual(Object.keys(registry.tables.language).sort(), ['logic:condition', 'logic:formula', 'logic:side'])
  for (const [name, operation] of Object.entries(registry.tables.operation)) {
    assert.equal(typeof OPS[name].run, 'function', name)
    assert.ok(registry.tables.valueType[operation.returns], name)
    for (const input of operation.args) assert.ok(registry.tables.valueType[input.type], `${name}.${input.name}`)
    assert.equal(operation.params.type, 'obj', name)
  }
  assert.equal(registry.tables.operation['logic:append'].params.fields.ways.default, '2')
  assert.deepEqual(registry.tables.operation['logic:resolve'].params.fields.unit.values, ['any', 'unit'])
})

test('built logic pieces retain the wire types of their public interfaces', async () => {
  const { lemma } = await import('./proof.js')
  const { builtGates } = await import('./gates.js')
  const { builtMachine } = await import('./machine.js')
  const proof = lemma({ statement: 'B', premises: ['A', 'A → B'], metas: ['A', 'B'] })
  assert.deepEqual(proof.inputTypes, { p0: 'logic:judgment', p1: 'logic:judgment' })
  assert.equal(proof.outputType, 'logic:judgment')
  const gates = builtGates({ own: { ports: ['a', 'b'] } }, { own: { taskId: 'builder', target: 'A ∧ B' } }, () => null)
  assert.deepEqual(gates.own.inputTypes, { a: 'circuit:boolean', b: 'circuit:boolean' })
  assert.equal(gates.own.outputType, 'circuit:boolean')
  const machine = builtMachine('own', () => ({}), { inputs: [{ name: 'in' }, { name: 'rules' }] }, () => null)
  assert.deepEqual(machine.inputTypes, { in: 'logic:machine-value', rules: 'logic:machine-value' })
  assert.equal(machine.outputType, 'logic:machine-value')
})
