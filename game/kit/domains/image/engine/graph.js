import { wouldCycle as cycles } from '../../../graph.js'
import { PartError } from '../../../engine/circuit.js'
import { runBoard, sink, source } from '../../../engine/boards.js'
import { runLevel as runTests } from '../../../engine/tests.js'
import { compare, image } from './image.js'
import { NODE_TYPES, inputsOf } from './nodes.js'

// A graph is { nodes: [{ id, type, x, y, params }], wires: [{ from, to, port }] } where `from` and
// `to` are node ids and `port` is the input port name on `to`. Each node has a single output.

export const wouldCycle = (graph, from, to) => cycles(graph.wires.map((w) => [w.from, w.to]), from, to)

export function order(graph) {
  const incoming = new Map(graph.nodes.map((node) => [node.id, 0]))
  for (const wire of graph.wires) incoming.set(wire.to, (incoming.get(wire.to) ?? 0) + 1)
  const ready = graph.nodes.filter((node) => !incoming.get(node.id)).map((node) => node.id)
  const result = []
  while (ready.length) {
    const id = ready.shift()
    result.push(id)
    for (const wire of graph.wires) {
      if (wire.from !== id) continue
      incoming.set(wire.to, incoming.get(wire.to) - 1)
      if (!incoming.get(wire.to)) ready.push(wire.to)
    }
  }
  return result
}

// The parts as the shared engine (../../../engine/circuit.js) reads them. A part here is written as
// eval(ins, params, variant); an `input` gives the test's picture of its name and an `output` is what reaches it.
// A part made by the shared engine itself (a packed circuit) is used as it is.
const wrapped = new WeakMap()
export function partOf(type) {
  const spec = NODE_TYPES[type]
  if (!spec) return null
  if (spec.kit) return spec
  if (!wrapped.has(spec)) {
    wrapped.set(spec, type === 'input'
      ? source({ spec })
      : type === 'output'
        ? sink({ spec })
        : { spec, inputs: spec.inputs, optional: spec.optional, eval: (ins, node, ctx) => spec.eval(ins, node.params ?? {}, ctx.variant ?? null) })
  }
  return wrapped.get(spec)
}

// A single number (1×1) meets a bigger input by filling its whole size; any other mismatch is an error, except for a
// part whose inputs are different things by nature (`anySize`: a picture, a matrix and a canvas).
export function prepare(ins, node, part) {
  const big = part.anySize || part.spec?.anySize ? [] : Object.values(ins).filter((img) => img.w * img.h > 1)
  if (new Set(big.map((img) => `${img.w}×${img.h}`)).size > 1) throw new PartError({ zh: '输入尺寸不同', en: 'Inputs differ in size' })
  if (!big.length) return ins
  const out = { ...ins }
  for (const [port, img] of Object.entries(ins)) if (img.w * img.h === 1) out[port] = image(big[0].w, big[0].h, img.data[0])
  return out
}

// Run the graph on one test's inputs. Returns every node's output image (or an error). `variant` picks one of the
// copies a training-only part (an augmentation) makes of its input; without it those parts pass it through.
export function evaluate(graph, inputs, variant = null) {
  return runBoard(graph, { parts: partOf, prepare, bind: inputs, ctx: { variant } })
}

export function outputImages(graph, values) {
  return Object.fromEntries(graph.nodes.filter((node) => node.type === 'output').map((node) => [node.params.name, values.get(node.id)]))
}

export const placedNodes = (graph) => graph.nodes.filter((node) => !NODE_TYPES[node.type].fixed)

