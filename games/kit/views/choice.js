import { useContext, useSyncExternalStore } from 'react'
import { viewsFor } from '../engine/views.js'
import { SettingsContext } from '../shell/useSetting.js'
import { settings } from '../shell/settings.js'

// Every value and results row shares the game's device preference for its shape.
export function useViewChoice(shape, views) {
  const game = useContext(SettingsContext)
  useSyncExternalStore(settings.subscribe, settings.snapshot, settings.snapshot)
  const list = views ?? viewsFor(shape, game.views)
  const picked = settings.get(game, `view.${shape}`)
  return [list.includes(picked) ? picked : list[0], (view) => settings.set(game, `view.${shape}`, view), list]
}

export function useViewPicks() {
  const game = useContext(SettingsContext)
  useSyncExternalStore(settings.subscribe, settings.snapshot, settings.snapshot)
  return {
    of: (shape, list) => { const picked = settings.get(game, `view.${shape}`); return list.includes(picked) ? picked : list[0] },
    pick: (shapes, view) => shapes.forEach((shape) => settings.set(game, `view.${shape}`, view)),
  }
}
