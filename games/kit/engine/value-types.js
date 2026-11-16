import { registeredValueTypes } from './capabilities.js'

const scalar = (type) => ({ num: 'circuit:number', int: 'circuit:number', str: 'circuit:string', bool: 'circuit:boolean' })[type] ?? type
export const typeAlternatives = (type) => Array.isArray(type) ? type.flatMap(typeAlternatives) : [scalar(type)]

/** Union types accept every possible source value. Explicit any is the dynamic value type. */
export function acceptsType(expected, actual, types = registeredValueTypes) {
  const expand = (type) => typeAlternatives(type).flatMap((name) => types[name]?.accepts ?? [name])
  const targets = expand(expected)
  const sources = expand(actual)
  return targets.includes('circuit:any') || sources.includes('circuit:any') || sources.every((type) => targets.includes(type))
}
