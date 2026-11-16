import { ArrowRightFromLine, CircuitBoard } from 'lucide-react'
import { holesOf, outletsOf, regionsOf } from '../engine/pieces.js'
import { T } from '../shell/i18n.js'
import { iconOf } from '../shell/parts/icons.js'
import { WORKSHOP_INPUT, WORKSHOP_OUTPUT } from '../engine/workshop-terminals.js'
import { openRef } from '../shell/refs.js'
import { packedBoards } from './packed-boards.js'
import { openWorkshopPart, workshopWiring } from './workshop-view.js'

const GIVES = T('得出', 'Result')
/** Add labels and icons to a circuit view without changing its ports or active regions. */
export function withPartLabels(base, of) {
  const defOf = (node) => base.role(node) === 'part' ? of(node.type) : null
  return {
    ...base,
    label: (node) => defOf(node)?.name ?? base.label?.(node) ?? '',
    family: (node) => defOf(node)?.family ?? base.family?.(node),
    icon: (node) => {
      const def = defOf(node)
      return def ? iconOf(def.icon) : base.icon?.(node)
    },
    portLabel: (node, port) => {
      const def = defOf(node)
      if (!def) return base.portLabel?.(node, port) ?? ''
      if (base.frames?.(node)?.some(({ name }) => name === port)) return ''
      return holesOf(def).find(({ name }) => name === port)?.label ?? port
    },
    outputs: (node) => {
      const outputs = base.outputs?.(node)
      const def = defOf(node)
      if (!def || !outputs) return outputs ?? null
      const outlets = outletsOf(def)
      if (outlets.length) return outputs.map((port) => ({ ...port, label: outlets.find(({ name }) => name === port.key)?.label ?? port.label }))
      const regions = base.frames?.(node)
      if (regions?.some(({ opens }) => opens)) {
        return outputs.map((port) => {
          const label = port.key === null ? GIVES : ''
          return { ...port, label, short: label }
        })
      }
      return outputs
    },
    frames: (node) => {
      const frames = base.frames?.(node) ?? []
      const def = defOf(node)
      return def ? frames.map((frame) => ({ ...frame, label: regionsOf(def).find(({ name }) => name === frame.name)?.label ?? frame.label ?? frame.name })) : frames
    },
  }
}

const labelOf = (list, name) => list?.find((x) => x.name === name)?.label ?? name

/** The editor's description of a task's cards (model.js): the board's wiring, drawn. */
export function partsFor(level, circuit, { cards, portLabels, defined }) {
  const { board, BUILT, builtBy, pieces } = circuit
  const wiring = board.wiring(level, circuit)
  // A fixed card the domain does not draw its own way: a source on the left, a sink on the right.
  const draft = (node) => node.type === WORKSHOP_INPUT || node.type === WORKSHOP_OUTPUT
  const given = (node) => draft(node) || (board.isFixed(node.type) && !cards[node.type])
  const workshop = (node) => circuit.workshopPart?.(node.type)
  const parts = {
    ...wiring,
    label: (node) => (board.isFixed(node.type) ? board.labelOf(level, node.id) : BUILT[node.type] ? pieces[node.type].name : workshop(node)?.name ?? cards[node.type]?.name ?? node.type),
    portLabel: (node, port) => (BUILT[node.type] ? labelOf(board.portsIn(builtBy(node.type, node.params)), port) : portLabels[node.type]?.[port] ?? wiring.portLabel?.(node, port) ?? ''),
    family: (node) => (BUILT[node.type] || workshop(node) ? 'built' : given(node) ? (node.type === WORKSHOP_OUTPUT || (!draft(node) && wiring.role(node) === 'sink') ? 'end' : 'given') : cards[node.type]?.family),
    icon: (node) => (BUILT[node.type] || workshop(node) ? CircuitBoard : given(node) ? ArrowRightFromLine : cards[node.type]?.icon),
    valueView: wiring.valueView ?? (() => level.views?.grid?.[0] ?? 'value'),
  }
  const definition = circuit.defined ?? defined
  return definition ? withPartLabels(parts, definition.of) : parts
}

/** Shared descriptions and edit destinations for the step log and the two packed board entry points. */
export function packedView(course, options, activeWorkshop) {
  const views = packedBoards(course, (board, view) => ({ ...board, parts: partsFor(board.level, view, options) }))
  return {
    root: views.root,
    open: (node, at) => {
      const opened = openWorkshopPart(node, at, activeWorkshop)
      return opened ? { ...opened, parts: workshopWiring(at.parts) } : views.open(node, at)
    },
    edit: (node, at) => {
      if (openWorkshopPart(node, at, activeWorkshop)) return null
      const task = views.builder(node, at)
      return task ? () => openRef('level', task.id, task.task) : null
    },
  }
}
