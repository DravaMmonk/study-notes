import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { evaluatePlay } from '../../../games/kit/engine/plugin-runtime.js'
import { loadPlugins } from '../../../games/kit/engine/plugin-node.js'
import { runtimeOf } from '../../../games/kit/engine/resolver.js'
import { packageCodeProblems } from '../../../games/kit/engine/plugin-boundaries.js'
import { gameOf, loadModule, closeGames } from '../../../games/kit/engine/games.mjs'
import { tableFixture } from './fixture.js'
test('table consumer registers, checks, round-trips and blind-plays in Node', async () => {
 const fixture = tableFixture()
 try {
  for (const id of ['table', 'state-graph']) assert.deepEqual(packageCodeProblems(id, fixture.root), [])
  const { content } = fixture, task = content.levels[0].tasks[0], context = { content, task }
  const runtime = await runtimeOf(content, fixture.root)
  assert.deepEqual((await runtime.validate(runtime.spec(content))).filter(line => line.fail), [])
  const kernel = await loadPlugins(content, fixture.root)
  const good = evaluatePlay(kernel, task, task.solution, context)
  assert.equal(good.verdict.pass, true)
  assert.equal(evaluatePlay(kernel, task, task.naive, context).verdict.pass, false)
  const core = kernel.tables.play.get(task.play)
  assert.deepEqual(core.read(core.write(good.work), context), good.work)
  const agent = kernel.tables.agent.get(task.play)
  assert.equal(agent.observe(context).kind, 'circuit')
  assert.equal(agent.act(context, task.solution.join('\n')).pass, true)
  assert.equal(agent.act(context, task.naive.join('\n')).pass, false)
 } finally { fixture.cleanup() }
})
test('table and state-graph core/view compose with circuit and image', async () => {
 const fixture = tableFixture()
 try {
  const { content } = fixture
  const kernel = await loadPlugins(content, fixture.root, loadModule, true)
  kernel.pair(content.levels.flatMap(level => level.tasks), true)
  assert.equal(typeof kernel.tables.display.get('table:scene'), 'function')
  const game = await gameOf(content)
  assert.equal(typeof game.kinds['state-graph:circuit'].Screen, 'function')
  const task = content.levels[0].tasks[0], context = { content, task, kernel }
  const require = createRequire(new URL('../../../trace-viewer/package.json', import.meta.url))
  const { renderToString } = require('react-dom/server'), { createElement } = require('react')
  const view = kernel.tables.playView.get(task.play)
  const html = renderToString(createElement(view.preview, { context, work: kernel.tables.play.get(task.play).initial(context), onChange: () => {} }))
  assert.ok(html.length > 100)
 } finally { await closeGames(); fixture.cleanup() }
})
