import test from 'node:test'
import assert from 'node:assert/strict'
import { createPicks, valueKey, viewOf } from './picks.js'

const memory = () => { let text = null; return { getItem: () => text, setItem: (_, value) => { text = value } } }

test('a view is kept per value, by game and task', () => {
  const storage = memory(), picks = createPicks(() => storage), seen = []
  picks.subscribe(() => seen.push(picks.snapshot()))
  picks.set('lab', '2-4/a', 'out', 'plot')
  picks.set('lab', '2-4/a', 'blur#re', 'pixels')
  assert.equal(picks.get('lab', '2-4/a', 'out'), 'plot')
  assert.equal(picks.get('lab', '2-4/a', 'blur#re'), 'pixels')
  assert.equal(picks.get('lab', '2-4/b', 'out'), undefined)
  assert.equal(picks.get('other', '2-4/a', 'out'), undefined)
  assert.equal(createPicks(() => storage).get('lab', '2-4/a', 'out'), 'plot')
  assert.deepEqual(seen, [1, 2])
})

test('a value is drawn in its pick, else where its port starts it, else the first offered', () => {
  const list = ['plot', 'numbers', 'pixels']
  assert.equal(viewOf(list, 'pixels', 'numbers'), 'pixels')
  assert.equal(viewOf(list, 'surface', 'numbers'), 'numbers')
  assert.equal(viewOf(list, undefined, 'surface'), 'plot')
})

test('a value inside a packed part is keyed after the parts it is in', () => {
  assert.equal(valueKey({ path: [] }, 'out'), 'out')
  assert.equal(valueKey({ path: ['p1', 'p4'] }, 'blur#re'), 'p1/p4/blur#re')
})

test('unavailable storage keeps no picks', () => {
  const picks = createPicks(() => ({ getItem() { throw Error('denied') }, setItem() { throw Error('denied') } }))
  picks.set('lab', 't', 'out', 'plot')
  assert.equal(picks.get('lab', 't', 'out'), undefined)
})
