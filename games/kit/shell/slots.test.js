// node --test games/kit/shell — a level's saved boards: switching, adding, renaming and dropping.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addSlot, dropSlot, openSlot, renameSlot, slotsOf } from './slots.js'

const start = { data: { a: { nodes: [1] } }, slots: {} }

test('a level starts with one slot, its own data', () => {
  assert.deepEqual(slotsOf(start, 'a'), { at: 0, list: [{ no: 1, name: '' }] })
})

test('a fresh slot starts the board over and keeps the old one waiting', () => {
  const p = addSlot(start, 'a')
  assert.equal(p.data.a, undefined)
  assert.deepEqual(slotsOf(p, 'a'), { at: 1, lastNo: 2, list: [{ no: 1, name: '', data: { nodes: [1] } }, { no: 2, name: '' }] })
  const back = openSlot({ ...p, data: { a: { nodes: [2] } } }, 'a', 0)
  assert.deepEqual(back.data.a, { nodes: [1] })
  assert.deepEqual(slotsOf(back, 'a').list[1].data, { nodes: [2] })
  assert.equal('data' in slotsOf(back, 'a').list[0], false)
})

test('a copy is its own board', () => {
  const p = addSlot(start, 'a', { copy: true })
  assert.deepEqual(p.data.a, { nodes: [1] })
  assert.notEqual(p.data.a, slotsOf(p, 'a').list[0].data)
})

test('names, and dropping the slot played or another', () => {
  let p = addSlot(addSlot(start, 'a'), 'a')
  p = renameSlot(p, 'a', 0, '  first ')
  assert.equal(slotsOf(p, 'a').list[0].name, 'first')
  const other = dropSlot(p, 'a', 0)
  assert.deepEqual(slotsOf(other, 'a').list.map((s) => s.no), [2, 3])
  assert.equal(slotsOf(other, 'a').at, 1)
  const played = dropSlot({ ...p, data: { a: 'third' } }, 'a', 2)
  assert.equal(slotsOf(played, 'a').at, 1)
  assert.equal(played.data.a, undefined)
  const first = dropSlot(openSlot(p, 'a', 0), 'a', 0)
  assert.equal(slotsOf(first, 'a').at, 0)
  assert.equal(slotsOf(first, 'a').list[0].no, 2)
  assert.equal(dropSlot(start, 'a', 0), start)
  // A new slot never takes a number in use, even after one is dropped.
  assert.equal(slotsOf(addSlot(other, 'a'), 'a').list.at(-1).no, 4)
})

test('a late duplicate uses the requested slot and a deleted identifier stays retired', () => {
  const second = addSlot(start, 'a')
  const third = addSlot(second, 'a', { copy: true, from: 1 })
  assert.deepEqual(third.data.a, start.data.a)
  const gone = dropSlot(third, 'a', 2)
  assert.equal(addSlot(gone, 'a', { copy: true, from: 3 }), gone)
  assert.deepEqual(slotsOf(addSlot(gone, 'a'), 'a').list.map(({ no }) => no), [1, 2, 4])
})

