import test from 'node:test'
import assert from 'node:assert/strict'
import { compose, channel } from './engine/colour.js'
import { image, zip, shift, correlate, downsample, maxPool, compare } from './engine/image.js'
import { NODE_TYPES } from './engine/nodes.js'
import { runnerOf } from './engine/graph.js'

const plane = (values, w = values.length) => ({ w, h: values.length / w, data: Float32Array.from(values) })

test('RGB channels round-trip and monochrome arithmetic broadcasts per pixel', () => {
  const r = plane([0.2, 0.4]), g = plane([0.3, 0.5]), b = plane([0.6, 0.7])
  const rgb = compose(r, g, b)
  assert.deepEqual([...channel(rgb, 1).data], [...g.data])
  assert.deepEqual([...zip(rgb, plane([2, 3]), (a, b) => a * b).data], [...compose(zip(r, plane([2, 3]), (a, b) => a * b), zip(g, plane([2, 3]), (a, b) => a * b), zip(b, plane([2, 3]), (a, b) => a * b)).data])
  assert.equal(compare(rgb, r).pass, false)
  assert.equal(compare(rgb, rgb).pass, true)
})

test('RGB spatial operations preserve each channel', () => {
  const a = plane([1, 2, 3, 4], 2), b = plane([5, 6, 7, 8], 2), c = plane([9, 10, 11, 12], 2)
  const rgb = compose(a, b, c)
  for (const op of [(x) => shift(x, 1, 0), (x) => correlate(x, [1]), downsample, maxPool]) {
    assert.deepEqual([...channel(op(rgb), 1).data], [...op(b).data])
  }
})

test('output combines RGB ports, fills unconnected channels and still accepts a single image', () => {
  const runner = runnerOf(NODE_TYPES)
  const nodes = ['r', 'g', 'out'].map((id) => ({ id, type: id === 'out' ? 'output' : 'input', params: { name: id } }))
  const inputs = { r: plane([0.2, 0.4]), g: image(1, 1, 0.5) }
  const graph = { nodes, wires: [{ from: 'r', to: 'out', port: 'r' }, { from: 'g', to: 'out', port: 'g' }] }
  const out = runner.evaluate(graph, inputs).values.get('out')
  assert.deepEqual([...channel(out, 0).data], [...inputs.r.data])
  assert.deepEqual([...channel(out, 1).data], [0.5, 0.5])
  assert.deepEqual([...channel(out, 2).data], [0, 0])
  graph.wires = [{ from: 'r', to: 'out', port: 'in' }]
  assert.equal(runner.evaluate(graph, inputs).values.get('out'), inputs.r)
})

test('an RGB image can be corrected directly with a single-channel illumination map', () => {
  const runner = runnerOf(NODE_TYPES)
  const original = compose(plane([0.8, 0.4]), plane([0.3, 0.5]), plane([0.2, 0.7]))
  const light = plane([0.5, 0.25])
  const photo = zip(original, light, (a, b) => a * b)
  const graph = { nodes: [
    { id: 'photo', type: 'input', params: { name: 'photo' } },
    { id: 'light', type: 'input', params: { name: 'light' } },
    { id: 'divide', type: 'arith', params: { op: 'div' } },
    { id: 'out', type: 'output', params: { name: 'out' } },
  ], wires: [
    { from: 'photo', to: 'divide', port: 'a' }, { from: 'light', to: 'divide', port: 'b' },
    { from: 'divide', to: 'out', port: 'in' },
  ] }
  assert.equal(compare(runner.evaluate(graph, { photo, light }).values.get('out'), original).pass, true)
})

test('colour input exposes the full image and independent RGB outputs', async () => {
  const { imageKit } = await import('./engine/kit.js')
  const kit = imageKit(NODE_TYPES)
  const lines = ['out.r <- photo.r', 'out.g <- photo.g', 'out.b <- photo.b']
  const graph = kit.fromText(lines, { inputs: ['photo'] })
  assert.deepEqual(kit.toText(graph), lines)
  const rgb = compose(plane([0.2, 0.4]), plane([0.3, 0.5]), plane([0.6, 0.7]))
  const values = kit.evaluate(graph, { photo: rgb }).values
  assert.equal(values.get('photo'), rgb)
  assert.deepEqual([...values.get('photo#r').data], [...channel(rgb, 0).data])
  assert.deepEqual([...values.get('photo#g').data], [...channel(rgb, 1).data])
  assert.deepEqual([...values.get('photo#b').data], [...channel(rgb, 2).data])
  assert.equal(compare(values.get('out'), rgb).pass, true)
})

test('colour scene variants expose RGB inputs without changing their targets', async () => {
  const { LEARNING } = await import('./items/scenes/learning.js')
  const examples = [
    ['colour', 'rgbContrast', { paint: 'halves' }, { mix: 'redGreen' }, 0.5],
    ['colour', 'rgbContrast', { paint: 'skyline' }, { mix: 'blueYellow' }, 0.5],
    ['street', 'rgbStreet', { layout: 'crossing' }, {}, 0],
    ['colourMix', 'rgbMix', { paint: 'blueSquare' }, {}, 0],
  ]
  for (const [oldName, newName, fields, setup, offset] of examples) {
    const old = LEARNING[oldName].make(fields, setup)
    const updated = LEARNING[newName].make(fields, setup)
    for (const [i, key] of ['r', 'g', 'b'].entries()) {
      const restored = zip(old.inputs[key], image(old.inputs[key].w, old.inputs[key].h, offset), (a, b) => a + b)
      assert.equal(compare(channel(updated.inputs.photo, i), restored, { tolerance: 1e-6 }).pass, true)
    }
    for (const name of Object.keys(old.expected)) assert.equal(compare(updated.expected[name], old.expected[name], { tolerance: 1e-6 }).pass, true)
  }
})
