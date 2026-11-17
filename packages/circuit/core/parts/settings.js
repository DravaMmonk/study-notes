// Settings belong to a part. Operation parameters supply their shared control and constraints.
import { registeredOperations } from 'kernel'



/** Collect the parameter declarations of each selected operation. */
export function settingParameters(part, operations = registeredOperations) {
  const found = new Map()
  const names = typeof part.op === 'string' ? [part.op] : Object.values(part.op ?? {})
  for (const name of names) for (const [key, schema] of Object.entries(operations[name]?.params?.fields ?? {})) {
    found.set(key, [...(found.get(key) ?? []), schema])
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
export function resolveSettings(part, operations = registeredOperations) {
  const parameters = settingParameters(part, operations)
  const keys = new Set([...parameters.keys(), ...Object.keys(part.settings ?? {})])
  return [...keys].map(key => {
    const patch = part.settings?.[key] ?? {}
    const schemas = parameters.get(key) ?? []
    const inherited = schemas.length ? parameterSetting(schemas[0]) : {}
    const { remove = [], add = [], ...fields } = patch
    const setting = { ...inherited, ...fields, key }
    if (setting.options) setting.options = setting.options.filter((option) => !remove.includes(String(option.value)) || add.includes(String(option.value)))
    return setting
  })
}
