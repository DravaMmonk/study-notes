// node --test games/kit/engine — a part's way through the course, read off a small course written here.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { defineCourse } from '../course.js'
import { partFlow } from './flow.js'

test('a part’s flow: from the start, brought in, given and withheld, superseded, and each step of its chains', () => {
  const content = {
    levels: [
      { id: 'a', adds: ['p'], tasks: [{ id: 'a' }] },
      { id: 'b', tasks: [{ id: 'b', publishes: [{ part: 'm', variant: 'base' }] }, { id: 'b_2', withholds: ['p'] }] },
      { id: 'c', tasks: [{ id: 'c', gives: ['p-fast'] }] },
      { id: 'd', tasks: [{ id: 'd', publishes: [{ part: 'm', variant: 'two' }] }] },
    ],
    partDefs: { parts: { m: { inside: [{ id: 'base', reference: {} }, { id: 'two', form: 'two', reference: {} }] } } },
  }
  const byId = new Map(content.levels.map((l) => [l.id, l]))
  const own = (l) => (l.task === undefined ? [] : byId.get(l.id).tasks[l.task])
  const course = defineCourse({
    parts: { p: { stages: [{ id: 'p-fast' }] } },
    levels: content.levels.map((l) => ({ id: l.id, unlocks: [] })),
    primitives: ['p'],
    adds: (l) => byId.get(l.id).adds ?? [],
    needs: () => null,
    builds: (l) => (l.id === 'd' ? ['q'] : []),
    gives: (l) => own(l).gives ?? [],
    withholds: (l) => own(l).withholds ?? [],
    replaces: (part) => (part === 'q' ? ['p'] : []),
  })
  assert.deepEqual(partFlow(course, content, 'p'), [
    { kind: 'start', level: null, path: null },
    { kind: 'adds', level: 'a', path: ['adds', 0] },
    { kind: 'withholds', level: 'b', task: 1, path: ['tasks', 1, 'withholds', 0] },
    { kind: 'gives', level: 'c', task: 0, path: ['tasks', 0, 'gives', 0] },
    { kind: 'replaced', level: 'd', by: 'q', path: null },
  ])
  assert.deepEqual(partFlow(course, content, 'm'), [
    { kind: 'step', level: 'b', task: 0, path: ['tasks', 0, 'publishes', 0] },
    { kind: 'step', level: 'd', task: 0, form: 'two', path: ['tasks', 0, 'publishes', 0] },
  ])
})
