import { workshopDefinitions, workshopInput, workshopParts } from '../engine/workshop.js'

/** Add player-owned runtime parts without mutating the course's shared definitions. */
export function workshopView(circuit, library, available, runtime) {
  const pieces = Object.fromEntries(Object.entries(library.pieces).filter(([, piece]) => available(piece)))
  const partOf = workshopParts({ pieces: library.pieces }, runtime, { ticks: circuit.board.ticks })
  const indexes = workshopDefinitions({ pieces })
  const known = (type) => indexes.has(type)
  const own = (node) => known(node.type)
  const base = circuit.board
  const view = {
    ...circuit,
    workshop: pieces,
    partOf: (type) => known(type) ? partOf(type) : circuit.partOf(type),
    board: {
      ...base,
      wiring(task) {
        const original = base.wiring(task, view)
        return {
          ...original,
          inputs: (node) => own(node) ? indexes.get(node.type).inputs : original.inputs(node),
          availableInputs: (node, ports) => own(node) ? ports : original.availableInputs?.(node, ports) ?? ports,
          outputs: (node) => own(node) ? outputsOf(indexes.get(node.type)) : original.outputs(node),
          packed: (node) => own(node) || original.packed?.(node),
          portLabel: (node, port) => own(node) ? port : original.portLabel?.(node, port),
          holds: (node) => own(node) ? Boolean(base.ticks) : original.holds?.(node),
        }
      },
    },
  }
  return { known, view, resolve: partOf }
}

const outputsOf = ({ outputs }) => outputs.length > 1 ? outputs.map((name) => ({ key: name, label: name })) : null

/** Draw a personal part using the active domain and its own captured boundary. */
export function openedWorkshop(piece, parts, task) {
  return {
    circuit: piece.graph,
    level: task,
    parts: {
      ...parts,
      role: (node) => workshopInput(node) ? 'source' : parts.role(node),
      label: (node) => workshopInput(node) ? node.params.name : parts.label(node),
      inputs: (node) => workshopInput(node) ? [] : parts.inputs(node),
      outputs: (node) => workshopInput(node) ? null : parts.outputs(node),
    },
  }
}
