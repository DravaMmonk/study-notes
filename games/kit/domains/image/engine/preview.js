import { tidyImageBoard } from './board.js'

// Select the images and reference wiring the course names for a piece on the shared sample circuit.
export function imagePreview(image, box, entry, progress) {
  const { kit, levelById } = image
  const type = entry.key === 'edge-filter' ? 'box3' : entry.piece
  const spec = kit.types[type]
  if (!spec) return null
  if (progress?.solved) image.syncOwn(progress)
  const home = entry.at?.[0]
  const earned = image.builtBy(type) ?? Object.values(levelById).find((level) => level.unlocks.includes(entry.key) || level.id === home)?.tasks.at(-1)
  const preferred = box.inLevel[entry.key] ? levelById[box.inLevel[entry.key]].tasks.at(-1) : earned
  const defaultTask = levelById[box.sample].tasks.at(-1)
  const make = (task) => {
    const tests = task.tests.slice(0, 3)
    const names = Object.keys(tests[0].inputs)
    const params = { ...kit.defaultParams(type), ...(entry.key === 'edge-filter' && { border: 'edge' }) }
    const authored = box.boards?.[entry.key]
    const needsOwn = box.inLevel[entry.key] || (spec.inputs.length !== names.length && task.solution?.nodes.some((node) => node.type === type))
    const board = authored ? kit.fromText(authored, task) : needsOwn ? task.solution : around(type, spec, names, params)
    if (!board) return null
    const run = (graph, test) => kit.evaluate(graph, test.inputs)
    const first = run(board, tests[0])
    if (first.errors.size || Object.values(first.outputs).some((value) => !value || value.data.some(Number.isNaN))) return null
    const outputs = board.nodes.filter((node) => node.type === 'output').map((node) => node.params.name)
    const cases = tests.map((test, index) => ({ ...test, expected: index === 0 ? first.outputs : run(board, test).outputs }))
    const sample = { ...task, inputs: names, outputs, tests: cases }
    const view = (_node, value) => value?.h === 1 && value.w > 1 && (value.c ?? 1) === 1 ? ['plot', 'pixels'] : ['pixels', 'numbers']
    return { task: sample, board, tests, run, prepare: (graph) => tidyImageBoard(kit, graph), view }
  }
  return (preferred?.kind === 'graph' && make(preferred)) || make(defaultTask)
}

function around(type, spec, names, params) {
  const inputs = names.map((name, k) => ({ id: `in-${name}`, type: 'input', params: { name }, x: 40, y: 40 + k * 200 }))
  const feed = (_, k) => inputs[spec.inputs.length === names.length ? k : 0]
  const keys = spec.outputs?.({ params }) ?? [null]
  const outputs = keys.map((key, k) => ({ id: key === null ? 'out' : `out-${key}`, type: 'output', params: { name: key ?? 'out' }, x: 520, y: 40 + k * 200 }))
  return {
    nodes: [...inputs, { id: 'part', type, params, x: 280, y: 40 }, ...outputs],
    wires: [
      ...spec.inputs.flatMap((port, k) => feed(port, k) ? [{ from: feed(port, k).id, to: 'part', port }] : []),
      ...outputs.map((sink, k) => ({ from: keys[k] === null ? 'part' : `part#${keys[k]}`, to: sink.id, port: 'in' })),
    ],
  }
}
