// Operation declarations supply the executable signature. Pieces only specialize presentation and settings.
import { registeredOperations } from '../capabilities.js'

export const operationsOf = (piece) => typeof piece.op === 'string' ? [piece.op] : Object.values(piece.op ?? {})

/** Resolve ports from the selected operations, preserving authored display labels. */
export function operationPiece(piece, operations = registeredOperations) {
  const names = operationsOf(piece)
  if (!names.length) return piece
  const inputs = new Map()
  const regions = new Set((piece.regions ?? []).map(port => port.name))
  for (const name of names) for (const port of operations[name]?.args ?? []) {
    if (!regions.has(port.name)) inputs.set(port.name, { ...port, ...(piece.inputs?.find(p => p.name === port.name) ?? {}) })
  }
  const output = typeof piece.op === 'string'
    ? { outputType: operations[piece.op]?.returns }
    : { outputs: Object.entries(piece.op).map(([name, op]) => ({ name, type: operations[op]?.returns, ...(piece.outputs?.find(p => p.name === name) ?? {}) })) }
  const declared = names.flatMap(name => [...(operations[name]?.args ?? []), ...(operations[name]?.regions ?? [])])
  return { ...piece, inputs: [...inputs.values()], ...output,
    ...(piece.regions && { regions: piece.regions.map(region => ({ type: declared.find(port => port.name === region.name)?.type, ...region })) }) }
}

/** A direct call tree uses declared ports and named parameters, including settings consumed through context. */
export function operationTrees(piece, operations) {
  const entries = typeof piece.op === 'string' ? [['', piece.op]] : Object.entries(piece.op ?? {})
  return Object.fromEntries(entries.map(([key, name]) => [key, {
    call: name,
    args: (operations[name]?.args ?? []).map(port => ({ in: port.name })),
    named: Object.fromEntries(Object.keys(operations[name]?.params?.fields ?? {}).map(key => [key, { set: key }])),
  }]))
}
