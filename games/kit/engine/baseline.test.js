import { test } from 'node:test'
import assert from 'node:assert/strict'
import { baselineValue, tableFieldsBaseline, versionMetadataBaseline, differences, nameNormalizer, packBaseline, unpackBaseline } from './baseline-value.js'
import { tableReports } from '../../../packages/state-graph/core/baseline.js'
import { imageReports } from '../../../packages/image/core/baseline.js'
import { taskReports } from './baseline-reports.js'

test('stable serialization keeps nonfinite values, sets, maps and ordered trace steps', () => {
  const a = baselineValue({ z: new Set(['b', 'a']), m: new Map([['b', undefined], ['a', NaN]]), trace: [2, 1], data: new Float32Array([0.5]), zero: -0 })
  const b = baselineValue({ zero: -0, data: new Float32Array([0.5]), trace: [2, 1], m: new Map([['a', NaN], ['b', undefined]]), z: new Set(['a', 'b']) })
  assert.equal(JSON.stringify(a), JSON.stringify(b))
  assert.deepEqual(a.m.$map[0][1], { $number: 'NaN' })
  assert.notDeepEqual(a.m.$map[0][1], null)
  assert.deepEqual(a.trace, [2, 1])
  assert.deepEqual(differences(a, b), [])
  assert.equal(differences(a, { ...b, trace: [1, 2] }).length, 2)
  const cyclic = {}; cyclic.self = cyclic
  assert.throws(() => baselineValue(cyclic), /cyclic/)
})
test('migration names normalize without erasing real differences or ambiguous identities', () => {
  const before = nameNormalizer(['old/lesson', 'table:world-river', 'old/task'])
  const after = nameNormalizer(['new/lesson', 'state:river', 'new/task'])
  const a = { 'old/lesson': { task: 'old/task', text: 'table:world-river: PASS', value: 2, formula: 'A/B' } }
  const b = { 'new/lesson': { task: 'new/task', text: 'state:river: PASS', value: 2, formula: 'A/B' } }
  assert.deepEqual(differences(before(a), after(b)), [])
  b['new/lesson'].value = 3
  assert.equal(differences(before(a), after(b))[0].path, '$/lesson/value')
  const ambiguous = nameNormalizer(['one/x', 'two/x'])
  assert.equal(ambiguous('one/x two/x'), 'one/x two/x')
  assert.equal(before('old/lesson-extra A/B'), 'old/lesson-extra A/B')
  assert.throws(() => before({ 'old/task': 1, task: 2 }), /collision/)
})
test('task observations retain passing/failed hand steps and hidden image traces', async () => {
  const hand = { id: 'tiny', taskId: 'hand', play: 'state-graph:fill', cells: [{ id: 's' }, { id: 'e' }], edges: [['s', 'e']], start: 's', end: 'e' }
  const [observed] = await taskReports({ levels: [{ id: 'tiny' }], table: { played: new Map([['tiny', [hand]]]) } }, [{ baselineReports: tableReports }])
  assert.equal(observed.report.reference.report.pass, true)
  assert.equal(observed.report.naive.report.pass, false)
  assert.equal(observed.report.reference.report.steps.length, 2)
  let tested
  const [image] = await taskReports({ levels: [{ id: 'tiny', tasks: [{ id: 'g', kind: 'image:graph', solution: 'yes', naive: 'no', tests: [{ n: 1 }], hidden: [{ n: 2 }] }] }], kit: { runLevel: (task, work, options) => { tested = task.tests; return { pass: work === 'yes', trace: options.traced ? ['step'] : [] } } } }, [{ baselineReports: imageReports }])
  assert.deepEqual(tested, [{ n: 1 }, { n: 2, hidden: true }])
  assert.deepEqual(image.report.reference.report.trace, ['step'])
  assert.equal(image.report.naive.report.pass, false)
})

test('disk encoding retains shared terms and comparison ignores object sharing', () => {
  const term = { op: 'atom', name: 'A' }
  const shared = { steps: Array.from({ length: 100 }, () => ({ term })) }
  const restored = unpackBaseline(JSON.parse(JSON.stringify(packBaseline(shared))))
  assert.equal(restored.steps[0].term, restored.steps[99].term)
  assert.deepEqual(differences(restored, structuredClone(JSON.parse(JSON.stringify(shared)))) , [])
  assert.deepEqual(differences(baselineValue(restored), baselineValue(shared)), [])
  assert.equal(JSON.stringify(packBaseline(shared)), JSON.stringify(packBaseline(shared)))
})

test('namespace normalization reorders unordered maps after relocation', () => {
  const old = nameNormalizer(['alpha/z', 'zeta/a'])
  const current = nameNormalizer(['lib/z', 'lib/a'])
  assert.deepEqual(differences(old(baselineValue(new Map([['alpha/z', 1], ['zeta/a', 2]]))), current(baselineValue(new Map([['lib/a', 2], ['lib/z', 1]])))), [])
})

