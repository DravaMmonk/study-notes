// The logic domain's circuit boards as blueprint text (../../circuit/text.js, games/DESIGN.md 6): a proof, a machine
// and a board of gates, read and printed through the shape of their parts. Content writes reference and naive boards
// this way, the same text a player copies out of a level and pastes back. The editors' descriptions (ui/) add names,
// labels and icons to the same shapes.
import { print, read } from '../../circuit/text.js'
import { portsOf } from '../../engine/circuit.js'
import { FORMULA_TEXT } from './formula.js'
import { rulesOf } from './proof.js'
import { MACHINE_PARTS, RULE_PART, rulePartsOf } from './machine.js'
import { gateParts } from './gates.js'

/**
 * The shape of a board's nodes for the circuit kit (../../circuit/model.js parts): each part's ports, outputs and
 * regions from its engine part (`partOf(type)`), the level's own nodes (`sources`, `sinks`) given, formulas on cards
 * spelled in ASCII.
 */
export function shapeOf(partOf, { sources, sinks }) {
  return {
    inputs: (node) => (sinks.includes(node.type) ? ['in'] : sources.includes(node.type) ? [] : partOf(node.type) ? portsOf(partOf(node.type), node) : []),
    role: (node) => (sources.includes(node.type) ? 'source' : sinks.includes(node.type) ? 'sink' : 'part'),
    outputs: (node) => partOf(node.type)?.outputs?.(node)?.map((key) => ({ key, label: '' })) ?? null,
    frames: (node) => partOf(node.type)?.frames?.(node) ?? [],
    text: FORMULA_TEXT,
  }
}

/** A proof's shape, with a level's lemmas. */
export const proofShape = (lemmas = {}) => {
  const rules = rulesOf(lemmas)
  return { ...shapeOf((type) => rules[type], { sources: ['premise'], sinks: ['goal'] }), rules }
}

/** A machine board's shape, with the level's rule parts (none on the generator's board, which carries rules as values). */
export const machineShape = (level) => {
  const ruleParts = level.want === 'elim' ? new Map() : rulePartsOf(level)
  const partOf = (type) => MACHINE_PARTS[type] ?? (ruleParts.has(type) ? RULE_PART : undefined)
  return { ...shapeOf(partOf, { sources: ['in'], sinks: ['out'] }), ruleParts }
}

/** A board of gates' shape, with the gates the course builds. */
export const gateShape = (built = {}) => {
  const gates = gateParts(built)
  return shapeOf((type) => gates[type], { sources: ['letter'], sinks: ['out'] })
}

/** A board as blueprint lines, one string a line (no header). */
export const toLines = (board, shape) => print(board, shape).split('\n').filter((line) => line && !line.startsWith('#'))

/**
 * The board some blueprint lines describe, on the level's start (its own nodes): every type the shape knows may be
 * placed (what the level may really hold is the checks' business). Throws an Error saying every line it cannot read.
 */
export function fromLines(lines, start, shape, types) {
  const out = read(lines.join('\n'), start, shape, types)
  if (out.errors) throw new Error(out.errors.map((e) => e.en).join(' '))
  return out.graph
}
