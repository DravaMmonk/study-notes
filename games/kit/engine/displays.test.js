import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { createCapabilityRegistry } from './capabilities.js'
import { createDisplayResolver, benchDisplays } from './displays.js'
import { loadModule, closeGames } from './games.mjs'
import { capabilities } from './kernel.js'

after(() => closeGames())

test('display implementations require declarations and reject duplicate registration', () => {
  const registry = createCapabilityRegistry()
  assert.throws(() => registry.implementDisplays(['toy:card'], '../modules/toy/ui/displays.js'), /undeclared display/)
  registry.add('display', 'toy:card', { about: 'A card' })
  assert.throws(() => registry.implementDisplays(['toy:card'], null), /needs a module UI entry/)
  registry.implementDisplays(['toy:card'], '../modules/toy/ui/displays.js')
  assert.throws(() => registry.implementDisplays(['toy:card'], '../modules/toy/ui/displays.js'), /duplicate display/)
})

test('display resolution mixes modules, loads each bundle once and rejects missing implementations', async () => {
  const registry = createCapabilityRegistry()
  let loads = 0
  const card = () => null
  const load = async () => { loads++; return { 'toy:card': card, 'toy:panel': { text: 'panel' } } }
  for (const name of ['toy:card', 'toy:panel', 'toy:missing', 'other:figure']) registry.add('display', name, { about: name })
  registry.implementDisplays(['toy:card', 'toy:panel', 'toy:missing'], '../modules/toy/ui/displays.js')
  registry.implementDisplays(['other:figure'], '../modules/other/ui/displays.js')
  const resolve = createDisplayResolver(registry, (entry) => entry.includes('/toy/') ? load() : { 'other:figure': card })
  const [first, second] = await Promise.all([resolve(['toy:card', 'other:figure']), resolve(['toy:panel'])])
  assert.equal(first['toy:card'], card)
  assert.equal(first['other:figure'], card)
  assert.equal(second['toy:panel'].text, 'panel')
  assert.equal(loads, 1)
  await assert.rejects(resolve(['toy:missing']), /missing implementation/)
  await assert.rejects(resolve(['toy:undeclared']), /no registered implementation/)
})

test('every registered module display loads through the browser module graph', async () => {
  const browser = await loadModule('/../games/kit/engine/displays.js')
  const names = Object.keys(capabilities.displayLoaders)
  const items = await browser.loadDisplays(names)
  assert.deepEqual(Object.keys(items).sort(), names.sort())
  for (const [name, item] of Object.entries(items)) {
    const role = capabilities.tables.display[name].role
    if (['hero', 'figure', 'widget', 'passed', 'rows'].includes(role) || capabilities.tables.display[name].kind === 'display') assert.equal(typeof item, 'function', name)
    else assert.ok(typeof item === 'function' || typeof item === 'object', name)
  }
  // Both string calls and parameterized calls may be nested inside panels and `with`.
  const layout = { main: [{ panel: ['circuit:display-text', { 'image:display-obscura': { with: ['circuit:display-goals'] } }] }] }
  const promise = browser.benchDisplays(layout)
  assert.equal(browser.benchDisplays(layout), promise)
  assert.deepEqual(Object.keys(await promise).sort(), ['circuit:display-goals', 'circuit:display-text', 'image:display-obscura'])
})

test('empty bench layouts need no UI bundle', async () => {
  assert.deepEqual(await benchDisplays({ main: [] }), {})
})