test('the declared piece-to-part migration changes only naming in diagnostics and keys', () => {
  const normalize = nameNormalizer([])
  assert.deepEqual(normalize({ piece: 'x', parts: ['x'] }), { part: 'x', parts: ['x'] })
  assert.deepEqual(normalize({ kind: 'piece', path: 'pieces/x.json', key: '@pkg/piece.x.name', tag: 'tags/piece/x' }), normalize({ kind: 'circuit/part', path: 'parts/x.json', key: '@pkg/part.x.name', tag: 'tags/circuit/part/x' }))
  assert.equal(differences(normalize({ kind: 'piece', value: 1 }), normalize({ kind: 'circuit/part', value: 2 })).length, 1)
})


test('migration normalization precedes registered aliases and preserves semantic differences', () => {
  const old = nameNormalizer(['table:world-pieces'])
  const current = nameNormalizer(['table:world-parts'])
  assert.equal(old('table:world-pieces'), current('table:world-parts'))
  assert.deepEqual(old({ pieces: [], pieceRules: [], earnedPieces: [], code: 'missing-piece', path: 'overrides/base/tag/piece/a.json' }), current({ parts: [], partRules: [], earnedParts: [], code: 'missing-part', path: 'overrides/base/tags/part/a.json' }))
  assert.equal(old('You pieced it together.'), current('You assembled it.'))
  assert.equal(differences(old({ score: 1 }), current({ score: 2 })).length, 1)
})

test('only the eight migrated formula symbols normalize ownership and retain their definitions', () => {
  const normalize = nameNormalizer(['qed/formulaAnd', 'qed/other'])
  const legacy = { structure: { parts: { parts: { 'qed/formulaAnd': { editor: 'strip', name: '∧', desc: '@qed/part.formulaAnd.desc' }, 'qed/other': { editor: 'strip' } } } } }
  const current = { structure: { parts: { parts: { 'qed/other': { editor: 'strip' } } }, symbols: { 'qed/formulaAnd': { name: '∧', desc: '@qed/symbol.formulaAnd.desc' } } } }
  assert.deepEqual(differences(normalize(legacy), normalize(current)), [])
  current.structure.symbols['qed/formulaAnd'].name = 'changed'
  assert.ok(differences(normalize(legacy), normalize(current)).length)
  assert.equal(normalize({ other: { editor: 'strip' } }).other.editor, 'strip')
  assert.equal(normalize('part.formulaAndExtra.desc'), 'part.formulaAndExtra.desc')
  assert.equal(normalize('other/part.formulaAnd.desc'), 'other/part.formulaAnd.desc')
  assert.equal(normalize('other/parts/formulaAnd.json'), 'other/parts/formulaAnd.json')
})

test('typed tag inventory aliases and only the five retired QED grant edges normalize', () => {
  const old = nameNormalizer(['qed/proof', 'qed/natInd', 'qed/formulaForall'])
  const now = nameNormalizer(['qed/proof', 'level:qed/proof', 'qed/natInd', 'qed/formulaForall'])
  const before = { structure: { relations: { order: [{ from: 'qed/natInd', to: 'qed/formulaForall', of: 'grant' }] } }, text: 'qed/proof' }
  const after = { structure: { relations: { order: [{ from: 'qed/natInd', to: 'qed/formulaForall' }] } }, text: 'qed/proof' }
  assert.deepEqual(differences(old(before), now(after)), [])
  after.structure.relations.order[0].from = 'qed/other'
  assert.ok(differences(old(before), now(after)).length)
  const unrelated = { structure: { relations: { order: [{ from: 'other/natInd', to: 'qed/formulaForall' }] } } }
  assert.equal(now(unrelated).structure.relations.order[0].of, undefined)
  assert.notEqual(nameNormalizer(['qed/proof', 'level:other/proof'])('qed/proof'), 'proof')
})

test('step 3 normalization is limited to tag copy keys and missing-target diagnostic wording', async () => {
  const { existenceBaseline, differences } = await import('./baseline-value.js')
  const before = { title: { en: 'Same', $key: 'sample/glossary.groups.basics.title' }, tray: { $key: 'sample/tray.basics.title' }, check: { status: 1, stdout: '  FAIL content: tags/sample/all: unknown level sample/missing\n' } }
  const after = { ...before, title: { en: 'Same', $key: 'sample/tag.basics.title' }, check: { status: 1, stdout: '  FAIL content: tags/sample/all: missing target level sample/missing\n' } }
  assert.deepEqual(differences(existenceBaseline(before), existenceBaseline(after)), [])
  assert.equal(existenceBaseline(before).tray.$key, 'sample/tray.basics.title')
  assert.ok(differences(existenceBaseline(before), existenceBaseline({ ...after, title: { en: 'Changed', $key: 'sample/tag.basics.title' } })).length)
  assert.equal(existenceBaseline({ prose: 'unknown level sample/missing', $key: 'sample/group.basics.other' }).prose, 'unknown level sample/missing')
  assert.equal(existenceBaseline({ $key: 'sample/group.basics.other' }).$key, 'sample/group.basics.other')
})

