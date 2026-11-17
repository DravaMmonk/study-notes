// Operation declarations supply the executable signature. Parts only specialize presentation and settings.
import { registeredOperations } from '../capabilities.js'

export const operationsOf = (part) => typeof part.op === 'string' ? [part.op] : Object.values(part.op ?? {})

/** Resolve ports from the selected operations, preserving authored display labels. */
export function operationPart(part, operations = registeredOperations) {
  const names = operationsOf(part)
  if (!names.length) return part
  const inputs = new Map()
  const regions = new Set((part.regions ?? []).map(port => port.name))
  for (const name of names) for (const port of operations[name]?.args ?? []) {
    if (!regions.has(port.name)) inputs.set(port.name, { ...port, ...(part.inputs?.find(p => p.name === port.name) ?? {}) })
  }
  const output = typeof part.op === 'string'
    ? { outputType: operations[part.op]?.returns }
    : { outputs: Object.entries(part.op).map(([name, op]) => ({ name, type: operations[op]?.returns, ...(part.outputs?.find(p => p.name === name) ?? {}) })) }
  const declared = names.flatMap(name => [...(operations[name]?.args ?? []), ...(operations[name]?.regions ?? [])])
  return { ...part, inputs: [...inputs.values()], ...output,
    ...(part.regions && { regions: part.regions.map(region => ({ type: declared.find(port => port.name === region.name)?.type, ...region })) }) }
}

/** A direct call tree uses declared ports and named parameters, including settings consumed through context. */
export function operationTrees(part, operations) {
  const entries = typeof part.op === 'string' ? [['', part.op]] : Object.entries(part.op ?? {})
  return Object.fromEntries(entries.map(([key, name]) => [key, {
    call: name,
    args: (operations[name]?.args ?? []).map(port => ({ in: port.name })),
    named: Object.fromEntries(Object.keys(operations[name]?.params?.fields ?? {}).map(key => [key, { set: key }])),
  }]))
}
