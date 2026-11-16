import { test } from 'node:test'
import assert from 'node:assert/strict'
import { trayDisplay, trayMembers, workshopTrayNames } from './trays.js'

test('the workshop lists enabled circuit trays and leaves exercise trays usable by the course', () => {
  const pieces = { gate: {}, word: { editor: 'strip' } }
  const trays = {
    main: { items: ['gate'] },
    exercise: { workshop: false, items: ['gate'] },
    words: { workshop: true, items: ['word'] },
    mixed: { workshop: true, items: [{ id: 'menu', items: ['word', 'gate'] }] },
  }
  assert.deepEqual(workshopTrayNames(trays, pieces), ['main', 'mixed'])
  assert.deepEqual(trayMembers(trays.exercise), ['gate'])
})

test('tray menus show only available pieces and follow their main and folded placement', () => {
  const menu = { id: 'or', title: '∨', items: ['orI', 'orE', 'locked'] }
  const entries = [menu, 'swap']
  const trays = { proof: { name: 'Proof', desc: 'Proof tools', items: entries } }
  const piece = (type) => ({ type })
  assert.deepEqual(trayMembers(trays.proof), ['orI', 'orE', 'locked', 'swap'])

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
    proof: { name: 'Proof', desc: 'Proof tools', items: [{ id: 'or', title: '∨', items: ['orI', 'orE'] }] },
    rules: { name: 'Rules', desc: 'Rules', items: ['orI', 'orE'] },
  }
  assert.deepEqual(trayDisplay(trays, ['proof'], items, []).items[0].children, items)
  assert.deepEqual(trayDisplay(trays, ['rules'], items, []).items, items)
})
