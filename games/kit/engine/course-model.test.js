import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { contentCourse, publicationEvents, readWorkSet, revisionItems } from './course-model.js'
import { holds, met, offer } from '../course.js'
import { pieceReferences } from './pieces.js'
import { readStarter } from './content-node.js'
import { runtimeOf } from './runtime.js'

const sample = () => ({
  id: 'sample', domain: 'irrelevant', primitives: ['base', 'local'],
  local: ['local'], concept: { base: 'number' }, replaces: { built: ['base'] },
  trays: { tools: { items: ['base', 'local', 'built'] } },
  eras: [{ id: 'chapter', levels: [{ id: 'first' }, { id: 'next' }], links: [{ from: 'first', to: 'next' }] }],
  levels: [
    { id: 'first', tray: 'tools', adds: ['base', 'local'], tasks: [{ id: 'introduce', opens: ['base.border=wrap'] }, { id: 'publish', gives: ['extra'], withholds: ['base.border=wrap'] }] },
    { id: 'next', tray: 'tools', tasks: [{ id: 'reuse' }] },
  ],
})

test('all mechanisms use the same publication, local, replacement and three-grain item rules', () => {
  const content = sample()
  const publications = publicationEvents(content.levels, [{ task: 'publish', type: 'built' }])
  const course = contentCourse(content, { publications })
  assert.equal(course.concept('base'), 'number')
  assert.equal(course.builder('built'), 'first')
  assert.equal(holds(course, { id: 'first', task: 0 }, new Set())('base', 'border', 'wrap'), true)
  assert.equal(holds(course, { id: 'first', task: 1 }, new Set())('base', 'border', 'wrap'), false)
  assert.equal(holds(course, { id: 'first', task: 1 }, new Set())('extra'), true)
  assert.deepEqual(met(course, { id: 'next' }), ['built'])
  assert.deepEqual(offer(course, { id: 'next' }, new Set(['built'])).types, ['built'])
  assert.equal(holds(course, { id: 'next' }, new Set(['built']))('base'), false)
})

test('heterogeneous work readers receive one model after all publications have been collected', () => {
  const content = sample()
  const seen = []
  const prepare = (id, publications = []) => function* () {
    const course = yield { levels: content.levels.filter((level) => level.id === id), publications, needed: () => [id, id] }
    seen.push(course)
    return { course, available: met(course, { id }) }
  }
  const readers = [
    { content, prepare: prepare('first', [{ type: 'built', level: 'first', taskIndex: 1 }]) },
    { content, prepare: prepare('next') },
  ]
  const before = structuredClone(content)
  const works = readWorkSet(content, readers)
  assert.equal(seen[0], seen[1])
  assert.equal(works[0].course, works[1].course)
  assert.deepEqual(works[1].available, ['built'])
  assert.deepEqual(works[0].course.needed({ id: 'first' }), ['first', 'first'])
  assert.deepEqual(content, before)
})

test('revised forms open after their proof and carry along prerequisites', () => {
  const references = pieceReferences([
    { type: 'theorem', kind: 'lemma', form: 'expanded', task: { id: 'first', task: 0 } },
  ], { before: () => false, passed: () => false })
  const revisions = { theorem: [{ by: 'first', forms: ['expanded'] }] }
  assert.deepEqual(revisionItems(revisions, references, { id: 'first', task: 0 }), [])
  assert.deepEqual(revisionItems(revisions, references, { id: 'first', task: 1 }), ['theorem.form=expanded'])
  const content = sample()
  content.levels[0].adds.push('theorem')
  const course = contentCourse(content, { intrinsic: ['theorem'], references,
    opened: (at) => revisionItems(revisions, references, at) })
  assert.equal(holds(course, { id: 'first', task: 0 }, new Set())('theorem', 'form', 'expanded'), false)
  assert.equal(holds(course, { id: 'next' }, new Set())('theorem', 'form', 'expanded'), true)
})

test('runtime selection follows task declarations when the historical domain is changed or absent', async () => {
  const content = readStarter(resolve(import.meta.dirname, '../templates/logic'))
  const runtime = await runtimeOf(content)
  const expected = runtime.spec(content)
  for (const domain of ['image', undefined]) {
    const changed = { ...content, domain }
    const actual = (await runtimeOf(changed)).spec(changed)
    assert.deepEqual(actual.course.levels, expected.course.levels)
    assert.deepEqual(actual.course.builds({ id: actual.levels[0].id }), expected.course.builds({ id: expected.levels[0].id }))
  }
})

test('circuit and row task capabilities share a course, checks and progress without a domain switch', async () => {
  const content = readStarter(resolve(import.meta.dirname, '../templates/circuit'))
  const row = { id: 'sums/one', title: 'Addition', tasks: [{ id: 'sums/task', kind: 'rows:equation', brief: 'Make five.', rows: [{ total: 5, chips: [2, 3], reference: '2 + 3', naive: '2 + 2' }] }] }
  content.levels.push(row)
  content.eras.push({ id: 'sums', levels: [{ id: row.id }], links: [{ from: content.levels[0].id, to: row.id }] })
  const runtime = await runtimeOf(content)
  const spec = runtime.spec(content)
  assert.equal(spec.specs.length, 2)
  assert.equal(spec.specs[0].course, spec.specs[1].course)
  assert.equal(spec.course.before(content.levels[0].id, row.id), true)
  assert.deepEqual((await runtime.validate(spec)).filter((line) => line.fail), [])
  const ctx = { level: { source: row.tasks[0] } }
  assert.equal(runtime.play.attempt(ctx, '2 + 3').pass, true)
  assert.equal(runtime.play.attempt(ctx, '5 + 0').pass, false)
})


test('tasks of different mechanisms retain their positions inside one level', async () => {
  const content = readStarter(resolve(import.meta.dirname, '../templates/circuit'))
  const row = { id: 'starter/addition', kind: 'rows:equation', brief: 'Make five.', rows: [{ total: 5, chips: [2, 3], reference: '2 + 3', naive: '2 + 2' }] }
  content.levels[0].tasks.push(row)
  const runtime = await runtimeOf(content)
  const spec = runtime.spec(content)
  assert.equal(spec.course.levels.length, content.levels.length)
  assert.deepEqual(spec.levels[0].tasks.map(task => task.taskId ?? task.key ?? task.id), content.levels[0].tasks.map(task => task.id))
  assert.equal(spec.specs[0].course, spec.specs[1].course)
  const rows = spec.specs[1].levels[0].tasks[0].source
  assert.equal(rows.task, 1)
  assert.deepEqual((await runtime.validate(spec)).filter(line => line.fail), [])
})
