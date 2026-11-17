import { test } from 'node:test'
import assert from 'node:assert/strict'
import { partGroups } from '../core/studio-parts.js'

test('the parts list groups parts by tray, in the order the course gives them; the rest go last', () => {
  const order = ['1', '2', '3']
  const at = (type) => ({ a: '3', b: '1', c: '2', d: '2' })[type] ?? null
  assert.deepEqual(partGroups(['a', 'b', 'c', 'd', 'e', 'p'], { trays: { main: { items: ['a', 'b', 'p'] }, more: { items: ['a', 'c'] }, shared: { items: ['a'] }, empty: { items: [] } }, at, order, primitives: ['p'] }), [
    { tray: 'main', types: ['p', 'b', 'a'] },
    { tray: 'more', types: ['c'] },
    { tray: 'shared', types: [] },
    { tray: 'empty', types: [] },
    { tray: null, types: ['d', 'e'] },
  ])
  assert.deepEqual(partGroups(['a', 'b', 'c'], { at, order }), [{ tray: null, types: ['b', 'c', 'a'] }])
})
