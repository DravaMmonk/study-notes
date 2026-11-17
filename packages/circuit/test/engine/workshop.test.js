import { test } from 'node:test'
import assert from 'node:assert/strict'
import { packed, runBoard, sink, source } from '../../core/index.js'
import { captureWorkshop, draftWorkshop, featureWorkshop, loadWorkshop, publishWorkshop, removeWorkshopPart, workshopAvailable, workshopCompatible, workshopEntries, trayKey, workshopIdentity, workshopInTray, workshopParts } from '../../core/index.js'

import { addTerminalPort, addWorkshopTerminal, editWorkshopTerminal, flattenWorkshopTerminals, sideLabels, terminalPorts, workshopTerminalParts, WORKSHOP_OUTPUT } from '../../core/index.js'

const inNode = (id) => ({ id, type: 'in', params: { name: id } })
const outNode = (id) => ({ id, type: 'out', params: { name: id } })
const wire = (from, to, port = 'in') => ({ from, to, port })
const primitive = { inputs: ['in'], eval: ({ in: value }, node) => value * node.params.factor }
const types = { in: source(), out: sink(), multiply: primitive }
const resolve = (type) => types[type]
const identity = (type) => workshopIdentity({}, type)
const empty = () => loadWorkshop({ getItem: () => null })
const drawing = {
  role: ({ type }) => type === 'in' ? 'source' : type === 'out' ? 'sink' : 'circuit/part',
  label: ({ type }) => type,
  inputs: () => ['in'],
  outputs: () => null,
}
const base = (factor = 2) => ({
  nodes: [inNode('in'), { id: 'mul', type: 'multiply', params: { factor } }, outNode('out')],
  wires: [wire('in', 'mul'), wire('mul', 'out')],
})
const take = (graph, options = {}) => captureWorkshop(graph, {
  parts: drawing, resolve, identity, defaults: () => ({}), book: empty(), scope: 'user_mul',
  name: 'Doubler', description: '', tray: trayKey('local', 'first'), ...options,
})
const from = (type) => ({ nodes: [inNode('in'), { id: 'p', type }, outNode('out')], wires: [wire('in', 'p'), wire('p', 'out')] })

test('a workshop snapshot is reusable wherever all its exact base settings are available', () => {
  const part = take(base())
  let library = publishWorkshop(empty(), part, { id: part.id })
  assert.deepEqual(workshopEntries(library).map(({ id }) => id), ['user_mul'])
  assert.equal(library.featured[trayKey('local', 'first')], undefined)
  library = featureWorkshop(library, trayKey('local', 'first'), part.id, true)
  assert.deepEqual(library.featured[trayKey('local', 'first')], [part.id])
  const target = { identity, types: new Set(['multiply']), has: () => true, allows: () => true, resolve }
  assert.ok(workshopAvailable(part, target))
  assert.ok(workshopInTray(part, trayKey('other', 'first'), new Set(['multiply'])))
  assert.ok(!workshopInTray(part, trayKey('other', 'first'), new Set(['different'])))
  assert.ok(!workshopAvailable(part, { ...target, has: (_type, _key, value) => value !== '2' }))
  assert.ok(!workshopInTray(part, trayKey('local', 'second'), new Set(['multiply'])))
  assert.equal(runBoard(from(part.id), { parts: workshopParts(library, resolve), bind: { in: 5 } }).outputs.out, 10)
})

