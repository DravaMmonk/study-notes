import test from 'node:test'
import assert from 'node:assert/strict'
import { createPluginKernel } from '../../../games/kit/engine/plugins.js'
import { register, modelOf, partsOf, fitted, blank } from '../core/index.js'
import { loadModule, closeGames } from '../../../games/kit/engine/games.mjs'
const world = {
 outs: [['cell', 'Cell', null, 'circuit:number']],
 order: () => [0, 1], keys: (_test, cell) => ({ cell: String(cell) }), base: () => [],
 read: (_test, cell) => cell + 1, answer: (_test, table) => table.get('1'),
}
test('table core registers and deterministically runs a synthetic world without a course', () => {
 const kernel = createPluginKernel(); register(kernel.forPackage('table', 'core'))
 assert.equal(kernel.tables.kind.has('table:model'), true)
 const model = modelOf(partsOf({})), board = fitted(blank(), { offers: { view: ['input'], facts: [] }, outs: ['cell'] })
 board.nodes.find(node => node.id === 'view').params = { picks: ['input'] }
 board.wires.push({ from: 'view#input', to: 'cell', port: 'in' })
 const report = model.runCircuit(world, {}, board, { traced: true })
 assert.equal(report.value, 2)
 assert.deepEqual(model.runCircuit(world, {}, board, { traced: true }), report)
 assert.equal(report.steps.length, 2)
})
test('table view registers and renders escaped scenes independently of any robot catalog', async () => {
 try {
  const core = createPluginKernel(); register(core.forPackage('table', 'core'))
  const view = await loadModule(new URL('../view/index.jsx', import.meta.url).pathname)
  view.register(core.forPackage('table', 'view'))
  const renderer = core.tables.display.get('table:scene')({ W: { start: 'S', end: 'E' }, robots: {}, icons: {} })
  const svg = renderer.sceneSVG({ cells: [{ id: 'a', x: 0, y: 0, w: 64, h: 64, value: '<unsafe>' }], edges: [] })
  assert.match(svg, /&lt;unsafe&gt;/)
  assert.doesNotMatch(svg, /<unsafe>/)
 } finally { await closeGames() }
})
