import { regionsOf } from './regions.js'
import { sourceOf } from '../engine/wire-source.js'
import { ends, feeding, inPort, outPort, outputsOf, parsePort, wireRefusal } from './model.js'

/** The ports on the card itself and the ports shown within its frame regions. */
export function cardPorts(parts, node) {
  const regions = regionsOf(parts, node)
  const own = new Set(regions.map((region) => region.name))
  const outputs = outputsOf(parts, node)
  return {
    inputs: parts.inputs(node).filter((port) => !own.has(port)),
    outputs: outputs.filter(({ key }) => !own.has(key)),
    regions: regions.map((region) => ({ ...region, output: outputs.find(({ key }) => key === region.name) })),
  }
}

export const NO_CARD_PORT = { zh: '这个元件没有能接这根线的口', en: 'This part has no port this wire can go to' }

/** Choose a card's first free compatible input, or its first public output if an input was picked. */
export function portOnCard(graph, parts, picked, node) {
  if (!node) return null
  if (parsePort(picked).side === 'in') {
    const [output] = cardPorts(parts, node).outputs
    return output ? outPort(sourceOf(node.id, output.key)) : null
  }
  const targets = parts.inputs(node)
  let occupied = null
  for (const input of targets) {
    const port = inPort(node.id, input)
    if (wireRefusal(graph, parts, ends(picked, port))) continue
    if (!feeding(graph, node.id, input)) return port
    occupied ??= port
  }
  // When none fits, the first input gives the reason for refusing the connection.
  return occupied ?? (targets.length ? inPort(node.id, targets[0]) : null)
}

/** Use the current board's view for all three kinds of port readout. */
export function portNotes(card, context) {
  return {
    outNote: card.outNote && ((node, key) => card.outNote(node, key, context)),
    regionNote: card.regionNote && ((node, region) => card.regionNote(node, region, context)),
    resultNote: card.resultNote && ((node, region) => card.resultNote(node, region, context)),
  }
}
