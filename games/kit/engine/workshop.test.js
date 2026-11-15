import { test } from 'node:test'
import assert from 'node:assert/strict'
import { packed, runBoard, sink, source } from './boards.js'
import {
  captureWorkshop, featureWorkshop, loadWorkshop, publishWorkshop, workshopAvailable, workshopEntries,
  trayKey, workshopIdentity, workshopInTray, workshopParts,
} from './workshop.js'

const inNode = (id) => ({ id, type: 'in', params: { name: id } })
const outNode = (id) => ({ id, type: 'out', params: { name: id } })
const wire = (from, to, port = 'in') => ({ from, to, port })
const primitive = { inputs: ['in'], eval: ({ in: value }, node) => value * node.params.factor }
const types = { in: source(), out: sink(), multiply: primitive }
const resolve = (type) => types[type]
const identity = (type) => workshopIdentity('math', {}, type)
const empty = () => loadWorkshop({ getItem: () => null })
const drawing = {
  role: ({ type }) => type === 'in' ? 'source' : type === 'out' ? 'sink' : 'part',
  label: ({ type }) => type,
  inputs: () => ['in'],
  outputs: () => null,
}
const base = (factor = 2) => ({
  nodes: [inNode('in'), { id: 'mul', type: 'multiply', params: { factor } }, outNode('out')],
  wires: [wire('in', 'mul'), wire('mul', 'out')],
})
const take = (graph, options = {}) => captureWorkshop(graph, {
  parts: drawing, resolve, identity, defaults: () => ({}), book: empty(), domain: 'math', scope: 'user_mul',
  name: 'Doubler', description: '', tray: trayKey('local', 'first'), ...options,
})
const from = (type) => ({ nodes: [inNode('in'), { id: 'p', type }, outNode('out')], wires: [wire('in', 'p'), wire('p', 'out')] })

test('a workshop snapshot is reusable wherever all its exact base settings are available', () => {
  const piece = take(base())
  let library = publishWorkshop(empty(), piece, { id: piece.id })
  assert.deepEqual(workshopEntries(library).map(({ id }) => id), ['user_mul'])
  assert.equal(library.featured[trayKey('local', 'first')], undefined)
  library = featureWorkshop(library, trayKey('local', 'first'), piece.id, true)
  assert.deepEqual(library.featured[trayKey('local', 'first')], [piece.id])
  const target = { domain: 'math', identity, types: new Set(['multiply']), has: () => true, allows: () => true, resolve }
  assert.ok(workshopAvailable(piece, target))
  assert.ok(workshopInTray(piece, trayKey('other', 'first'), new Set(['multiply'])))
  assert.ok(!workshopInTray(piece, trayKey('other', 'first'), new Set(['different'])))
  assert.ok(!workshopAvailable(piece, { ...target, has: (_type, _key, value) => value !== '2' }))
  assert.ok(!workshopAvailable(piece, { ...target, domain: 'different' }))
  assert.ok(!workshopInTray(piece, trayKey('local', 'second'), new Set(['multiply'])))
  assert.equal(runBoard(from(piece.id), { parts: workshopParts(library, resolve), bind: { in: 5 } }).outputs.out, 10)
})

test('publishing an upgrade hides the earlier automatic version and leaves saved instances runnable', () => {
  const earlier = take(base())
  const upgrade = take(base(3), { scope: 'user_upgrade' })
  const first = publishWorkshop(empty(), earlier, { id: earlier.id, lineage: 'reward' })
  const installed = publishWorkshop(first, upgrade, { id: upgrade.id, lineage: 'reward', rank: 1 })
  assert.deepEqual(workshopEntries(installed).map(({ id }) => id), [upgrade.id])
  assert.equal(publishWorkshop(installed, earlier, { id: 'old-again', lineage: 'reward' }), installed)
  const parts = workshopParts(installed, resolve)
  assert.equal(runBoard(from(earlier.id), { parts, bind: { in: 5 } }).outputs.out, 10)
  assert.equal(runBoard(from(upgrade.id), { parts, bind: { in: 5 } }).outputs.out, 15)
})

test('an already packed course part is captured as a snapshot with its primitive dependencies', () => {
  const nested = base()
  const coursePart = packed({ circuit: nested, inputs: ['in'], outputs: ['out'] })
  const graph = from('coursePart')
  const piece = take(graph, {
    parts: { ...drawing, packed: ({ type }) => type === 'coursePart' },
    resolve: (type) => type === 'coursePart' ? coursePart : resolve(type),
    open: () => ({ circuit: nested, parts: drawing }),
  })
  assert.deepEqual(piece.requirements.map(({ type }) => type), ['multiply'])
  const library = publishWorkshop(empty(), piece, { id: piece.id })
  assert.equal(runBoard(from(piece.id), { parts: workshopParts(library, resolve), bind: { in: 4 } }).outputs.out, 8)
})

test('an incomplete board and a recursive packed dependency cannot be published', () => {
  assert.equal(take({ ...base(), wires: [] }), null)
  const parts = { ...drawing, packed: ({ type }) => type === 'coursePart' }
  const nested = from('coursePart')
  const open = () => ({ circuit: nested, parts, open })
  assert.equal(take(nested, { parts, open }), null)
})

test('publishing a replacement for another reward works even when its old reward was never received', () => {
  const upgrade = take(base(3), { scope: 'user_upgrade' })
  const manual = take(base(4), { scope: 'user_manual' })
  const recorded = publishWorkshop(empty(), manual, { id: manual.id })
  const installed = publishWorkshop(recorded, upgrade, { id: upgrade.id, lineage: 'new', replaces: ['old'] })
  assert.deepEqual(workshopEntries(installed).map(({ id }) => id), [manual.id, upgrade.id])
  assert.equal(publishWorkshop(installed, take(base()), { id: 'older', lineage: 'old' }), installed)
})
