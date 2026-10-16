import { ArrowRightFromLine, ArrowRightToLine } from 'lucide-react'
import { NODE_TYPES, inputsOf } from '../engine/nodes.js'
import { tr } from '../../../../games/kit/shell/i18n.js'
import { familyOf, iconOf } from './catalog.js'

// Vision Complete's nodes, described for the shared circuit editor (games/kit/circuit): the level's inputs are the
// sources, its outputs the sinks, everything else a part. Wires only need to avoid loops, which the editor checks.

export const PORT_LABELS = { a: 'a', b: 'b', in: '', left: { zh: '左', en: 'left' }, right: { zh: '右', en: 'right' }, c0: 'd=0', c1: 'd=1', c2: 'd=2', c3: 'd=3' }

/** The parts of one level: its input and output cards are named by the level (or Input / Output). */
export function partsFor({ inputLabels, outputLabels, sources = 1 } = {}) {
  return {
    role: (node) => (node.type === 'input' ? 'source' : node.type === 'output' ? 'sink' : 'part'),
    inputs: (node) => (node.type ? inputsOf(node.type) : []),
    label: (node) => {
      if (node.type === 'input') return inputLabels?.[node.params.name] ?? (sources > 1 ? node.params.name : tr('输入', 'Input'))
      if (node.type === 'output') return outputLabels?.[node.params.name] ?? tr('输出', 'Output')
      return NODE_TYPES[node.type].label
    },
    portLabel: (node, port) => PORT_LABELS[port] ?? port,
    family: (node) => familyOf(node.type ?? 'input'),
    icon: (node) => (node.type === 'input' ? ArrowRightFromLine : node.type === 'output' ? ArrowRightToLine : iconOf(node.type)),
  }
}
