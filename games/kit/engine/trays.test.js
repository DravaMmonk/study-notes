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

test('tray overrides append members and merge menus by id, with explicit removal and replacement', async () => {
  const { applyOverride } = await import('./layers.js')
  const source = { title: 'Tools', values: ['a'], menus: [{ id: 'group', title: 'Group', values: ['b'] }] }
  const next = applyOverride('tray', source, { values: ['c', 'a'], menus: [{ id: 'group', values: ['d', 'b'] }, { id: 'other', title: 'Other', values: ['e'] }] })
  assert.deepEqual(next.values, ['a', 'c'])
  assert.deepEqual(next.menus[0], { id: 'group', title: 'Group', values: ['b', 'd'] })
  assert.deepEqual(applyOverride('tray', next, { remove: ['a', 'group'] }).menus.map(menu => menu.id), ['other'])
  assert.deepEqual(applyOverride('tray', source, { replace: true, values: ['z'], menus: [] }), { title: 'Tools', values: ['z'], menus: [] })
})

test('tray order interleaves menus and direct members without changing menu-member order', async () => {
  const { assemble } = await import('./content.js')
  const { S } = await import('./schema.js')
  const content = assemble({ id: 'sample', schemas: { game: S.obj({}), level: S.obj({}), kinds: {} }, game: {}, levels: [],
    partDefs: { parts: { one: {}, two: {}, last: {} } },
    trays: [['tools', { title: 'Tools', values: ['last'], menus: [
      { id: 'z-menu', title: 'First', values: ['two', 'one'] },
      { id: 'a-menu', title: 'Second', values: ['two'] },
    ] }]],
    relations: [['tools-order', { kind: 'order', of: 'piece', edges: [
      { from: 'z-menu', to: 'last' }, { from: 'last', to: 'a-menu' }, { from: 'two', to: 'one' },
    ] }]],
  })
  assert.deepEqual(content.objectProblems, [])
  assert.deepEqual(content.trays['sample/tools'].items.map(item => typeof item === 'string' ? item : item.id), ['sample/z-menu', 'sample/last', 'sample/a-menu'])
  assert.deepEqual(content.trays['sample/tools'].items[0].items, ['sample/two', 'sample/one'])
})
