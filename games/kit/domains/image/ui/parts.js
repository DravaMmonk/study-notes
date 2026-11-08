import { ArrowRightFromLine, ArrowRightToLine } from 'lucide-react'
import { tr } from '../../../shell/i18n.js'
import { familyOf, iconOf } from './catalog.js'

// Vision Complete's nodes, described for the shared circuit editor (games/kit/circuit): the level's inputs are the
// sources, its outputs the sinks, everything else a part. Wires only need to avoid loops, which the editor checks.

export const PORT_LABELS = { a: 'a', b: 'b', in: '', left: { zh: '左', en: 'left' }, right: { zh: '右', en: 'right' }, c0: 'd=0', c1: 'd=1', c2: 'd=2', c3: 'd=3', mu: 'μ', sigma: 'σ', eps: 'ε' }

/** The parts of one level, by the course's engine (kit, ../engine/kit.js): its input cards are its sensors
 *  (ui/sensors.js), its output cards named by the level (or Output). */
export function partsFor(kit, { sensors, outputLabels, colourOutputs = [] } = {}) {
  return {
    ...kit.BOARD_PARTS,
    inputs: (node) => node.type === 'output' && !colourOutputs.includes(node.params.name) ? ['in'] : kit.BOARD_PARTS.inputs(node),
    outputs: (node) => node.type === 'input' && sensors?.[node.params.name]?.colour ? [{ key: null, label: tr('图', 'Image') }, ...['r', 'g', 'b'].map((key) => ({ key, label: key.toUpperCase() }))] : null,
    label: (node) => {
      if (node.type === 'input') return sensors?.[node.params.name]?.label ?? tr('输入', 'Input')
      if (node.type === 'output') return outputLabels?.[node.params.name] ?? tr('输出', 'Output')
      return kit.types[node.type].label
    },
    portLabel: (node, port) => node.type === 'output' && colourOutputs.includes(node.params.name) ? (port === 'in' ? { zh: '图', en: 'Image' } : port.toUpperCase()) : PORT_LABELS[port] ?? port,
    family: (node) => familyOf(node.type ?? 'input'),
    icon: (node) => (node.type === 'input' ? ArrowRightFromLine : node.type === 'output' ? ArrowRightToLine : iconOf(node.type)),
  }
}

/** Hide the constant value until a side has been selected. */
export const visibleSettings = (kit, node, flags) => kit.settingsOf(node.type, flags).filter((p) => !(node.type === 'arith' && p.key === 'constant' && (node.params.constantSide ?? 'none') === 'none'))
