import { createRequire } from 'node:module'
import test from 'node:test'
import assert from 'node:assert/strict'
import { createPluginKernel, evaluatePlay } from '../../../games/kit/engine/index.js'
import { packageCodeProblems, installPackageImports } from '../../../games/kit/engine/plugin-boundaries.js'
import { loadModule, closeGames } from '../../../games/kit/engine/games.mjs'
import { register as circuit } from '../../circuit/core/index.js'
import { register, equationPlay, runtime, readSum } from '../core/index.js'

const task = { id: 'sample/task', play: 'rows:equation', brief: 'Make five.', rows: [{ total: 5, chips: [0, 2, 3], reference: '2 + 3', naive: '0 + 3' }] }
const content = {
  id: 'sample', title: 'Sample', eras: [], primitives: [], trays: {},
  standalone: { level: 'sample/one' }, glossary: { groups: [], entries: [] },
  partDefs: { parts: {} }, registries: { 'circuit/part': {} },
  levels: [{ id: 'sample/one', title: 'One', tasks: [task] }],
}

test('rows core registers, checks, round-trips and blind-plays in Node', async () => {
  installPackageImports()
  assert.deepEqual(packageCodeProblems('rows', new URL('../../../', import.meta.url).pathname), [])
  const kernel = createPluginKernel()
  circuit(kernel.forPackage('circuit', 'core'))
  register(kernel.forPackage('rows', 'core'))
  const context = { content, task }
  const reference = [readSum('2 + 3')]
  const naive = [readSum('0 + 3')]
  const work = equationPlay.read(reference, context)
  assert.deepEqual(equationPlay.read(equationPlay.write(work), context), work)
  assert.equal(evaluatePlay(kernel, task, reference, context).verdict.pass, true)
  assert.equal(evaluatePlay(kernel, task, naive, context).verdict.pass, false)
  const spec = runtime.spec(content)
  assert.deepEqual((await runtime.validate(spec)).filter(line => line.fail), [])
  const agent = kernel.tables.agent.get('rows:equation')
  assert.ok(agent.observe(context))
  assert.equal(agent.act(context, "2 + 3").pass, true)
  assert.equal(agent.act(context, "0 + 3").pass, false)
})

test('rows core and view compose with circuit through public entries', async () => {
  try {
    const core = await loadModule(new URL('../core/index.js', import.meta.url).pathname)
    const view = await loadModule(new URL('../view/index.jsx', import.meta.url).pathname)
    const other = await loadModule(new URL('../../circuit/core/index.js', import.meta.url).pathname)
    const otherView = await loadModule(new URL('../../circuit/view/index.jsx', import.meta.url).pathname)
    const kernel = createPluginKernel()
    other.register(kernel.forPackage('circuit', 'core'))
    otherView.register(kernel.forPackage('circuit', 'view'))
    core.register(kernel.forPackage('rows', 'core'))
    view.register(kernel.forPackage('rows', 'view'))
    kernel.pair([task], true)
    assert.equal(kernel.tables.playView.get('rows:equation').component, view.Equation)
    const game = view.default(content)
    const require = createRequire(new URL('../../../trace-viewer/package.json', import.meta.url))
    const { renderToString } = require('react-dom/server')
    const { createElement } = require('react')
    const context = { content, task }
    const html = renderToString(createElement(view.Equation, { context, task, work: core.equationPlay.initial(context), onChange: () => {} }))
    assert.ok(html.length > 100, 'the paired preview renders the editable work')
    assert.equal(game.levels.length, 1)
    assert.equal(typeof Object.values(game.kinds)[0].Screen, 'function')
  } finally { await closeGames() }
})
