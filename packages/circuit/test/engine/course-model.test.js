import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { contentCourse, publicationEvents, readWorkSet } from '../../core/index.js'
import { holds, met, offer } from '../../core/index.js'
import { readStarter } from "../../../../games/kit/engine/ops/fixture.js"
import { runtimeOf } from "../../../../games/kit/engine/runtime.js"

const sample = () => ({
  partDefs: { parts: { base: { settings: { border: { control: 'select', options: [{ value: 'edge' }] } }, stages: [{ id: 'base-wrap', settings: { border: { options: [{ value: 'edge' }, { value: 'wrap' }] } } }] } } },
  id: 'sample', domain: 'irrelevant', primitives: ['base', 'local'],
  replaces: { built: ['base'] },
  trays: { tools: { items: ['base', 'local', 'built'] } },
  eras: [{ id: 'chapter', levels: [{ id: 'first' }, { id: 'next' }], links: [{ from: 'first', to: 'next' }] }],
  levels: [
    { id: 'first', tray: 'tools', adds: ['base', 'local'], local: ['local'], tasks: [{ id: 'introduce', opens: ['base-wrap'] }, { id: 'publish', gives: ['extra'], withholds: ['base-wrap'] }] },
    { id: 'next', tray: 'tools', tasks: [{ id: 'reuse' }] },
  ],
})

test('all mechanisms use the same publication, local, replacement and three-grain item rules', () => {
  const content = sample()
  const publications = publicationEvents(content.levels, [{ task: 'publish', type: 'built' }])
  const course = contentCourse(content, { publications })
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

test('proved stages open after the publishing task and carry along prerequisites', () => {
  const content = sample()
  content.partDefs.parts.theorem = { settings: { form: { control: 'select', options: [{ value: 'base' }] } }, stages: [{ id: 'expanded', settings: { form: { options: [{ value: 'base' }, { value: 'expanded' }] } } }] }
  content.levels[0].adds.push('theorem')
  content.levels[0].tasks[0].awards = ['expanded']
  const course = contentCourse(content, { intrinsic: ['theorem'] })
  assert.equal(holds(course, { id: 'first', task: 0 }, new Set())('theorem', 'form', 'expanded'), false)
  assert.equal(holds(course, { id: 'first', task: 1 }, new Set())('theorem', 'form', 'expanded'), true)
  assert.equal(holds(course, { id: 'next' }, new Set())('theorem', 'form', 'expanded'), true)
})

test('runtime selection follows task declarations when the historical domain is changed or absent', async () => {
  const content = readStarter(resolve(import.meta.dirname, '../../../logic/test'))
  const runtime = await runtimeOf(content)
  const expected = runtime.spec(content)
  for (const domain of ['image', undefined]) {
    const changed = { ...content, domain }
    const actual = (await runtimeOf(changed)).spec(changed)
    assert.deepEqual(actual.course.levels, expected.course.levels)
    assert.deepEqual(actual.course.builds({ id: actual.levels[0].id }), expected.course.builds({ id: expected.levels[0].id }))
  }
})

test('local belongs to the introducing level and does not suppress a later permanent introduction', () => {
  const content = sample()
  content.levels[1].adds = ['local']
  content.levels.push({ id: 'last', tasks: [{ id: 'last-task' }] })
  content.eras[0].levels.push({ id: 'last' })
  content.eras[0].links.push({ from: 'next', to: 'last' })
  const course = contentCourse(content)
  assert.equal(course.local('local', { id: 'first' }), true)
  assert.equal(course.local('local', { id: 'next' }), false)
  assert.equal(course.local('local'), false)
  assert.ok(met(course, { id: 'last' }).includes('local'))
})

test('task-local settings and values are available at their introduction and do not open successor levels', () => {
  const content = sample()
  const items = ['base-wrap']
  content.levels[0].tasks[0] = { id: 'introduce', adds: items, local: items }
  const course = contentCourse(content)
  assert.equal(holds(course, { id: 'first', task: 0 }, new Set())('base', 'border', 'wrap'), true)
  assert.equal(holds(course, { id: 'next' }, new Set())('base', 'border', 'wrap'), false)
  assert.equal(course.local('base-wrap', { id: 'first' }), true)
})