// A part's cost is its arithmetic per output pixel (some parts' cost depends on their settings). A part working on a
// smaller picture than the level's input costs proportionally less, so shrinking first and then filtering is cheaper.
const costOf = (node) => {
  const cost = NODE_TYPES[node.type].cost ?? 0
  return typeof cost === 'function' ? cost(node.params ?? {}) : cost
}
export function score(graph, values) {
  const placed = placedNodes(graph)
  const pixels = (id) => {
    const img = values?.get(id)
    return img ? img.w * img.h : 0
  }
  const full = Math.max(1, ...graph.nodes.filter((node) => node.type === 'input').map((node) => pixels(node.id)))
  const share = (node) => (pixels(node.id) > 1 ? Math.min(1, pixels(node.id) / full) : 1)
  const cost = placed.reduce((sum, node) => sum + costOf(node) * share(node), 0)
  const learned = placed.reduce((sum, node) => sum + (NODE_TYPES[node.type].params ?? []).filter((param) => param.learnable).reduce((n, param) => n + (node.params?.[param.key]?.length ?? 0), 0), 0)
  return { nodes: placed.length, cost: Math.round(cost * 10) / 10, learned }
}

// How a test runs and is judged, for the shared engine's level runs (../../../engine/tests.js).
export const IMAGE_TESTS = {
  runTest: (level, graph, test) => {
    const { values, errors } = evaluate(graph, test.inputs)
    return { values, errors, outputs: outputImages(graph, values) }
  },
  check: (level, test, outputs) => Object.entries(test.expected).map(([name, expected]) => ({ name, ...compare(outputs[name], expected, test.check ?? level.check) })),
  score: (level, graph, results) => score(graph, results[0]?.values),
}

// Run every test of a level against a graph.
export const runLevel = (level, graph) => runTests(IMAGE_TESTS, level, graph)

// The mean squared error of a graph over some tests. A training-only part (one with `variants`) makes that many
// copies of every test, and the error counts them all.
export function lossOn(tests, graph) {
  const copies = Math.max(1, ...graph.nodes.map((node) => NODE_TYPES[node.type].variants ?? 1))
  let sum = 0
  let count = 0
  for (const test of tests) {
    for (let v = 0; v < copies; v++) {
      const { values } = evaluate(graph, test.inputs, copies > 1 ? v : null)
      const outputs = outputImages(graph, values)
      for (const [name, expected] of Object.entries(test.expected)) {
        const actual = outputs[name]
        if (!actual || actual.w !== expected.w || actual.h !== expected.h) return Infinity
        for (let i = 0; i < expected.data.length; i++) sum += (actual.data[i] - expected.data[i]) ** 2
        count += expected.data.length
      }
    }
  }
  return sum / Math.max(1, count)
}
// Tests a level trains on, and the new samples it keeps back to check that the training generalises.
export const trainingTests = (level) => level.tests.filter((test) => test.train !== false)
export const checkingTests = (level) => level.tests.filter((test) => test.train === false)

// Finite-difference gradient descent on every learnable parameter, scored by mean squared error over the training
// tests. Normally a step that makes the loss worse is halved and retried; with `backtrack: false` the step is taken
// as it is, so a learning rate that is too large overshoots.
export function trainStep(level, graph, rate = 4, { backtrack = true } = {}) {
  const tests = trainingTests(level)
  const loss = (g) => lossOn(tests, g)
  const base = loss(graph)
  const gradients = []
  for (const node of graph.nodes) {
    for (const param of NODE_TYPES[node.type].params ?? []) {
      if (!param.learnable) continue
      node.params[param.key].forEach((_, i) => {
        const probe = structuredClone(graph)
        probe.nodes.find((n) => n.id === node.id).params[param.key][i] += 1e-4
        gradients.push({ id: node.id, key: param.key, i, g: (loss(probe) - base) / 1e-4 })
      })
    }
  }
  const stepBy = (step) => {
    const next = structuredClone(graph)
    for (const { id, key, i, g } of gradients) next.nodes.find((n) => n.id === id).params[key][i] -= step * g
    return next
  }
  if (!backtrack) {
    const next = stepBy(rate)
    return { graph: next, loss: loss(next), rate }
  }
  let step = rate
  for (let attempt = 0; attempt < 8; attempt++, step /= 2) {
    const next = stepBy(step)
    const after = loss(next)
    if (after <= base) return { graph: next, loss: after, rate: step }
  }
  return { graph, loss: base, rate: step }
}

export const hasLearnable = (graph) => graph.nodes.some((node) => (NODE_TYPES[node.type].params ?? []).some((param) => param.learnable))
