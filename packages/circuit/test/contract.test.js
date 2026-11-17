import test from 'node:test'
import assert from 'node:assert/strict'
import { createPluginKernel } from '../../../games/kit/engine/plugins.js'
import { packageCodeProblems } from '../../../games/kit/engine/plugin-boundaries.js'
import { evaluatePlay } from '../../../games/kit/engine/plugin-runtime.js'
import { loadModule, closeGames } from '../../../games/kit/engine/games.mjs'
import { register, boardPlay, grants } from '../core/index.js'

const root = new URL('../../../', import.meta.url).pathname
const fixture = () => {
  const parts = { 'sample/add': { name: 'Add', desc: 'Add inputs', family: 'circuit:family-value', icon: 'Plus', op: 'circuit:add' } }
  return {
    id: 'sample', title: 'Sample', eras: [], primitives: ['sample/add'], trays: {},
    standalone: { level: 'sample/sum' }, glossary: { groups: [], entries: [] },
    partDefs: { parts }, registries: { 'circuit/part': parts },
    levels: [{ id: 'sample/sum', title: 'Sum', tasks: [{
      id: 'sample/task', play: 'circuit:board', brief: 'Add both inputs',
      inputs: [{ name: 'a', label: 'A' }, { name: 'b', label: 'B' }], outputs: [{ name: 'out', label: 'Result' }],
      tests: [{ inputs: { a: 2, b: 3 }, expect: { out: 5 } }],
      hidden: [{ inputs: { a: -1, b: 4 }, expect: { out: 3 } }],
      solution: ['sum = sample/add(a, b)', 'out <- sum'], naive: ['out <- a'],
    }] }],
  }
}

test('circuit core registers, checks, round-trips and blind-plays in Node', async () => {
  const content = fixture()
  const kernel = createPluginKernel()
  register(kernel.forPackage('circuit', 'core'))
  assert.equal(grants.types.has('circuit/part'), true)
  assert.deepEqual(packageCodeProblems('circuit', root), [])
  assert.deepEqual((await kernel.checks({ content })).filter(line => line.fail), [])
  const task = content.levels[0].tasks[0]
  const context = { content, task }
  const start = boardPlay.initial(context)
  assert.equal(start.nodes.length, 3)
  const graph = boardPlay.read(task.solution, context)
  assert.deepEqual(boardPlay.read(boardPlay.write(graph), context), graph)
  assert.deepEqual(evaluatePlay(kernel, task, task.solution, context).verdict, { pass: true, score: 1 })
  assert.equal(evaluatePlay(kernel, task, task.naive, context).verdict.pass, false)
  const agent = kernel.tables.agent.get('circuit:board')
  assert.equal(agent.observe(context).solution, undefined)
  assert.equal(agent.act(context, task.solution).verdict.pass, true)
  assert.equal(agent.act(context, task.solution).report, undefined)
})

test('circuit view pairs with its core through the public view entry', async () => {
  try {
    const core = await loadModule(new URL('../core/index.js', import.meta.url).pathname)
    const view = await loadModule(new URL('../view/index.jsx', import.meta.url).pathname)
    const kernel = createPluginKernel()
    core.register(kernel.forPackage('circuit', 'core'))
    view.register(kernel.forPackage('circuit', 'view'))
    kernel.pair([{ play: 'circuit:board' }], true)
    assert.equal(typeof kernel.tables.playView.get('circuit:board').component, 'function')
  } finally { await closeGames() }
})
