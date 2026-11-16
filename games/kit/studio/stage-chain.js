// A piece's stages as the studio shows them (games/PACKAGES.md 7.4): the piece itself, then each stage with what it
// changes over the one before; at each step every setting with what the operation declares, what the piece (or its
// stages so far) narrows, and what holds there.
import { stagePatch } from '../engine/piece-stages.js'
import { parameterSetting, resolveSettings, settingParameters } from '../engine/parts/settings.js'

/** A stage's full id: a short stage id in the piece's namespace. */
export const stageId = (piece, id) => (id.includes('/') || !piece.includes('/') ? id : `${piece.slice(0, piece.indexOf('/'))}/${id}`)

/** The changes a stage writes, one per field (a setting's narrowing one per setting): [{ path, value }]. */
export function stageChanges(stage) {
  return Object.entries(stage).filter(([key]) => key !== 'id').flatMap(([key, value]) => (key === 'settings' && value && typeof value === 'object'
    ? Object.entries(value).map(([setting, patch]) => ({ path: ['settings', setting], value: patch }))
    : [{ path: [key], value }]))
}

/**
 * The settings at one step: [{ key, declared (the operation parameter's setting, or null when the piece writes it
 * whole), narrowed (what the piece and its stages so far write over it; null: as declared), effective, changed (this
 * step changes it) }].
 */
export function settingRows(definition, operations, changed = []) {
  const parameters = settingParameters(definition, operations)
  const effective = new Map(resolveSettings(definition, operations).map((setting) => [setting.key, setting]))
  return [...effective.keys()].map((key) => ({
    key,
    declared: parameters.get(key)?.length ? parameterSetting(parameters.get(key)[0]) : null,
    narrowed: definition.settings?.[key] && Object.keys(definition.settings[key]).length ? definition.settings[key] : null,
    effective: effective.get(key),
    changed: changed.includes(key),
  }))
}

/**
 * The chain of piece `piece` (`raw`: its file): [{ id, index, changes, definition, settings }], the piece itself first.
 * `operations`: the kernel's operation declarations by name.
 */
export function stageChain(piece, raw, operations = {}) {
  const { stages = [], ...base } = raw ?? {}
  const steps = [{ id: piece, index: 0, changes: [], definition: base, settings: settingRows(base, operations, Object.keys(base.settings ?? {})) }]
  let definition = base
  stages.forEach((stage, k) => {
    definition = stagePatch(definition, stage)
    const changes = stageChanges(stage)
    steps.push({ id: stageId(piece, stage.id), index: k + 1, changes, definition, settings: settingRows(definition, operations, changes.filter((c) => c.path[0] === 'settings').map((c) => c.path[1])) })
  })
  return steps
}

/** The piece as a stage of it has it (its definition there, with the stages it still has to come). */
export function pieceAtStage(piece, raw, stage) {
  const step = stageChain(piece, raw).find((s) => s.id === stage)
  return step ? { ...step.definition, stages: (raw.stages ?? []).slice(step.index) } : raw
}

/** A free id for a new stage of `piece`, among the ids `taken`. */
export function newStageId(piece, taken) {
  const short = piece.slice(piece.indexOf('/') + 1)
  let k = 2
  while (taken.includes(stageId(piece, `${short}-${k}`))) k += 1
  return `${short}-${k}`
}
