import { defaultParams } from '../engine/nodes.js'

// Build a graph from a compact description, for reference solutions and starting boards:
// build({ a: ['shift', { dir: '→' }], s: 'add' }, ['in>a', 'a>s.a', 'in>s.b', 's>out'])
// Input and output nodes are named by their port name; `in>s.b` wires node `in` to port `b` of `s`.
export function build(nodes, wires, { inputs = ['in'], outputs = ['out'] } = {}) {
  const graph = { nodes: [], wires: [] }
  inputs.forEach((name, index) => graph.nodes.push({ id: name, type: 'input', x: 40, y: 60 + index * 220, params: { name } }))
  outputs.forEach((name, index) => graph.nodes.push({ id: name, type: 'output', x: 560, y: 60 + index * 220, params: { name } }))
  Object.entries(nodes).forEach(([id, spec], index) => {
    const [type, params = {}] = Array.isArray(spec) ? spec : [spec]
    graph.nodes.push({ id, type, x: 200 + (index % 4) * 140, y: 60 + Math.floor(index / 4) * 150, params: { ...defaultParams(type), ...params } })
  })
  for (const text of wires) {
    const [from, target] = text.split('>')
    const [to, port] = target.split('.')
    const isOutput = graph.nodes.find((n) => n.id === to)?.type === 'output'
    graph.wires.push({ from, to, port: port ?? (isOutput ? 'in' : 'in') })
  }
  return graph
}

// The board a level starts from: only its inputs and outputs.
export const startBoard = (level) => build({}, [], { inputs: level.inputs, outputs: level.outputs })

export const test = (label, inputs, expected, check) => ({ label, inputs, expected, check })

// A level's tests with its hidden ones after them, each marked hidden: what the player sees once the level
// is solved, and what a run must pass before that.
export const withHidden = (level) => (level.hidden?.length ? { ...level, tests: [...level.tests, ...level.hidden.map((t) => ({ ...t, hidden: true }))] } : level)
