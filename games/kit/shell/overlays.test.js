import assert from 'node:assert/strict'
import test from 'node:test'
import { registerOverlay } from '../overlays.js'

const nodeAt = (zIndex) => ({ zIndex, getClientRects: () => [{}] })

test('only the top overlay handles outside presses and its trigger counts as inside', (t) => {
  const window = new EventTarget()
  globalThis.window = window
  globalThis.getComputedStyle = (node) => node
  t.after(() => {
    delete globalThis.window
    delete globalThis.getComputedStyle
  })

  const press = (...path) => window.dispatchEvent(Object.assign(new Event('pointerdown'), { composedPath: () => path }))
  const menu = nodeAt(30)
  const palette = nodeAt(50)
  const trigger = {}
  const closed = []
  const removeMenu = registerOverlay(menu, () => ({ anchor: () => trigger, onOutside: () => closed.push(menu) }))
  const removePalette = registerOverlay(palette, () => ({}))
  try {
    press(palette)
    removePalette()
    assert.deepEqual(closed, [])
    press({}, trigger)
    press({}, menu)
    assert.deepEqual(closed, [])
    press({})
    assert.deepEqual(closed, [menu])
  } finally {
    removeMenu()
  }
})
