// Keep the image operations, scoring and course unlocks. Studio owns the parts' data and expressions.
import { applyRules, defineParts, shows } from '../../../engine/parts/define.js'
import { NODE_TYPES } from './nodes.js'

const named = (names, values) => Object.fromEntries(names.map((name, index) => [name, values[index]]))
const native = Object.entries(NODE_TYPES).filter(([, spec]) => !spec.fixed)

/** One resource for each result of an existing image operation. */
export const IMAGE_OPS = Object.fromEntries(native.flatMap(([type, spec]) => {
  const settings = spec.params ?? []
  const outputs = typeof spec.outputs === 'function' ? spec.outputs() : [null]
  return outputs.map((output) => [
    ['image', type, output].filter(Boolean).join('_'),
    {
      about: spec.label,
      args: [...spec.inputs.map((name) => ({ name })), ...settings.map(({ key }) => ({ name: `setting_${key}` }))],
      run(args, _, ctx) {
        const input = Object.fromEntries(spec.inputs.flatMap((name, index) => args[index] == null ? [] : [[name, args[index]]]))
        const params = named(settings.map(({ key }) => key), args.slice(spec.inputs.length))
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
    ...(old.unlock && { unlock: old.unlock }),
    ...(old.pi && { pi: true }),
    ...(old.learnable && { learnable: true }),
  }
}

export function imageDefinitions(file) {
  const defined = defineParts(file, IMAGE_OPS)
  const types = { ...NODE_TYPES }
  for (const [type, def] of Object.entries(defined.defs)) {
    if (types[type]?.fixed) continue
    const original = NODE_TYPES[type]
    const part = defined.PARTS[type]
    const params = def.settings.map((setting) => settingOf(
      { ...setting, default: part.defaults[setting.key] },
      original?.params?.find(({ key }) => key === setting.key),
    ))
    types[type] = {
      ...original,
      label: def.name,
      description: def.desc,
      inputs: part.inputs,
      inputLabels: Object.fromEntries(def.inputs.map((port) => [port.name, port.label ?? port.name])),
      outputLabels: Object.fromEntries((def.outputs ?? []).map((port) => [port.name, port.label ?? port.name])),
      outputs: part.outputs,
      params,
      definition: def,
      evaluate: part.eval,
      eval: (ins, params, variant, key) => part.eval(ins, { params }, { variant }, key ?? def.outputNames?.[0]),
    }
  }
  return {
    types, defs: defined.defs, ops: IMAGE_OPS,
    shows: (type, key, params) => !defined.defs[type]?.setting[key] || shows(defined.defs[type].setting[key], defined.defs[type], params, IMAGE_OPS),
    applyRules: (type, params, changed) => defined.defs[type] ? applyRules(defined.defs[type], params, changed, IMAGE_OPS) : params,
  }
}
