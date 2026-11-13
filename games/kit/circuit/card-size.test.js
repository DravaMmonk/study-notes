import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cardColumns, slotColumns, slotWidth, traySize } from './card-size.js'

const parts = {
  inputs: (node) => node.type === 'wide' ? ['a', 'b', 'c', 'd', 'e'] : [],
  valueView: (node) => node.type.startsWith('image') ? 'pixels' : 'value',
}

test('slot width and height use separate modes, with smaller sizes winning ties', () => {
  const pictures = traySize(['wide', 'image-a', 'image-b'], parts)
  assert.deepEqual(pictures, { width: 140, height: 112 })
  const tie = traySize(['image-a', 'wide'], parts)
  assert.deepEqual(tie, { width: 140, height: 72 })
  const modal = traySize(['short', 'wide-a', 'wide-b'], {
    inputs: (node) => node.type.startsWith('wide') ? ['a', 'b', 'c', 'd', 'e'] : [],
  })
  assert.deepEqual(modal, { width: 198, height: 72 })
  assert.equal(slotColumns(450, modal), 2)
  assert.equal(slotColumns(450, tie), 3)
  assert.equal(slotColumns(600, tie), 4)
  assert.equal(slotWidth(366, 2), 177)
  assert.equal(slotWidth(100, 2), 60)
  assert.equal(cardColumns({ ...parts, traySize: tie }, { type: 'wide' }, 450, 3), 2)
})
