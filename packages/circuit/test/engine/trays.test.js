import { circuitFixtureSchema } from '../../../../games/kit/engine/ops/fixture.js'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { trayDisplay, trayMembers, workshopTrayNames } from '../../core/index.js'

test('the workshop lists enabled circuit trays and leaves exercise trays usable by the course', () => {
  const parts = { gate: {} }
  const trays = {
    main: { items: ['gate'] },
    exercise: { workshop: false, items: ['gate'] },
    words: { workshop: true, items: ['word'] },
    mixed: { workshop: true, items: [{ id: 'menu', items: ['word', 'gate'] }] },
  }
  assert.deepEqual(workshopTrayNames(trays, parts), ['main', 'mixed'])
  assert.deepEqual(trayMembers(trays.exercise), ['gate'])
})

test('tray menus show only available parts and follow their main and folded placement', () => {
  const menu = { id: 'or', title: '∨', items: ['orI', 'orE', 'locked'] }
  const entries = [menu, 'swap']
  const trays = { proof: { name: 'Proof', desc: 'Proof tools', items: entries } }
  const part = (type) => ({ type })
  assert.deepEqual(trayMembers(trays.proof), ['orI', 'orE', 'locked', 'swap'])

  const pinned = trayDisplay(trays, ['proof'], [part('orI')], [part('orE'), part('swap')])
  assert.deepEqual(pinned.items.map(({ children }) => children), [[part('orI'), part('orE')]])
  assert.deepEqual(pinned.folded, [part('swap')])

  const folded = trayDisplay(trays, ['proof'], [], [part('orE'), part('swap')])
  assert.deepEqual(folded.items, [])
  assert.deepEqual(folded.folded[0].children, [part('orE')])
})

test('switching trays groups only the parts in the selected tray', () => {
  const items = [{ type: 'orI' }, { type: 'orE' }]
  const trays = {
    proof: { name: 'Proof', desc: 'Proof tools', items: [{ id: 'or', title: '∨', items: ['orI', 'orE'] }] },
    rules: { name: 'Rules', desc: 'Rules', items: ['orI', 'orE'] },
  }
  assert.deepEqual(trayDisplay(trays, ['proof'], items, []).items[0].children, items)
  assert.deepEqual(trayDisplay(trays, ['rules'], items, []).items, items)
})

test('tray overrides append members and merge menus by id, with explicit removal and replacement', async () => {
  const { contentMeanings } = await import('../../core/index.js')
  const { applyOverride: override } = await import('../../../../games/kit/engine/layers.js')
  const applyOverride = (kind, before, patch) => override(kind, before, patch, { meanings: contentMeanings })
  const source = { title: 'Tools', values: ['a'], menus: [{ id: 'group', title: 'Group', values: ['b'] }] }
  const next = applyOverride('circuit/tray', source, { values: ['c', 'a'], menus: [{ id: 'group', values: ['d', 'b'] }, { id: 'other', title: 'Other', values: ['e'] }] })
  assert.deepEqual(next.values, ['a', 'c'])
  assert.deepEqual(next.menus[0], { id: 'group', title: 'Group', values: ['b', 'd'] })
  assert.deepEqual(applyOverride('circuit/tray', next, { remove: ['a', 'group'] }).menus.map(menu => menu.id), ['other'])
  assert.deepEqual(applyOverride('circuit/tray', source, { replace: true, values: ['z'], menus: [] }), { title: 'Tools', values: ['z'], menus: [] })
})

test('tray order interleaves menus and direct members without changing menu-member order', async () => {
  const { assembleCircuitFixture: assemble } = await import('../../../../games/kit/engine/ops/fixture.js')
  const { S } = await import('../../../../games/kit/engine/schema.js')
  const content = assemble({ id: 'sample', schemas: circuitFixtureSchema({ game: S.obj({}), level: S.obj({}), kinds: {} }), game: {}, levels: [],
    partDefs: { parts: { one: {}, two: {}, last: {} } },
    trays: [['tools', { title: 'Tools', values: ['last'], menus: [
      { id: 'z-menu', title: 'First', values: ['two', 'one'] },
      { id: 'a-menu', title: 'Second', values: ['two'] },
    ] }]],
    relations: [['tools-order', { kind: 'order', of: 'circuit/part', edges: [
      { from: 'z-menu', to: 'last' }, { from: 'last', to: 'a-menu' }, { from: 'two', to: 'one' },
    ] }]],
  })
  assert.deepEqual(content.objectProblems, [])
  assert.deepEqual(content.trays['sample/tools'].items.map(item => typeof item === 'string' ? item : item.id), ['sample/z-menu', 'sample/last', 'sample/a-menu'])
  assert.deepEqual(content.trays['sample/tools'].items[0].items, ['sample/two', 'sample/one'])
})
const assemble = options => assembleContent({ ...options, schemas: circuitFixtureSchema(options.schemas) })
