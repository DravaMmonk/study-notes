import { createContext, useContext, useSyncExternalStore } from 'react'
import { PHONE, useMedia } from './useMedia.js'
import { settings } from './settings.js'

export const SettingsContext = createContext({ id: '', views: null })
export function useSetting(key) {
  const game = useContext(SettingsContext)
  const phone = useMedia(PHONE)
  useSyncExternalStore(settings.subscribe, settings.snapshot, settings.snapshot)
  return [settings.get(game, key, { phone }), (value) => settings.set(game, key, value)]
}
