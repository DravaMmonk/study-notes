import test from 'node:test'
import assert from 'node:assert/strict'
import { createSettings, settingsFor } from './settings.js'

const game = { id: 'a', circuit: { played: new Map([['level', [{ carry: 'before' }]]]) } }
const memory = () => { let text = null; return { getItem: () => text, setItem: (_, value) => { text = value } } }
test('device settings use defaults, validate choices and separate games', () => {
  const storage = memory(), prefs = createSettings(() => storage)
  assert.equal(prefs.get(game, 'manualBlocks'), false)
  assert.equal(prefs.get(game, 'connectionLabels'), false)
  assert.equal(prefs.get(game, 'connectionLabels', {phone:true}), true)
  prefs.set(game, 'connectionLabels', false)
  assert.equal(prefs.get(game, 'connectionLabels', {phone:true}), false)
  prefs.set(game, 'manualBlocks', true)
  assert.equal(prefs.get({ ...game, id: 'b' }, 'manualBlocks'), false)
  assert.equal(createSettings(() => storage).get(game, 'manualBlocks'), true)
  prefs.reset(game)
  assert.equal(prefs.get(game, 'manualBlocks'), false)
})
test('unavailable or malformed storage falls back to defaults', () => {
  for (const storage of [{ getItem() { throw Error('denied') }, setItem() { throw Error('denied') } }, { getItem: () => '{', setItem() {} }]) {
    const prefs = createSettings(() => storage)
    prefs.set(game, 'manualBlocks', true)
    assert.equal(prefs.get(game, 'manualBlocks'), false)
  }
})
test('only meaningful settings are listed and changes notify subscribers', () => {
  assert(settingsFor(game,{phone:true}).some((s) => s.key === 'manualBlocks'))
  assert(!settingsFor(game,{phone:true}).some((s) => s.key === 'compact'))
  assert(!settingsFor({ id: 'table' }).some((s) => s.key === 'manualBlocks'))
  const prefs = createSettings(memory), seen = []
  const stop = prefs.subscribe(() => seen.push(prefs.snapshot()))
  prefs.set(game, 'manualBlocks', true)
  stop()
  prefs.reset(game)
  assert.deepEqual(seen, [1])
})
