import { regionsOf } from './regions.js'
import { outputsOf } from './model.js'

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

/** Use the current board's view for all three kinds of port readout. */
export function portNotes(card, context) {
  return {
    outNote: card.outNote && ((node, key) => card.outNote(node, key, context)),
    regionNote: card.regionNote && ((node, region) => card.regionNote(node, region, context)),
    resultNote: card.resultNote && ((node, region) => card.resultNote(node, region, context)),
  }
}
