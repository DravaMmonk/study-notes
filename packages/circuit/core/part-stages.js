// Stages specialize one stable part identity along a linear progression.
import { fullName } from 'kernel'


import { operationPart } from "./parts/operation.js"
import { resolveSettings } from "./parts/settings.js"

/** Merge a stage delta. An empty setting resets its specialization to the operation declaration. */
export function stagePatch(base, patch) {
  const next = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    if (key === 'id') continue
    if (value === null) { delete next[key]; continue }
    if (key === 'settings') {
      next.settings = { ...base.settings }
      for (const [name, setting] of Object.entries(value)) {
        next.settings[name] = Object.keys(setting).length ? stagePatch(base.settings?.[name] ?? {}, setting) : {}
      }
    } else if (value && typeof value === 'object' && !Array.isArray(value)) next[key] = stagePatch(base[key] ?? {}, value)
    else next[key] = value
  }
  return next
}

/** Index base parts and all their named stages in the same namespace. */
export function partStages(parts = {}) {
  const entries = new Map()
  const add = (id, value) => {
    if (entries.has(id)) throw new Error(`duplicate part or stage ${id}`)
    entries.set(id, value)
  }
  for (const [part, raw] of Object.entries(parts)) {
    const { stages = [], ...base } = raw
    let definition = base
    add(part, { part, index: 0, id: part, definition })
    stages.forEach((stage, index) => {
      const id = fullName(part.includes('/') ? part.split('/')[0] : '', stage.id).replace(/^\//, '')
      if (part.includes('/') && id.split('/')[0] !== part.split('/')[0]) throw new Error(`stage ${id} must belong to ${part.split('/')[0]}`)
      definition = stagePatch(definition, stage)
      add(id, { part, index: index + 1, id, definition })
    })
  }
  return entries
}

/** Runtime card shape for a selected stage, sharing the stable part id. */
export function stageDefinition(entry, operations) {
  if (!entry) return null
  const part = operationPart(entry.definition, operations)
  const settings = resolveSettings(part, operations)
  return { ...part, type: entry.part, stage: entry.id, settings,
    setting: Object.fromEntries(settings.map(setting => [setting.key, setting])),
    outputNames: part.outputs?.map(port => port.name) ?? null }
}

/** The earliest stage admitting the explicit settings of a reference card. */
export function requiredStage(parts, type, params = {}, stages = partStages(parts)) {
  const chain = [...stages.values()].filter(entry => entry.part === type)
  return chain.find(entry => {
    const settings = stageDefinition(entry)?.setting ?? {}
    return Object.entries(params).every(([key, value]) => {
      const setting = settings[key]
      if (!setting) return true
      if (setting.fixed && String(value) !== String(setting.default ?? setting.options?.[0]?.value)) return false
      return !setting.options || setting.options.some(option => String(option.value) === String(value))
    })
  })?.id ?? type
}
