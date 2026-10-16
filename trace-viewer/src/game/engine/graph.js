import { wouldCycle as cycles } from '../../../../games/kit/graph.js'
import { compare } from './image.js'
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

// Run the graph on one test's inputs. Returns every node's output image (or an error string).
export function evaluate(graph, inputs) {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]))
  const values = new Map()
  const errors = new Map()
  for (const id of order(graph)) {
    const node = byId.get(id)
    const spec = NODE_TYPES[node.type]
    if (node.type === 'input') {
      values.set(id, inputs[node.params.name])
      continue
    }
    const ins = {}
    let missing = null
    for (const port of inputsOf(node.type)) {
      const wire = graph.wires.find((w) => w.to === id && w.port === port)
      const value = wire ? values.get(wire.from) : undefined
      if (!value) {
        if (!spec.optional?.includes(port)) missing = port
        continue
      }
      ins[port] = value
    }
    if (node.type === 'output') {
      if (ins.in) values.set(id, ins.in)
      continue
    }
    if (missing) {
      errors.set(id, { zh: '缺少输入', en: 'Missing input' })
      continue
    }
    const sizes = Object.values(ins).map((img) => `${img.w}×${img.h}`)
    if (new Set(sizes).size > 1) {
      errors.set(id, { zh: '输入尺寸不同', en: 'Inputs differ in size' })
      continue
    }
    try {
      values.set(id, spec.eval(ins, node.params ?? {}))
    } catch {
      errors.set(id, { zh: '无法计算', en: 'Cannot compute' })
    }
  }
  return { values, errors }
}

export function outputImages(graph, values) {
  return Object.fromEntries(graph.nodes.filter((node) => node.type === 'output').map((node) => [node.params.name, values.get(node.id)]))
}

export const placedNodes = (graph) => graph.nodes.filter((node) => !NODE_TYPES[node.type].fixed)

export function score(graph) {
  const placed = placedNodes(graph)
  return { nodes: placed.length, cost: placed.reduce((sum, node) => sum + (NODE_TYPES[node.type].cost ?? 0), 0) }
}

// Run every test of a level against a graph.
export function runLevel(level, graph) {
  const results = level.tests.map((test) => {
    const { values, errors } = evaluate(graph, test.inputs)
    const outputs = outputImages(graph, values)
    const checks = Object.entries(test.expected).map(([name, expected]) => ({ name, ...compare(outputs[name], expected, test.check ?? level.check) }))
    return { values, errors, outputs, checks, pass: checks.every((c) => c.pass) }
  })
  const s = score(graph)
  const constraint = level.constraint?.(s, graph) ?? ''
  return { results, score: s, constraint, pass: results.every((r) => r.pass) && !constraint }
}

// Finite-difference gradient descent on every learnable parameter, scored by mean squared error.
// If a step makes the loss worse, the step size halves and the step is retried.
export function trainStep(level, graph, rate = 4) {
  const loss = (g) => {
    let sum = 0
    let count = 0
    for (const test of level.tests) {
      const { values } = evaluate(g, test.inputs)
      const outputs = outputImages(g, values)
      for (const [name, expected] of Object.entries(test.expected)) {
        const actual = outputs[name]
        if (!actual || actual.w !== expected.w) return Infinity
        for (let i = 0; i < expected.data.length; i++) sum += (actual.data[i] - expected.data[i]) ** 2
        count += expected.data.length
      }
    }
    return sum / Math.max(1, count)
  }
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
  let step = rate
  for (let attempt = 0; attempt < 8; attempt++, step /= 2) {
    const next = structuredClone(graph)
    for (const { id, key, i, g } of gradients) next.nodes.find((n) => n.id === id).params[key][i] -= step * g
    const after = loss(next)
    if (after <= base) return { graph: next, loss: after, rate: step }
  }
  return { graph, loss: base, rate: step }
}

export const hasLearnable = (graph) => graph.nodes.some((node) => (NODE_TYPES[node.type].params ?? []).some((param) => param.learnable))