test('workshop compatibility follows resolved settings and executable checks across catalogs', () => {
  const declaration = {
    inputs: [{ name: 'in' }],
    op: 'multiply',
    checks: [{ holds: 'positive($factor)', say: { en: 'Use a positive factor.' } }],
  }
  const setting = { control: 'number', default: 2, min: 1, max: 8 }
  const catalog = (id, definition, part = declaration) => ({

    parts: { multiply: { ...part, settings: { 'factor': definition } } },
  })
  const identityFor = (file) => (type) => workshopIdentity(file, type)
  const original = identityFor(catalog('original', setting))
  const part = take(base(), { identity: original })
  const accepts = (file) => workshopAvailable(part, {
    identity: identityFor(file), types: new Set(['multiply']), has: () => true, allows: () => true, resolve,
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

test('deleting a manual part removes its tray pins and preserves saved boards and nested versions', () => {
  const part = take(base())
  const added = publishWorkshop(empty(), part, { id: part.id })
  const nested = take(from(part.id), { book: added, scope: 'user_nested' })
  const owned = publishWorkshop(added, nested, { id: nested.id })
  const anotherTray = trayKey('local', 'second')
  const pinned = featureWorkshop(featureWorkshop(owned, part.tray, part.id, true), anotherTray, part.id, true)
  const draft = { graph: from(part.id), names: {} }
  const deleted = removeWorkshopPart(draftWorkshop(pinned, part.tray, draft), part.id)
  const saved = loadWorkshop({ getItem: () => JSON.stringify(deleted) })

  assert.deepEqual(workshopEntries(saved).map(({ id }) => id), [nested.id])
  assert.deepEqual(saved.featured, {})
  assert.equal(featureWorkshop(saved, part.tray, part.id, true), saved)
  assert.deepEqual(saved.drafts[part.tray], draft)
  const parts = workshopParts(saved, resolve)
  assert.equal(runBoard(saved.drafts[part.tray].graph, { parts, bind: { in: 5 } }).outputs.out, 10)
  assert.equal(runBoard(from(nested.id), { parts, bind: { in: 5 } }).outputs.out, 10)

  const reward = publishWorkshop(empty(), part, { id: part.id, lineage: 'reward' })
  assert.equal(removeWorkshopPart(reward, part.id), reward)
})

test('an already packed course part is captured as a snapshot with its primitive dependencies', () => {
  const nested = base()
  const coursePart = packed({ circuit: nested, inputs: ['in'], outputs: ['out'] })
  const graph = from('coursePart')
  const part = take(graph, {
    parts: { ...drawing, packed: ({ type }) => type === 'coursePart' },
    resolve: (type) => type === 'coursePart' ? coursePart : resolve(type),
    open: () => ({ circuit: nested, parts: drawing }),
  })
  assert.deepEqual(part.requirements.map(({ type }) => type), ['multiply'])
  const library = publishWorkshop(empty(), part, { id: part.id })
  assert.equal(runBoard(from(part.id), { parts: workshopParts(library, resolve), bind: { in: 4 } }).outputs.out, 8)
})

test('a packed snapshot reads its captured primitives even when the outer board does not offer them', () => {
  const part = take(base())
  const library = publishWorkshop(empty(), part, { id: part.id })
  const captured = workshopParts(library, resolve)
  const parts = { in: types.in, out: types.out, [part.id]: captured(part.id) }
  assert.equal(runBoard(from(part.id), { parts, bind: { in: 6 } }).outputs.out, 12)
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

test('draft terminals can be added, given ports, labelled, and removed along with their wires', () => {
  const start = { nodes: [], wires: [] }
  const graph = addWorkshopTerminal(addWorkshopTerminal(start, drawing, 'source', 'Input'), drawing, 'sink', 'Output')
  const [input, output] = graph.nodes
  const draft = editWorkshopTerminal(graph, drawing, input.id, {
    text: 'External source', ports: addTerminalPort(terminalPorts(drawing, input), 'Input', sideLabels(graph, drawing, 'source')),
  })
  const rendered = workshopTerminalParts(drawing)
  assert.deepEqual([input.terminal.text, input.terminal.ports[0].label, output.terminal.text], ['Input', 'Input', 'Output'])
  assert.equal(addWorkshopTerminal(graph, drawing, 'source', 'Input').nodes.at(-1).terminal.text, 'Input 2')
  assert.deepEqual(draft.nodes[0].terminal.ports.map(({ label }) => label), ['Input', 'Input 2'])
  assert.equal(rendered.label(draft.nodes[0]), 'External source')
  assert.equal(rendered.outputs(draft.nodes[0]).length, 2)
  const extra = draft.nodes[0].terminal.ports[1].key
  const wired = { ...draft, wires: [wire(input.id, output.id), wire(`${input.id}#${extra}`, output.id)] }
  const shrunk = editWorkshopTerminal(wired, drawing, input.id, {
    text: 'External source', ports: terminalPorts(drawing, draft.nodes[0]).slice(0, 1),
  })
  assert.deepEqual(shrunk.wires, [wire(input.id, output.id)])
  assert.deepEqual(editWorkshopTerminal(shrunk, drawing, output.id, null).wires, [])
  assert.equal(editWorkshopTerminal(shrunk, drawing, output.id, null).nodes.length, 1)
})

test('a multiport draft packages each wired input and every output as an independent port', () => {
  const raw = addWorkshopTerminal(addWorkshopTerminal({ nodes: [], wires: [] }, drawing, 'source', 'Input'), drawing, 'sink', 'Output')
  let [a, b] = raw.nodes
  const widen = (node, names) => ({
    ...node, terminal: { ...node.terminal, ports: names.slice(1).reduce((ports) => addTerminalPort(ports, 'p'), node.terminal.ports)
      .map((port, i) => ({ ...port, label: names[i] })) },
  })
  a = widen(a, ['left', 'right', 'unused'])
  b = widen(b, ['first', 'second'])
  const [first, second] = b.terminal.ports
  const graph = { nodes: [a, b], wires: [wire(a.id, b.id, first.key), wire(`${a.id}#${a.terminal.ports[1].key}`, b.id, second.key)] }
  const draft = flattenWorkshopTerminals(graph, drawing)
  assert.deepEqual(draft.missing, [])
  assert.deepEqual(flattenWorkshopTerminals({ ...graph, wires: graph.wires.slice(0, 1) }, drawing).missing, ['second'])
  const part = take(draft.graph, { parts: workshopTerminalParts(drawing), names: draft.names, order: draft.order })
  assert.deepEqual(part.inputs, ['left', 'right'])
  assert.deepEqual(part.outputs, ['first', 'second'])
  assert.deepEqual(part.terminals, [WORKSHOP_OUTPUT])
  assert.equal(workshopCompatible(part, { resolve, identity }), true)
  const engine = workshopParts({ parts: { [part.id]: part } }, resolve)
  assert.deepEqual(runBoard(part.graph, { parts: engine, bind: { left: 7, right: 3 } }).outputs, { first: 7, second: 3 })
})

test('a snapshot takes the interface\'s names and input order, and runs under them', () => {
  const add = { inputs: ['a', 'b'], eval: ({ a, b }) => a - b }
  const parts = { ...drawing, inputs: ({ type }) => type === 'sub' ? ['a', 'b'] : ['in'] }
  const graph = {
    nodes: [inNode('first'), inNode('second'), { id: 'sub', type: 'sub' }, outNode('out')],
    wires: [wire('second', 'sub', 'b'), wire('first', 'sub', 'a'), wire('sub', 'out')],
  }
  const lookup = (type) => type === 'sub' ? add : resolve(type)
  const part = take(graph, {
    parts, resolve: lookup, names: { inputs: { first: '被减数' }, outputs: { out: '差' } }, order: ['first', 'second'],
  })
  assert.deepEqual(part.inputs, ['被减数', 'second'])
  assert.deepEqual(part.outputs, ['差'])
  const library = publishWorkshop(empty(), part, { id: part.id })
  const board = {
    nodes: [inNode('x'), inNode('y'), { id: 'p', type: part.id }, outNode('out')],
    wires: [wire('x', 'p', '被减数'), wire('y', 'p', 'second'), wire('p', 'out')],
  }
  assert.equal(runBoard(board, { parts: workshopParts(library, lookup), bind: { x: 9, y: 4 } }).outputs.out, 5)
})

test('a tray keeps one draft until it is cleared', () => {
  const tray = trayKey('local', 'first')
  const kept = draftWorkshop(empty(), tray, { graph: base(), names: {} })
  assert.deepEqual(kept.drafts[tray].graph, base())
  assert.deepEqual(draftWorkshop(kept, tray, null).drafts, {})
  assert.deepEqual(loadWorkshop({ getItem: () => JSON.stringify({ parts: {}, published: {}, featured: {} }) }).drafts, {})
})

test('workshop identity follows the operation while stage progress keeps the part identity stable', () => {
  const part = { op: 'toy:scale', settings: { gain: { control: 'number', default: 2 } } }
  const signature = workshopIdentity({ parts: { scale: part } }, 'scale')
  assert.notEqual(workshopIdentity({ parts: { scale: { ...part, op: 'toy:divide' } } }, 'scale'), signature)
  assert.equal(workshopIdentity({ parts: { scale: { ...part, stages: [{ id: 'adjustable', settings: { gain: {} } }] } } }, 'scale'), signature)
})
