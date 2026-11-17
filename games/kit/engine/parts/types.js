import { partPath } from './schema.js'
import { operationPart, operationTrees } from './operation.js'
import { holesOf, outletsOf, resolveSettings, insideOf, editorOf, regionsOf } from '../parts.js'

import { acceptsType, typeAlternatives as alternatives } from '../value-types.js'

const scalar = (type) => ({ num: 'circuit:number', int: 'circuit:number', str: 'circuit:string', bool: 'circuit:boolean', any: 'circuit:any' })[type] ?? type

/** Check declared ports and every compute branch against operation signatures. */
export function typeProblems(file, vocabulary) {
  const out = []
  const types = vocabulary.kinds.valueType ?? {}
  const ops = vocabulary.kinds.op ?? {}
  const compatible = (expected, actual) => acceptsType(expected, actual, types)
  const say = (at, says) => out.push({ at: partPath(at), says })
  for (const [name, declaration] of Object.entries(file.parts ?? {})) {
    const part = operationPart(declaration, ops)
    if (editorOf(part) !== 'circuit') continue
    const base = `.parts.${name}`
    if (declaration.outputType && declaration.outputType !== part.outputType) say(`${base}.outputType`, 'output type must come from the selected operation')
    const ports = [...holesOf(part), ...regionsOf(part)]
    const outputs = outletsOf(part)
    for (const port of [...ports, ...outputs]) if (!types[port.type]) say(base, `port ${port.name} needs a registered value type, found ${port.type}`)
    if (!outputs.length && !part.keeps && (!insideOf(part) || part.inputs) && !types[part.outputType]) say(`${base}.outputType`, `needs a registered value type, found ${part.outputType}`)
    if (insideOf(part)) continue
    const settings = Object.fromEntries(resolveSettings(part, ops).map((s) => [s.key, s]))
    const infer = (tree, at) => {
      if ('in' in tree) return ports.find((p) => p.name === tree.in)?.type ?? 'circuit:any'
      if ('num' in tree) return 'circuit:number'
      if ('str' in tree) return 'circuit:string'
      if ('set' in tree) {
        const control = settings[tree.set]?.control
        return ['slider', 'number'].includes(control) ? 'circuit:number' : control === 'toggle' ? 'circuit:boolean' : ['list', 'custom'].includes(control) ? 'circuit:list' : 'circuit:string'
      }
      if ('match' in tree) return [...new Set([...Object.values(tree.cases), ...(tree.other ? [tree.other] : [])].flatMap((branch) => alternatives(infer(branch, at))))]
      const args = tree.args.map((arg) => infer(arg, at))
      if (tree.call === 'circuit:held') return args[1]
      if (tree.call === 'circuit:if') return [...new Set(args.slice(1).flatMap(alternatives))]
      const op = ops[tree.call]
      if (!op) return 'circuit:any'
      const named = Object.fromEntries(Object.entries(tree.named).map(([key, value]) => [key, infer(value, at)]))
      const signatures = op.signatures ?? [op]
      const fits = signatures.filter((signature) => args.length === signature.args.length && args.every((actual, i) => !signature.args[i]?.type || compatible(signature.args[i].type, actual)))
      for (const [key, actual] of Object.entries(named)) {
        const schema = op.params?.fields?.[key] ?? fits[0]?.params?.fields?.[key]
        const expected = schema?.type === 'oneOf' ? scalar(typeof schema.values[0] === 'number' ? 'num' : typeof schema.values[0] === 'boolean' ? 'bool' : 'str') : schema?.type === 'list' ? 'circuit:list' : scalar(schema?.type)
        if (expected && !compatible(expected, actual)) say(at, `${tree.call} parameter ${key} has type ${actual}, expected ${expected}`)
      }
      if (!fits.length) say(at, `${tree.call} input types ${args.join(', ')} do not match its signature`)
      return [...new Set((fits.length ? fits : signatures).flatMap((signature) => alternatives(signature.returns ?? 'circuit:any')))]
    }
    for (const [key, tree] of Object.entries(operationTrees(part, ops))) {
      const at = `${base}.op${key ? `.${key}` : ''}`
      const actual = infer(tree, at)
      const expected = key ? outputs.find((p) => p.name === key)?.type : part.outputType
      if (expected && !compatible(expected, actual)) say(at, `output type ${actual} does not match ${expected}`)
    }
  }
  return out
}
