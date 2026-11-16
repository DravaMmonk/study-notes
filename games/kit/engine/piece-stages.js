// Stages specialize one stable piece identity along a linear progression.
import { fullName } from './names.js'
import { operationPiece } from './parts/operation.js'
import { resolveSettings } from './parts/settings.js'

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

/** Index base pieces and all their named stages in the same namespace. */
export function pieceStages(pieces = {}) {
  const entries = new Map()
  const add = (id, value) => {
    if (entries.has(id)) throw new Error(`duplicate piece or stage ${id}`)
    entries.set(id, value)
  }
  for (const [piece, raw] of Object.entries(pieces)) {
    const { stages = [], ...base } = raw
    let definition = base
    add(piece, { piece, index: 0, id: piece, definition })
    stages.forEach((stage, index) => {
      const id = fullName(piece.includes('/') ? piece.split('/')[0] : '', stage.id).replace(/^\//, '')
      if (piece.includes('/') && id.split('/')[0] !== piece.split('/')[0]) throw new Error(`stage ${id} must belong to ${piece.split('/')[0]}`)
      definition = stagePatch(definition, stage)
      add(id, { piece, index: index + 1, id, definition })
    })
  }
  return entries
}

/** Runtime card shape for a selected stage, sharing the stable piece id. */
export function stageDefinition(entry, operations) {
  if (!entry) return null
  const piece = operationPiece(entry.definition, operations)
  const settings = resolveSettings(piece, operations)
  return { ...piece, type: entry.piece, stage: entry.id, settings,
    setting: Object.fromEntries(settings.map(setting => [setting.key, setting])),
    outputNames: piece.outputs?.map(port => port.name) ?? null }
}

/** The earliest stage admitting the explicit settings of a reference card. */
export function requiredStage(pieces, type, params = {}, stages = pieceStages(pieces)) {
  const chain = [...stages.values()].filter(entry => entry.piece === type)
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
