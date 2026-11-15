import { test } from 'node:test'
import assert from 'node:assert/strict'
import { trayDisplay, trayMembers } from './trays.js'

test('tray menus show only available pieces and follow their main and folded placement', () => {
  const menu = { id: 'or', title: '∨', items: ['orI', 'orE', 'locked'] }
  const entries = [menu, 'swap']
  const course = { trays: { proof: entries }, tray: () => ['proof'] }
  const piece = (type) => ({ type })
  assert.deepEqual(trayMembers(entries), ['orI', 'orE', 'locked', 'swap'])

  const pinned = trayDisplay(course, {}, [piece('orI')], [piece('orE'), piece('swap')])
  assert.deepEqual(pinned.items.map(({ children }) => children), [[piece('orI'), piece('orE')]])
  assert.deepEqual(pinned.folded, [piece('swap')])

  const folded = trayDisplay(course, {}, [], [piece('orE'), piece('swap')])
  assert.deepEqual(folded.items, [])
  assert.deepEqual(folded.folded[0].children, [piece('orE')])
})