test('version metadata normalizes only initial named configurations and preserves package order and other ranges', () => {
  const before = { 'package.json': { vocabulary: 14, uses: ['library'] }, 'game.json': { packages: ['course', 'library'], title: 'Course' } }
  const after = { 'package.json': { version: '1.0.0', kernel: '^1.0.0', uses: { library: '^1.0.0' } }, 'game.json': { kernel: '^1.0.0', packages: { course: '^1.0.0', library: '^1.0.0' }, title: 'Course' } }
  assert.deepEqual(versionMetadataBaseline(before), versionMetadataBaseline(after))
  after['game.json'].packages.library = '~1.0.0'
  assert.notDeepEqual(versionMetadataBaseline(before), versionMetadataBaseline(after))
  assert.deepEqual(versionMetadataBaseline({ payload: after['package.json'] }), { payload: after['package.json'] })
})

test('circuit tray relocation preserves authored data differences', () => {
  const normalize = nameNormalizer([])
  assert.deepEqual(normalize({ kind: 'circuit/tray', path: 'tags/circuit/tray/basics.json', values: ['x'] }), normalize({ kind: 'tray', path: 'tags/tray/basics.json', values: ['x'] }))
  assert.ok(differences(normalize({ kind: 'circuit/tray', values: ['x'] }), normalize({ kind: 'tray', values: ['y'] })).length)
})

test('extracting bus families retains only their former alias collisions', () => {
  const before = nameNormalizer(['circuit:family-value', 'tick-bus:family-value', 'circuit:family-memory', 'tick-bus:family-memory'])
  const after = nameNormalizer(['circuit:family-value', 'circuit:family-memory'])
  assert.deepEqual(before({ family: 'circuit:family-value' }), after({ family: 'circuit:family-value' }))
  assert.notDeepEqual(after({ family: 'circuit:family-value' }), after({ family: 'circuit:family-memory' }))
  assert.notDeepEqual(after({ family: 'circuit:family-value' }), after({ family: 'value' }))
})

test('table extraction normalizes only its declared play fields and migrated capability identities', () => {
 const old = { mode: 'table:circuit', after: { 'table:panel-spell': { candidates: ['a'] } }, pass: true }
 const current = { play: 'state-graph:circuit', panel: { 'state-graph:panel-spell': { candidates: ['a'] } }, pass: true }
 const normalize = nameNormalizer(['table:circuit', 'table:panel-spell'])
 assert.deepEqual(normalize(tableFieldsBaseline(current)), normalize(tableFieldsBaseline(old)))
 assert.notDeepEqual(normalize(tableFieldsBaseline({ ...current, pass: false })), normalize(tableFieldsBaseline(old)))
 assert.deepEqual(tableFieldsBaseline({ play: 'other:circuit', panel: 7 }), { play: 'other:circuit', panel: 7 })
 assert.equal(normalize('state-graph:world-new'), 'state-graph:world-new')
 assert.equal(normalize('state-graph:circuit-extra'), 'state-graph:circuit-extra')
})

test('absent providers change only standalone primitive availability, preserving executions and declared content', async () => {
  const { dependencyPaletteBaseline } = await import('./baseline-value.js')
  const availability = { usable: ['table:add', 'consumer/add'], emptyProgress: ['table:add'], definitions: { 'table:add': { $undefined: true }, 'consumer/add': { op: 'table:add' } }, tray: { types: ['table:add', 'consumer/add'], folded: ['table:add'], shown: ['consumer/add'] } }
  const report = { reference: { work: ['n = table:add(a, b)'], report: { pass: true } } }
  const data = { structure: { parts: ['table:add'] }, records: [{ availability }, { report }] }
  assert.equal(dependencyPaletteBaseline(data, { packaged: false }), data)
  const kept = dependencyPaletteBaseline(data, { packaged: true, dependencies: ['table'] })
  assert.deepEqual(kept, data)
  const projected = dependencyPaletteBaseline(data, { packaged: true, dependencies: [] })
  assert.deepEqual(projected.records[0].availability.usable, ['consumer/add'])
  assert.equal(projected.records[0].availability.definitions['consumer/add'].op, 'table:add')
  assert.equal(projected.records[1], data.records[1])
  assert.equal(projected.structure, data.structure)
})
