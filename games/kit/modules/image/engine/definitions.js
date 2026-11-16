import { S } from '../../../engine/schema.js'
// Keep the image operations, scoring and course unlocks. Studio owns the parts' data and expressions.
import { operationsOf } from '../../../engine/parts/operation.js'
import { applyRules, defineParts, shows } from '../../../engine/parts/define.js'
import { NODE_TYPES } from './nodes.js'

const native = Object.entries(NODE_TYPES).filter(([, spec]) => !spec.fixed)
const nativeForResource = new Map(native.flatMap(([type, spec]) => {
  const outputs = typeof spec.outputs === 'function' ? spec.outputs() : [null]
  return outputs.map((output) => [`${type}${output ? `_${output}` : ''}`, { type, spec }])
}))

const parameterSchema = ({ kind, options, buttons, min, max, step, default: value }) => {
  const control = options ? (buttons ? 'buttons' : 'select') : kind === 'kernel' ? 'custom' : kind
  const presentation = { control, ...(buttons && { layout: buttons }), ...(kind === 'kernel' && { widget: 'image:widget-imageKernel' }) }
  const bounds = { ...(min !== undefined && { min }), ...(max !== undefined && { max }), ...(step !== undefined && { step }), ...(value !== undefined && { default: value }) }
  if (options) return S.opt(S.oneOf(options.map(([option]) => String(option)), { ...presentation, default: String(value) }))
  if (kind === 'kernel') return S.opt(S.list(S.num(), { ...presentation, default: value }))
  return S.opt(S.num({ ...bounds, ...presentation }))
}

/** One resource for each result of an existing image operation. */
export const IMAGE_OPS = Object.fromEntries(native.flatMap(([type, spec]) => {
  const settings = spec.params ?? []
  const outputs = typeof spec.outputs === 'function' ? spec.outputs() : [null]
  return outputs.map((output) => [
    `${type}${output ? `_${output}` : ''}`,
    {
      about: spec.label,
      args: spec.inputs.map((name) => ({ name, type: 'image:image', ...(spec.optional?.includes(name) && { optional: true }) })),
      returns: 'image:image',
      params: S.obj(Object.fromEntries(settings.map((setting) => [setting.key, parameterSchema(setting)]))),
      run(args, namedParams, ctx) {
        const input = Object.fromEntries(spec.inputs.flatMap((name, index) => args[index] == null ? [] : [[name, args[index]]]))
        const params = { ...namedParams }
        for (const { key, options } of settings) {
          params[key] = options?.find(([value]) => String(value) === params[key])?.[0] ?? params[key]
        }
        return spec.eval(input, params, ctx?.variant ?? null, output ?? undefined)
      },
    },
  ])
}))

const settingOf = (setting, old = {}) => {
  const { key, control, label, fixed, when, default: value, min, max, step, layout, options } = setting
  const originalOptions = new Map((old.options ?? []).map((option) => [String(option[0]), option]))
  const converted = options?.map((option) => {
    const prior = originalOptions.get(option.value)
    return [prior?.[0] ?? option.value, option.label ?? option.value, prior?.[2]]
  })
  const kind = control === 'custom' ? 'kernel' : control === 'buttons' ? 'select' : control
  return {
    key, label, fixed, when, kind, min, max, step, authored: setting,
    ...(converted && { options: converted }),
    ...(control === 'buttons' && { buttons: layout ?? 'row' }),
    default: converted?.find(([id]) => String(id) === String(value))?.[0] ?? value,
    ...(old.pi && { pi: true }),
    ...(old.learnable && { learnable: true }),
  }
}

export function imageDefinitions(file) {
  const defined = defineParts(file, IMAGE_OPS)
  const resources = new Map(Object.entries(defined.defs).map(([type, def]) => {
    return [type, operationsOf(def)]
  }))
  const authoredTypes = new Set([...resources.values()].flat().map((resource) => nativeForResource.get(resource)?.type))
  const types = Object.fromEntries(Object.entries(NODE_TYPES).filter(([type, spec]) => spec.fixed || !authoredTypes.has(type)))
  for (const [type, def] of Object.entries(defined.defs)) {
    if (types[type]?.fixed) continue
    const nativeSpec = nativeForResource.get(resources.get(type)[0])
    const nativeType = nativeSpec?.type
    const original = nativeSpec?.spec
    const part = defined.PARTS[type]
    const namespace = type.includes('/') ? type.slice(0, type.indexOf('/') + 1) : ''
    const flag = (value) => value && !value.includes(':') ? `${namespace}${value}` : value
    const params = def.settings.map((setting) => settingOf(
      { ...setting, default: part.defaults[setting.key] },
      original?.params?.find(({ key }) => key === setting.key),
    ))
    types[type] = {
      ...original,
      resource: nativeType,
      unlock: flag(original?.unlock),
      label: def.name,
      description: def.desc,
      inputs: part.inputs,
      inputTypes: part.inputTypes,
      outputType: part.outputType,
      outputTypes: part.outputTypes,
      inputLabels: Object.fromEntries(def.inputs.map((port) => [port.name, port.label ?? port.name])),
      outputLabels: Object.fromEntries((def.outputs ?? []).map((port) => [port.name, port.label ?? port.name])),
      outputs: part.outputs,
      params,
      definition: def,
      evaluate: part.eval,
      specialize: part.specialize,
      eval: (ins, params, variant, key) => part.eval(ins, { params }, { variant }, key ?? def.outputNames?.[0]),
    }
  }
  return {
    types, defs: defined.defs, ops: IMAGE_OPS,
    shows: (type, key, params) => !defined.defs[type]?.setting[key] || shows(defined.defs[type].setting[key], defined.defs[type], params, IMAGE_OPS),
    applyRules: (type, params, changed) => defined.defs[type] ? applyRules(defined.defs[type], params, changed, IMAGE_OPS) : params,
  }
}
