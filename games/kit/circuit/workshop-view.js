import { withBoardRuntime } from '../engine/boards.js'
import { isWorkshopType, usesWorkshop, workshopCompatible, workshopDefinitions, workshopIdentity, workshopInput, workshopParts } from '../engine/workshop.js'
import { WORKSHOP_OUTPUT } from '../engine/workshop-terminals.js'

const captured = Symbol('captured workshop parts')

export const workshopOf = (board) => board?.[captured]
export const workView = (board, view) => workshopOf(board)?.project(view) ?? view

/** The runner and the editor can supply different representations of the task's native parts. */
export function runtimeOf(task, view) {
  if (view.runtime) return view.runtime
  if (typeof task.parts === 'function') return task.parts
  return task.parts ? (type) => task.parts[type] : view.partOf
}

/** Bind only the versioned dependencies the passing board actually uses. */
function bindWorkshopWork(graph, task, circuit, library, { partDefs }) {
  const runtime = runtimeOf(task, circuit)
  const context = { resolve: runtime, identity: (type) => workshopIdentity(partDefs, type) }
  const versions = new Map()
  const embedded = new Set()
  const visiting = new Set()
  const include = (board) => Array.isArray(board?.nodes) && board.nodes.every(({ type }) => {
    if (versions.has(type) || embedded.has(type) || !isWorkshopType(type)) return true
    if (visiting.has(type)) return false
    const part = library.parts[type]
    if (!workshopCompatible(part, context)) return false
    visiting.add(type)
    const valid = includePart(part)
    visiting.delete(type)
    if (valid) versions.set(type, part)
    return valid
  })
  const includePart = (part) => {
    const children = Object.entries(part.children ?? {})
    for (const [key] of children) embedded.add(key)
    return include(part.graph) && children.every(([, child]) => includePart(child))
  }
  if (!include(graph) || !versions.size) return graph
  const view = workshopView(circuit, { parts: Object.fromEntries(versions) }, () => true, runtime)
  return withBoardRuntime({ ...graph, [captured]: view }, (partOf) => (type) => view.known(type) ? view.resolve(type) : partOf(type))
}

/** Reattach browser-held versions to passed work, both on pass and after a reload. */
export function courseWorkshop(game, load) {
  const tasks = new Map(game.levels.flatMap((level) => level.tasks.map(({ key, source }) => [key, source])))
  const bind = (key, board, library) => {
    if (!usesWorkshop(board)) return board
    const task = tasks.get(key)
    const view = task && game.circuit?.forTask(task)
    return view
      ? bindWorkshopWork(board, task, view, library(), { partDefs: game.partDefs })
      : board
  }
  return {
    bind: (key, board) => bind(key, board, load),
    restore(built) {
      let library
      return Object.fromEntries(Object.entries(built).map(([key, board]) => [key, bind(key, board, () => (library ??= load()))]))
    },
  }
}

/** Add player-owned runtime parts without mutating the course's shared definitions. */
export function workshopView(circuit, library, available, runtime) {
  const parts = Object.fromEntries(Object.entries(library.parts).filter(([, part]) => available(part)))
  const partOf = workshopParts({ parts: library.parts }, runtime, { ticks: circuit.board.ticks })
  const indexes = workshopDefinitions({ parts })
  const known = (type) => indexes.has(type)
  const own = (node) => known(node.type)
  const views = new WeakMap()
  function project(scope) {
    if (!indexes.size) return scope
    if (views.has(scope)) return views.get(scope)
    const base = scope.board
    const view = {
      ...scope,
      workshop: parts,
      workshopPart: (type) => indexes.get(type),
      opening: (task, progress) => scope.opening(task, progress, project),
      stageChain: (task, built) => scope.stageChain(task, built, project),
      partOf: (type) => known(type) ? partOf(type) : scope.partOf(type),
      board: {
        ...base,
        wiring(task) {
          const original = base.wiring(task, view)
          return {
            ...original,
            defaults: (type) => known(type) ? {} : original.defaults?.(type),
            text: { ...original.text, settings: (node) => own(node) ? [] : original.text?.settings?.(node) },
            inputs: (node) => own(node) ? indexes.get(node.type).inputs : original.inputs(node),
            outputs: (node) => own(node) ? outputsOf(indexes.get(node.type)) : original.outputs(node),
            packed: (node) => own(node) || original.packed?.(node),
            portLabel: (node, port) => own(node) ? port : original.portLabel?.(node, port),
            holds: (node) => own(node) ? Boolean(base.ticks) : original.holds?.(node),
          }
        },
      },
    }
    views.set(scope, view)
    return view
  }
  return { known, view: project(circuit), project, resolve: partOf }
}

const outputsOf = ({ outputs }) => outputs.length > 1 ? outputs.map((name) => ({ key: name, label: name })) : null

/** Open a workshop version in the library captured on the parent, or in the active library for a draft. */
export function openWorkshopPart(node, parent, activeWorkshop) {
  const workshop = parent.workshop ?? workshopOf(parent.circuit) ?? activeWorkshop
  if (!workshop?.known(node.type)) return null
  return { key: node.type, circuit: workshop.resolve.definition(node.type).graph, level: parent.level, workshop }
}

/** Draw the ports of a personal part on its own board. */
export function workshopWiring(parts) {
  const output = (node) => node.type === WORKSHOP_OUTPUT
  return {
    ...parts,
    role: (node) => workshopInput(node) ? 'source' : output(node) ? 'sink' : parts.role(node),
    label: (node) => workshopInput(node) || output(node) ? node.params.name : parts.label(node),
    inputs: (node) => workshopInput(node) ? [] : output(node) ? ['in'] : parts.inputs(node),
    outputs: (node) => workshopInput(node) || output(node) ? null : parts.outputs(node),
  }
}
