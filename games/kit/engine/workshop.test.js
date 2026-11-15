import { test } from 'node:test'
import assert from 'node:assert/strict'
import { packed, runBoard, sink, source } from './boards.js'
import {
  addWorkshopPort, captureWorkshop, draftWorkshop, dropWorkshopPort, featureWorkshop, loadWorkshop, nameWorkshopPort,
  publishWorkshop, workshopAvailable, workshopEntries, workshopPorts, trayKey, workshopIdentity, workshopInTray, workshopParts,
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

test('workshop compatibility follows resolved settings and executable checks across catalogs', () => {
  const declaration = {
    inputs: [{ name: 'in' }],
    compute: 'multiply(in, $factor)',
    checks: [{ holds: 'positive($factor)', say: { en: 'Use a positive factor.' } }],
  }
  const setting = { control: 'number', default: 2, min: 1, max: 8 }
  const catalog = (id, definition, part = declaration) => ({
    settings: { [id]: definition },
    parts: { multiply: { ...part, settings: [{ key: 'factor', setting: id }] } },
  })
  const identityFor = (file) => (type) => workshopIdentity('math', file, type)
  const original = identityFor(catalog('original', setting))
  const piece = take(base(), { identity: original })
  const accepts = (file) => workshopAvailable(piece, {
    domain: 'math', identity: identityFor(file), types: new Set(['multiply']), has: () => true, allows: () => true, resolve,
  })
  assert.ok(accepts(catalog('renamed', { ...setting, label: 'Gain', stepper: true }, {
    ...declaration, inputs: [{ name: 'in', label: 'Signal' }],
    checks: [{ holds: declaration.checks[0].holds, say: { en: 'Gain must be positive.' } }],
  })))
  assert.ok(!accepts(catalog('original', { control: 'toggle', default: true })))
  assert.ok(!accepts(catalog('original', { ...setting, default: 3 })))
  assert.ok(!accepts(catalog('original', { ...setting, max: 6 })))
  assert.ok(!accepts(catalog('original', setting, { ...declaration, checks: [] })))
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

test('the interface lists a board\'s own terminals and the outputs read from a shared source', () => {
  const shared = { ...drawing, role: ({ type }) => type === 'bank' ? 'source' : drawing.role({ type }), outputs: ({ type }) => type === 'bank' ? [{ key: 'x' }, { key: 'y' }] : null }
  const graph = {
    nodes: [inNode('a'), { id: 'bank', type: 'bank' }, { id: 'mul', type: 'multiply', params: { factor: 2 } }, outNode('out')],
    wires: [wire('bank#y', 'mul'), wire('mul', 'out')],
  }
  const ports = workshopPorts(graph, shared, { inputs: { 'bank#y': 'height' } })
  assert.deepEqual(ports.inputs.map(({ ref, name, wired, plain }) => [ref, name, wired, plain]), [['a', 'a', false, true], ['bank#y', 'height', true, false]])
  assert.deepEqual(ports.outputs.map(({ ref, name, wired }) => [ref, name, wired]), [['out', 'out', true]])
})

test('terminals are added beside the last of their side and removed with their wires, never the last one', () => {
  const start = { nodes: [{ ...inNode('in'), x: 20, y: 40 }, { ...outNode('out'), x: 900, y: 40 }], wires: [] }
  const two = addWorkshopPort(start, drawing, 'inputs')
  assert.deepEqual(two.nodes.at(-1), { id: 'in1', type: 'in', params: { name: 'in1' }, x: 20, y: 160 })
  const three = addWorkshopPort(two, drawing, 'inputs')
  assert.equal(three.nodes.at(-1).y, 280)
  assert.equal(addWorkshopPort(start, drawing, 'outputs').nodes.at(-1).id, 'out1')
  const wired = { ...two, wires: [wire('in1', 'out')] }
  assert.deepEqual(dropWorkshopPort(wired, drawing, 'inputs', 'in1'), { ...start, wires: [] })
  assert.equal(dropWorkshopPort(start, drawing, 'inputs', 'in'), start)
  assert.equal(addWorkshopPort({ nodes: [outNode('out')], wires: [] }, drawing, 'inputs'), null)
})

test('a port name is trimmed and must be unique on its side', () => {
  const graph = addWorkshopPort(base(), drawing, 'inputs')
  const ports = workshopPorts(graph, drawing)
  assert.deepEqual(nameWorkshopPort({}, ports, 'inputs', 'in', ' 底数 '), { inputs: { in: '底数' } })
  assert.equal(nameWorkshopPort({}, ports, 'inputs', 'in', 'in1'), null)
  assert.equal(nameWorkshopPort({}, ports, 'inputs', 'in', '  '), null)
  assert.deepEqual(nameWorkshopPort({}, ports, 'outputs', 'out', 'in1'), { outputs: { out: 'in1' } })
})

test('a snapshot takes the interface\'s names and input order, and runs under them', () => {
  const add = { inputs: ['a', 'b'], eval: ({ a, b }) => a - b }
  const parts = { ...drawing, inputs: ({ type }) => type === 'sub' ? ['a', 'b'] : ['in'] }
  const graph = {
    nodes: [inNode('first'), inNode('second'), { id: 'sub', type: 'sub' }, outNode('out')],
    wires: [wire('second', 'sub', 'b'), wire('first', 'sub', 'a'), wire('sub', 'out')],
  }
  const lookup = (type) => type === 'sub' ? add : resolve(type)
  const piece = take(graph, {
    parts, resolve: lookup, names: { inputs: { first: '被减数' }, outputs: { out: '差' } }, order: ['first', 'second'],
  })
  assert.deepEqual(piece.inputs, ['被减数', 'second'])
  assert.deepEqual(piece.outputs, ['差'])
  const library = publishWorkshop(empty(), piece, { id: piece.id })
  const board = {
    nodes: [inNode('x'), inNode('y'), { id: 'p', type: piece.id }, outNode('out')],
    wires: [wire('x', 'p', '被减数'), wire('y', 'p', 'second'), wire('p', 'out')],
  }
  assert.equal(runBoard(board, { parts: workshopParts(library, lookup), bind: { x: 9, y: 4 } }).outputs.out, 5)
})

test('a tray keeps one draft until it is cleared', () => {
  const tray = trayKey('local', 'first')
  const kept = draftWorkshop(empty(), tray, { graph: base(), names: {} })
  assert.deepEqual(kept.drafts[tray].graph, base())
  assert.deepEqual(draftWorkshop(kept, tray, null).drafts, {})
  assert.deepEqual(loadWorkshop({ getItem: () => JSON.stringify({ pieces: {}, published: {}, featured: {} }) }).drafts, {})
})
