import { ArrowRightFromLine, CircuitBoard } from 'lucide-react'
import { openRef } from '../shell/refs.js'
import { packedBoards } from './packed-boards.js'

const labelOf = (list, name) => list?.find((x) => x.name === name)?.label ?? name

/** The editor's description of a task's cards (model.js): the board's wiring, drawn. */
export function partsFor(level, circuit, { cards, portLabels }) {
  const { board, BUILT, builtBy, pieces } = circuit
  const wiring = board.wiring(level, circuit)
  // A fixed card the domain does not draw its own way: a source on the left, a sink on the right.
  const given = (node) => board.isFixed(node.type) && !cards[node.type]
  return {
    ...wiring,
    label: (node) => (board.isFixed(node.type) ? board.labelOf(level, node.id) : BUILT[node.type] ? pieces[node.type].name : cards[node.type]?.name ?? node.type),
    portLabel: (node, port) => (BUILT[node.type] ? labelOf(board.portsIn(builtBy(node.type, node.params)), port) : portLabels[node.type]?.[port] ?? wiring.portLabel?.(node, port) ?? ''),
    family: (node) => (BUILT[node.type] ? 'built' : given(node) ? (wiring.role(node) === 'sink' ? 'end' : 'given') : cards[node.type]?.family),
    icon: (node) => (BUILT[node.type] ? CircuitBoard : given(node) ? ArrowRightFromLine : cards[node.type]?.icon),
    valueView: wiring.valueView ?? (() => level.views?.grid?.[0] ?? 'value'),
  }
}

/** Shared descriptions and edit destinations for the step log and the two packed board entry points. */
export function packedView(course, options) {
  const views = packedBoards(course, (board, view) => ({ ...board, parts: partsFor(board.level, view, options) }))
  return {
    root: views.root,
    open: views.open,
    edit: (node, at) => {
      const task = views.builder(node, at)
      if (task) openRef('level', task.id, task.task)
    },
  }
}
