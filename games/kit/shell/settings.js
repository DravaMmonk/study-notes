import { WORDS } from './words.js'

// Device preferences belong to presentation and editing, never to puzzle progress.
const registry = new Map()
export function defineSetting(setting) {
  if (registry.has(setting.key)) throw new Error(`Duplicate setting: ${setting.key}`)
  registry.set(setting.key, setting)
  return setting
}
export const settingsFor = (game, context) => [...registry.values()].filter((s) => !s.when || s.when(game, context))
export const optionsFor = (setting, game) => typeof setting.options === 'function' ? setting.options(game) : setting.options ?? []
const defaultFor = (setting, game, context) => typeof setting.default === 'function' ? setting.default(game, context) : setting.default
const valid = (setting, value, game) => setting.kind === 'toggle' ? typeof value === 'boolean' : (setting.values ?? optionsFor(setting, game).map((o) => o.value)).includes(value)

export function createSettings(storage = () => globalThis.localStorage) {
  let version = 0
  const listeners = new Set()
  const read = () => {
    try { const all = JSON.parse(storage().getItem('games.settings')); return all && typeof all === 'object' && !Array.isArray(all) ? all : {} } catch { return {} }
  }
  const notify = () => { version++; listeners.forEach((f) => f()) }
  return {
    subscribe: (f) => { listeners.add(f); return () => listeners.delete(f) },
    snapshot: () => version,
    notify,
    get: (game, key, context) => {
      const setting = registry.get(key)
      if (!setting) throw new Error(`Unknown setting: ${key}`)
      const value = read()[game.id]?.[key]
      return valid(setting, value, game) ? value : defaultFor(setting, game, context)
    },
    set: (game, key, value) => {
      const setting = registry.get(key)
      if (!setting || !valid(setting, value, game)) return
      const all = read()
      try { storage().setItem('games.settings', JSON.stringify({ ...all, [game.id]: { ...all[game.id], [key]: value } })) } catch { /* Unavailable storage leaves the defaults in force. */ }
      notify()
    },
    reset: (game) => {
      const all = read()
      delete all[game.id]
      try { storage().setItem('games.settings', JSON.stringify(all)) } catch { /* Defaults already apply when storage is unavailable. */ }
      notify()
    },
  }
}
export const settings = createSettings()
const staged = (game) => [...(game.circuit?.played?.values() ?? [])].some((tasks) => tasks.some((t) => t.carry || t.carries))
defineSetting({
  key: 'playbackSpeed',
  group: 'display',
  label: { zh: '自动步进速度', en: 'Playback speed' },
  kind: 'choice',
  default: 1,
  options: [0.5, 1, 2].map((value) => ({ value, label: `${value}×` })),
})
defineSetting({ key: 'manualBlocks', group: 'edit', label: WORDS.manualBlocks, kind: 'toggle', default: false, when: (game,{phone=false}={})=>phone&&staged(game) })
defineSetting({ key: 'connectionLabels', group: 'display', label: { zh: '跨段连线画成标签', en: 'Label cross-section wires' }, kind: 'toggle', default: (_game, { phone = false } = {}) => phone, when: staged })
