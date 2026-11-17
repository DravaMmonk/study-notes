import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { evaluatePlay } from '../../../games/kit/engine/plugin-runtime.js'
import { loadPlugins } from '../../../games/kit/engine/plugin-node.js'
import { runtimeOf } from '../../../games/kit/engine/resolver.js'
import { packageCodeProblems } from '../../../games/kit/engine/plugin-boundaries.js'
import { gameOf, loadModule, closeGames } from '../../../games/kit/engine/games.mjs'
import { imageFixture } from './fixture.js'

export function imageContract(owner) {
  test(`${owner} core checks and blind-plays independently in Node`, async () => {
    const fixture = imageFixture(owner)
    try {
      assert.deepEqual(packageCodeProblems(owner === 'sample' ? 'image' : owner, fixture.root), [])
      const { shell: content } = fixture
      const runtime = await runtimeOf(content, fixture.root)
      const spec = runtime.spec(content)
      assert.deepEqual((await runtime.validate(spec)).filter(line => line.fail), [])
      const kernel = await loadPlugins(content, fixture.root)
      const task = content.levels[0].tasks[0]
      const context = { content, task }
      const good = evaluatePlay(kernel, task, task.solution, context)
      assert.equal(good.verdict.pass, true)
      assert.equal(evaluatePlay(kernel, task, task.naive, context).verdict.pass, false)
      const graph = kernel.tables.play.get(task.play)
      assert.deepEqual(graph.read(graph.write(good.work), context), good.work)
      const agent = kernel.tables.agent.get(task.play)
      assert.ok(agent.observe(context))
      assert.equal(agent.act(context, 'out <- in').pass, true)
      assert.equal(agent.act(context, 'a = image:shift[dir=right](in)\nout <- a').pass, false)
    } finally { fixture.cleanup() }
  })

  test(`${owner} core and view compose with circuit and render the registered play`, async () => {
    const fixture = imageFixture(owner)
    try {
      const kernel = await loadPlugins(fixture.shell, fixture.root, loadModule, true)
      kernel.pair(fixture.shell.levels.flatMap(level => level.tasks), true)
      const game = await gameOf(fixture.shell)
      assert.equal(game.levels.length, 1)
      assert.equal(typeof game.kinds['image:graph'].Screen, 'function')
      const task = fixture.shell.levels[0].tasks[0]
      const context = { content: fixture.shell, task, kernel }
      const require = createRequire(new URL('../../../trace-viewer/package.json', import.meta.url))
      const { renderToString } = require('react-dom/server')
      const { createElement } = require('react')
      const view = kernel.tables.playView.get('image:graph')
      const html = renderToString(createElement(view.preview, { context, work: kernel.tables.play.get('image:graph').initial(context), onChange: () => {} }))
      assert.ok(html.length > 100)
    } finally { await closeGames(); fixture.cleanup() }
  })
}

