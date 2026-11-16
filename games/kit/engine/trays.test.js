import { test } from 'node:test'
import assert from 'node:assert/strict'
import { trayDisplay, trayMembers } from './trays.js'

test('tray menus show only available pieces and follow their main and folded placement', () => {
  const menu = { id: 'or', title: '∨', items: ['orI', 'orE', 'locked'] }
  const entries = [menu, 'swap']
  const trays = { proof: entries }
  const piece = (type) => ({ type })
  assert.deepEqual(trayMembers(entries), ['orI', 'orE', 'locked', 'swap'])

  const pinned = trayDisplay(trays, ['proof'], [piece('orI')], [piece('orE'), piece('swap')])
  assert.deepEqual(pinned.items.map(({ children }) => children), [[piece('orI'), piece('orE')]])
  assert.deepEqual(pinned.folded, [piece('swap')])

  const folded = trayDisplay(trays, ['proof'], [], [piece('orE'), piece('swap')])
  assert.deepEqual(folded.items, [])
  assert.deepEqual(folded.folded[0].children, [piece('orE')])
})

test('switching trays groups only the pieces in the selected tray', () => {
  const items = [{ type: 'orI' }, { type: 'orE' }]
  const trays = {
    proof: [{ id: 'or', title: '∨', items: ['orI', 'orE'] }],
    rules: ['orI', 'orE'],
  }
  assert.deepEqual(trayDisplay(trays, ['proof'], items, []).items[0].children, items)
  assert.deepEqual(trayDisplay(trays, ['rules'], items, []).items, items)
})
