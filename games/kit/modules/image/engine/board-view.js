import { circuitBoard } from '../../../engine/board-cards.js'
import { boardView, fitsCircuit, previousCircuitTask } from '../../../engine/board-view.js'
import { inheritedBoard } from '../../../shell/progress.js'
import { T } from '../../../shell/i18n.js'
import { startBoard } from './board.js'
import { INPUT_LABELS } from '../words.js'

// The image circuit configuration shared by the screen and the text play hook.
export function imageBoards(image) {
  const { kit, parts } = image
  const ports = (task, side) => {
    const input = side === 'input'
    const names = input ? task.inputs : task.outputs
    const labels = input ? task.inputLabels ?? (names.length > 1 ? INPUT_LABELS : null) : task.outputLabels
    const start = input ? task.views?.in : task.views?.out
    return names.map((name) => ({
      name, label: labels?.[name] ?? (names.length > 1 ? name : input ? T('输入', 'Input') : T('输出', 'Output')),
      ...(start && { view: start === 'terrain' ? 'surface' : start }),
    }))
  }
  const fixed = circuitBoard({ cards: [
    { type: 'input', side: 'left', of: (task) => ports(task, 'input') },
    { type: 'output', side: 'right', of: (task) => ports(task, 'output') },
  ] })
  const labels = { in: T('图', 'Image'), left: T('左', 'left'), right: T('右', 'right'), mu: 'μ', sigma: 'σ', eps: 'ε' }
  const board = {
    ...fixed,
    startBoard,
    fits: (graph, task, circuit, parts) => kit.fits(graph, task, { parts, knows: circuit.partOf }),
    wiring(task, circuit) {
      const parts = kit.boardParts(task.tests?.[0])
      return {
        ...fixed.wiring(task, circuit),
        ...parts,
        portLabel: (node, port) => fixed.isFixed(node.type) ? labels[port] ?? String(port).toUpperCase() : kit.types[node.type]?.inputLabels?.[port] ?? labels[port] ?? port,
        valueView: (node) => (node.type === 'input' ? task.views?.in : node.type === 'output' ? task.views?.out : task.views?.mid ?? task.views?.out) ?? 'pixels',
      }
    },
  }
  const built = Object.fromEntries(Object.entries(parts).map(([type, part]) => [
    type, { ...part, ...kit.types[type], opens: () => ({ circuit: kit.types[type].circuitOf(), level: image.builtBy(type) ?? image.referenceOf(type) }) },
  ]))
  return boardView({
    board,
    parts: () => kit.types,
    built: () => built,
    builder: image.builtBy,
    runtime: kit.partOf,
    offerIn: image.offerIn,
    holdsIn: image.holdsIn,
    syncOwn: image.syncOwn,
    opening(task, progress, viewOf) {
      const source = previousCircuitTask(task, (id) => image.levelById[id]?.tasks)
      const previous = inheritedBoard(progress, source)
      const view = viewOf(task)
      const offers = (circuit) => circuit.nodes.every((node) => fixed.isFixed(node.type) || task.palette.includes(node.type) || Object.hasOwn(view.workshop ?? {}, node.type))
      return fitsCircuit(previous, task, view) && offers(previous) ? previous : startBoard(task)
    },
  })
}
