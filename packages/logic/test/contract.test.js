import test from 'node:test'
import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { proofsRoot } from '../../../games/kit/engine/ops/fixture.js'
import { readContent, readPackage, runtimeOf } from '../../../games/kit/engine/resolver.js'
import { packageLevel } from '../../../games/kit/engine/package-play.js'
import { loadPlugins } from '../../../games/kit/engine/plugin-node.js'
import { evaluatePlay } from '../../../games/kit/engine/plugin-runtime.js'
import { packageCodeProblems } from '../../../games/kit/engine/plugin-boundaries.js'
import { closeGames, gameOf, loadModule } from '../../../games/kit/engine/games.mjs'

// Authored content comes only from the synthetic fixture, never from QED's levels.
test('logic core checks a standalone proof and exposes deterministic work and blind-play protocols', async () => {
  const { root, id } = proofsRoot()
  try {
    assert.deepEqual(packageCodeProblems('logic', root), [])
    const content = readContent(id, root)
    const runtime = await runtimeOf(content, root)
    assert.deepEqual((await runtime.validate(runtime.spec(content))).filter(line => line.fail), [])
    const shell = packageLevel(readPackage(id, root), `${id}/apply`)
    const task = shell.levels[0].tasks[0]
    const kernel = await loadPlugins(shell, root)
    const protocol = kernel.tables.play.get(task.kind)
    const context = { content: shell, task }
    const reference = protocol.read(task.solution, context)
    assert.deepEqual(protocol.read(protocol.write(reference), context), reference)
    assert.equal(protocol.judge(protocol.run(reference, context)).pass, true)
    assert.equal(protocol.judge(protocol.run(protocol.read(['goal <- r'], context), context)).pass, false)
    const agent = kernel.tables.agent.get(task.kind)
    assert.ok(agent.observe(context))
    assert.equal(agent.act(context, task.solution.join('\n')).pass, true)
    assert.equal(agent.act(context, 'goal <- r').pass, false)
    assert.deepEqual(protocol.run(reference, context), protocol.run(reference, context))
    const mixed = { ...shell, levels: shell.levels.map(level => ({ ...level, tasks: [...level.tasks, { id: 'foreign', play: 'circuit:board' }] })) }
    assert.equal(protocol.judge(protocol.run(reference, { ...context, content: mixed })).pass, true)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('logic core and view compose with circuit and QED through Vite and render a proof', async () => {
  const { root, id } = proofsRoot()
  try {
    const content = readContent(id, root)
    const kernel = await loadPlugins(content, root, loadModule, true)
    const task = content.levels[0].tasks[0]
    const context = { content, task, kernel }
    const game = await gameOf(content)
    assert.equal(typeof game.kinds['logic:proof'].Screen, 'function')
    const require = createRequire(new URL('../../../trace-viewer/package.json', import.meta.url))
    const { renderToString } = require('react-dom/server')
    const { createElement } = require('react')
    const view = kernel.tables.playView.get('logic:proof')
    const work = kernel.tables.play.get('logic:proof').initial(context)
    assert.ok(renderToString(createElement(view.preview, { context, work, onChange() {} })).length > 100)
    // The generic evaluator uses the same registered play when tasks declare it explicitly.
    assert.equal(evaluatePlay(kernel, { ...task, play: task.kind }, task.solution, context).verdict.pass, true)
  } finally { await closeGames(); rmSync(root, { recursive: true, force: true }) }
})
