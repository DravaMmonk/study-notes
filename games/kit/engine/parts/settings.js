// Settings belong to a piece. Operation parameters supply their shared control and constraints.
import { parse } from './expr.js'
import { registeredOperations } from '../capabilities.js'

/** Find parameter declarations bound directly to settings, including nested and multi-output calls. */
export function settingParameters(piece, operations = registeredOperations) {
  const found = new Map()
  const walk = (tree) => {
    if ('match' in tree) {
      for (const branch of [tree.match, ...Object.values(tree.cases), ...(tree.other ? [tree.other] : [])]) walk(branch)
    }
    if (!('call' in tree)) return
    const op = operations[tree.call]
    const fields = op?.params?.fields ?? {}
    const args = tree.args.map((arg, index) => [op?.args?.[index]?.name?.replace(/^setting_/, ''), arg])
    for (const [name, arg] of [...args, ...Object.entries(tree.named)]) {
      if (arg.set && fields[name]) found.set(arg.set, [...(found.get(arg.set) ?? []), fields[name]])
      walk(arg)
    }
  }
  for (const text of typeof piece.compute === 'string' ? [piece.compute] : Object.values(piece.compute ?? {})) {
    let tree
    try { tree = parse(text) } catch { continue }
    walk(tree)
  }
  return found
}

/** Convert a typed parameter schema to the circuit's setting descriptor. */
export function parameterSetting(schema) {
  const control = schema.control ?? ({ num: 'number', int: 'number', bool: 'toggle', oneOf: 'select', list: 'list', str: 'tree' })[schema.type]
  const fields = ['label', 'about', 'default', 'min', 'max', 'step', 'unit', 'layout', 'marks', 'widget', 'params', 'stepper', 'on', 'off']
  const setting = Object.fromEntries(fields.filter((key) => schema[key] !== undefined).map((key) => [key, schema[key]]))
  return { control, ...setting, ...(schema.type === 'int' && { integer: true }),
    ...(schema.type === 'oneOf' && { options: schema.options ?? schema.values.map((value) => ({ value: String(value) })) }) }
}

/** Resolve the inline declarations once at the boundary to runtime setting arrays. */
export function resolveSettings(piece, operations = registeredOperations) {
  const parameters = settingParameters(piece, operations)
  return Object.entries(piece.settings ?? {}).map(([key, patch]) => {
    const schemas = parameters.get(key) ?? []
    const inherited = schemas.length ? parameterSetting(schemas[0]) : {}
    const { remove = [], ...fields } = patch
    const setting = { ...inherited, ...fields, key }
    if (setting.options) setting.options = setting.options.filter((option) => !remove.includes(String(option.value)))
    return setting
  })
}
