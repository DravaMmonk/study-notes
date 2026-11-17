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

  // With the threshold at 1 a menu forms around any part it holds, in the main area or among the folded ones.
  const one = { proof: { ...trays.proof, menuThreshold: 1 } }
  const pinned = trayDisplay(one, ['proof'], [part('orI')], [part('orE'), part('swap')])
  assert.deepEqual(pinned.items.map(({ children }) => children), [[part('orI'), part('orE')]])
  assert.deepEqual(pinned.folded, [part('swap')])

  const folded = trayDisplay(one, ['proof'], [], [part('orE'), part('swap')])
  assert.deepEqual(folded.items, [])
  assert.deepEqual(folded.folded[0].children, [part('orE')])
})

test('a menu opens only when the level shows at least its threshold of its parts, 3 by default', () => {
  const part = (type) => ({ type })
  const trays = { t: { items: [{ id: 'm', title: 'M', items: ['a', 'b', 'c', 'd'] }, 'x'] } }
  // Two shown: they stand on their own; the two folded are too few for a menu among the folded.
  const two = trayDisplay(trays, ['t'], [part('a'), part('b'), part('x')], [part('c'), part('d')])
  assert.deepEqual(two.items, [part('a'), part('b'), part('x')])
  assert.deepEqual(two.folded, [part('c'), part('d')])
  // Three shown: the menu opens and holds the folded ones too.
  const three = trayDisplay(trays, ['t'], [part('a'), part('b'), part('c')], [part('d')])
  assert.deepEqual(three.items.map((item) => item.children ?? item), [[part('a'), part('b'), part('c'), part('d')]])
  assert.deepEqual(three.folded, [])
  // Three folded and none shown: the menu forms among the folded ones.
  const hidden = trayDisplay(trays, ['t'], [], [part('a'), part('b'), part('c')])
  assert.deepEqual(hidden.items, [])
  assert.deepEqual(hidden.folded[0].children, [part('a'), part('b'), part('c')])
  // A tray sets its own threshold.
  const two2 = trayDisplay({ t: { ...trays.t, menuThreshold: 2 } }, ['t'], [part('a'), part('b')], [])
  assert.deepEqual(two2.items[0].children, [part('a'), part('b')])
})

test('switching trays groups only the parts in the selected tray', () => {
  const items = [{ type: 'orI' }, { type: 'orE' }]
  const trays = {
    proof: { name: 'Proof', desc: 'Proof tools', items: [{ id: 'or', title: '∨', items: ['orI', 'orE'] }] },
    rules: { name: 'Rules', desc: 'Rules', items: ['orI', 'orE'] },
  }
  assert.deepEqual(trayDisplay({ ...trays, proof: { ...trays.proof, menuThreshold: 2 } }, ['proof'], items, []).items[0].children, items)
  assert.deepEqual(trayDisplay(trays, ['rules'], items, []).items, items)
})

test('tray overrides use generic collection patches and nested identified lists', async () => {
  const { applyOverride: override } = await import('../../../../games/kit/engine/layers.js')
  const apply = (before, patch) => override('circuit/tray', before, patch, circuitFixtureSchema({}))
  const source = { title: 'Tools', values: ['a'], menus: [{ id: 'group', title: 'Group', values: ['b'] }] }
  const next = apply(source, { values: { add: ['c'] }, menus: { add: [{ id: 'group', values: { add: ['d'] } }, { id: 'other', title: 'Other', values: ['e'] }] } })
  assert.deepEqual(next.values, ['a', 'c'])
  assert.deepEqual(next.menus[0], { id: 'group', title: 'Group', values: ['b', 'd'] })
  assert.deepEqual(apply(next, { menus: { remove: ['group'] } }).menus.map(menu => menu.id), ['other'])
  assert.deepEqual(apply(source, { values: ['z'], menus: [] }), { title: 'Tools', values: ['z'], menus: [] })
})

test('tray lists retain menu and grant order', async () => {
  const { assembleCircuitFixture: assemble } = await import('../../../../games/kit/engine/ops/fixture.js')
  const { S } = await import('../../../../games/kit/engine/schema.js')
  const content = assemble({ id: 'sample', schemas: circuitFixtureSchema({ game: S.obj({}), level: S.obj({}), kinds: {} }), game: {}, levels: [],
    partDefs: { parts: { one: {}, two: {}, last: {} } },
    trays: [['tools', { title: 'Tools', values: ['last'], menus: [
      { id: 'z-menu', title: 'First', values: ['two', 'one'] },
      { id: 'a-menu', title: 'Second', values: ['two'] },
    ] }]],
  })
  assert.deepEqual(content.objectProblems, [])
  assert.deepEqual(content.trays['sample/tools'].items.map(item => typeof item === 'string' ? item : item.id), ['sample/z-menu', 'sample/a-menu', 'sample/last'])
  assert.deepEqual(content.trays['sample/tools'].items[0].items, ['sample/two', 'sample/one'])
})
const assemble = options => assembleContent({ ...options, schemas: circuitFixtureSchema(options.schemas) })
