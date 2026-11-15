import { circuitBoard } from '../../../engine/board-cards.js'
import { boardView } from '../../../engine/board-view.js'
import { inheritedBoard } from '../../../shell/progress.js'
import { T } from '../../../shell/i18n.js'
import { startBoard } from './board.js'
import { INPUT_LABELS } from '../words.js'

// CircuitScreen's board vocabulary, over the same node types and blueprint text as the image runner.
export function imageBoards(image) {
  const { kit, pieces } = image
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
  ], text: kit.BOARD_TEXT })
  const labels = { in: T('图', 'Image'), left: T('左', 'left'), right: T('右', 'right'), mu: 'μ', sigma: 'σ', eps: 'ε' }
  const board = {
    ...fixed,
    startBoard,
    wiring(task, circuit) {
      const wiring = fixed.wiring(task, circuit)
      const example = task.tests[0]
      const colour = (node) => example?.[node.type === 'input' ? 'inputs' : 'expected']?.[node.params.name]?.c === 3
      return {
        ...wiring,
        availableInputs: (node, ports) => ports.filter((port) => kit.BOARD_PARTS.inputs(node).includes(port)),
        inputs: (node) => node.type === 'output' && !colour(node) ? ['in'] : kit.BOARD_PARTS.inputs(node),
        outputs: (node) => node.type === 'input' && !colour(node) ? null : kit.BOARD_PARTS.outputs(node),
        portLabel: (node, port) => fixed.isFixed(node.type) ? labels[port] ?? String(port).toUpperCase() : kit.types[node.type]?.inputLabels?.[port] ?? labels[port] ?? port,
        valueView: (node) => (node.type === 'input' ? task.views?.in : node.type === 'output' ? task.views?.out : task.views?.mid ?? task.views?.out) ?? 'pixels',
      }
    },
  }
  const built = Object.fromEntries(Object.entries(pieces).map(([type, piece]) => [
    type, { ...piece, ...kit.types[type], opens: () => ({ circuit: kit.types[type].circuitOf(), level: image.builtBy(type) }) },
  ]))
  return boardView({
    board,
    parts: () => kit.types,
    built: () => built,
    builder: image.builtBy,
    offerIn: image.offerIn,
    holdsIn: image.holdsIn,
    syncOwn: (_built, progress) => image.syncOwn(progress),
    opening(task, _built, inherited, progress) {
      const source = task.carry && image.levelById[task.carry]?.tasks.at(-1)
      const previous = inherited ?? inheritedBoard(progress, source && { ...source, id: task.carry })
      const offers = (circuit) => circuit.nodes.every((node) => fixed.isFixed(node.type) || task.palette.includes(node.type))
      return previous?.nodes && fixed.fits(previous, task, kit.partOf) && offers(previous) ? previous : startBoard(task)
    },
  })
}
