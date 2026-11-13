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
    outputs: (node) => node.type === 'input' ? (sensors?.[node.params.name]?.colour ? [{ key: null, label: tr('图') }, ...['r', 'g', 'b'].map((key) => ({ key, label: key.toUpperCase() }))] : null) : kit.BOARD_PARTS.outputs(node),
    label: (node) => {
      if (node.type === 'input') return sensors?.[node.params.name]?.label ?? tr('输入', 'Input')
      if (node.type === 'output') return outputLabels?.[node.params.name] ?? tr('输出', 'Output')
      return kit.types[node.type].label
    },
    portLabel: (node, port) => node.type === 'output' && colourOutputs.includes(node.params.name) ? (port === 'in' ? { zh: '图', en: 'Image' } : port.toUpperCase()) : kit.types[node.type]?.inputLabels?.[port] ?? PORT_LABELS[port] ?? port,
    family: (node) => familyOf(node.type ?? 'input', kit.types),
    icon: (node) => (node.type === 'input' ? ArrowRightFromLine : node.type === 'output' ? ArrowRightToLine : iconOf(node.type, kit.types)),
    valueView: () => 'pixels',
    hasSettings: (node) => Boolean(kit.types[node.type]?.definition?.settings?.length),
  }
}

/** The parts box holds every setting of a part on its bench, whatever the player holds so far. */
export const EVERY = () => true

/** Hide the constant value until a side has been selected. */
export const visibleSettings = (kit, node, has) => kit.settingsOf(node.type, has).filter((p) => p.options?.length !== 0 && kit.shows(node.type, p.key, node.params) && !(node.type === 'arith' && p.key === 'constant' && (node.params.constantSide ?? 'none') === 'none'))
