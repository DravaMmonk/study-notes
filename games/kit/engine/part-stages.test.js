import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registeredOperations } from './capabilities.js'
import { S } from './schema.js'
import { partStages, stageDefinition, requiredStage } from './part-stages.js'
import { defineParts, partProblems } from './parts/define.js'
import { audit, defineCourse, holds } from '../course.js'
import { contentCourse } from './course-model.js'
import { boardView } from './board-view.js'
import { referenceResolver, expandRelations } from './objects.js'

const operations = {
  'toy:scale': {
    args: [{ name: 'a', type: 'circuit:number' }], returns: 'circuit:number',
    params: S.obj({ gain: S.num({ min: 1, max: 8, default: 2 }), mode: S.oneOf(['up', 'down'], { default: 'up' }) }),
    run: ([a], { gain, mode }) => mode === 'down' ? a / gain : a * gain,
  },
}
const part = {
  name: 'Scale', desc: 'Scale a number.', icon: 'Scaling', family: 'toy:family', op: 'toy:scale',
  settings: { gain: { fixed: true }, mode: { remove: ['down'] } },
  stages: [
    { id: 'adjustable', settings: { gain: {} }, desc: 'Choose the gain.' },
    { id: 'division', settings: { mode: { add: ['down'] }, gain: { default: 4 } }, views: { card: [{ show: 'settings' }] } },
  ],
}

test('stage deltas inherit signatures and reset settings without mutating the part', () => {
  const before = structuredClone(part)
  const stages = partStages({ 'sample/scale': part })
  const base = stageDefinition(stages.get('sample/scale'), operations)
  const editable = stageDefinition(stages.get('sample/adjustable'), operations)
  const division = stageDefinition(stages.get('sample/division'), operations)
  assert.deepEqual(base.inputs, [{ name: 'a', type: 'circuit:number' }])
  assert.equal(base.outputType, 'circuit:number')
  assert.equal(base.setting.gain.fixed, true)
  assert.equal(editable.setting.gain.fixed, undefined)
  assert.deepEqual(division.setting.mode.options.map(option => option.value), ['up', 'down'])
  assert.equal(division.setting.gain.default, 4)
  assert.equal(division.desc, 'Choose the gain.')
  assert.deepEqual(part, before)
})

test('part and stage identities share a namespace and reject collisions', () => {
  assert.throws(() => partStages({ 'sample/scale': part, 'sample/adjustable': {} }), /duplicate/)
  assert.throws(() => partStages({ 'sample/scale': { stages: [{ id: 'other/foreign' }] } }), /must belong/)
  assert.throws(() => partStages({ scale: { stages: [{ id: 'same' }, { id: 'same' }] } }), /duplicate/)
})

test('reference cards select the earliest stage that admits their explicit settings', () => {
  const definitions = { scale: { settings: { mode: { control: 'select', options: [{ value: 'up' }] } }, stages: [{ id: 'division', settings: { mode: { options: [{ value: 'up' }, { value: 'down' }] } } }] } }
  assert.equal(requiredStage(definitions, 'scale', { mode: 'up' }), 'scale')
  assert.equal(requiredStage(definitions, 'scale', { mode: 'down' }), 'division')
})

test('the normal circuit view evaluates stage defaults under the stable part id', (context) => {
  Object.assign(registeredOperations, operations)
  context.after(() => delete registeredOperations['toy:scale'])
  const definitions = { scale: { ...part, stages: [{ id: 'advanced', settings: { gain: { default: 4 } } }] } }
  const { PARTS } = defineParts({ parts: definitions }, operations)
  const course = defineCourse({ levels: [{ id: 'early' }, { id: 'later' }], parts: definitions,
    primitives: ['scale'], adds: () => ['scale'], builds: () => [], needs: () => null,
    opens: at => at.id === 'later' ? ['advanced'] : [] })
  const view = boardView({ board: { FIXED_PARTS: {} }, parts: () => PARTS,
    holdsIn: at => holds(course, at, new Set()) })
  assert.equal(view.forTask({ id: 'early' }).partOf('scale').eval({ a: 3 }, { params: {} }, {}), 6)
  assert.equal(view.forTask({ id: 'later' }).partOf('scale').eval({ a: 3 }, { params: {} }, {}), 12)
})

test('part tags expand stages while replaces accepts only distinct base parts', () => {
  const problems = []
  const resolve = referenceResolver({ part: { scale: { stages: [{ id: 'advanced' }] } }, tag: { tray: { kind: 'part', values: ['scale', 'advanced'] } } }, problems)
  assert.deepEqual(resolve('#tray', 'part'), ['advanced', 'scale'])
  resolve('scale.gain', 'part')
  assert.match(problems[0].says, /unknown part/)
  expandRelations({ upgrade: { kind: 'replaces', edges: [{ from: 'advanced', to: 'scale' }] } }, resolve, new Set(), problems)
  assert.ok(problems.some(problem => /only links different base parts/.test(problem.says)))
})

test('all stage settings are checked against their operation and empty output maps fail', () => {
  const vocabulary = { kinds: { op: operations, family: { 'toy:family': {} } } }
  assert.deepEqual(partProblems({ parts: { scale: part } }, vocabulary), [])
  const invalid = { ...part, stages: [{ id: 'invalid', settings: { gain: { max: 9 } } }] }
  assert.ok(partProblems({ parts: { scale: invalid } }, vocabulary).some(problem => /cannot widen/.test(problem.says)))
  assert.ok(partProblems({ parts: { scale: { ...part, stages: [], op: {} } } }, vocabulary).some(problem => /at least one output/.test(problem.says)))
})

test('earned stage flags upgrade the same card without changing its saved identity', () => {
  const course = defineCourse({ levels: [{ id: 'only' }], primitives: ['scale'],
    parts: { scale: { stages: [{ id: 'advanced', desc: 'Advanced scale.' }] } },
    adds: () => ['scale'], builds: () => [], needs: () => null })
  const has = holds(course, { id: 'only', task: 0 }, new Set(['advanced']))
  assert.equal(has.stage('scale'), 'advanced')
  assert.equal(has.definition('scale').type, 'scale')
})

test('a level award waits for its final task to pass', () => {
  const content = { id: 'sample', primitives: ['scale'],
    partDefs: { parts: { scale: { stages: [{ id: 'advanced' }] } } },
    eras: [{ id: 0, levels: [{ id: 'only' }], links: [] }],
    levels: [{ id: 'only', adds: ['scale'], awards: ['advanced'], tasks: [{ id: 'first' }, { id: 'last' }] }] }
  const course = contentCourse(content)
  assert.deepEqual(course.awards({ id: 'only', task: 1 }), [])
  assert.deepEqual(course.awards({ id: 'only', task: 2 }), ['advanced'])
})

test('the course audit requires a provider for each tray stage', () => {
  const options = { levels: [{ id: 'only' }], primitives: ['scale'],
    parts: { scale: { stages: [{ id: 'advanced' }] } }, trays: { main: { items: ['advanced'] } },
    adds: () => ['scale'], builds: () => [], needs: () => null }
  assert.equal(audit(defineCourse(options)).some(problem => problem.part === 'advanced' && problem.rule === 'tray-unmet'), true)
  assert.equal(audit(defineCourse({ ...options, opens: () => ['advanced'] })).some(problem => problem.rule === 'tray-unmet'), false)
})
