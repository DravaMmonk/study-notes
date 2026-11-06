import { createContext, useContext, useSyncExternalStore } from 'react'
import { settings } from './settings.js'

export const SettingsContext = createContext({ id: '', views: null })
export function useSetting(key) {
  const game = useContext(SettingsContext)
  useSyncExternalStore(settings.subscribe, settings.snapshot, settings.snapshot)
  return [settings.get(game, key), (value) => settings.set(game, key, value)]
}
