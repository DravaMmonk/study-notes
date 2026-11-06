import { useContext, useSyncExternalStore } from 'react'
import { usable, viewsFor } from '../engine/views.js'
import { SettingsContext } from '../shell/useSetting.js'
import { settings } from '../shell/settings.js'

// Every value and results row shares the game's device preference for its shape. The views offered are those among
// `views` (by default the game's for the shape) that can draw `value`; a pick that cannot draw it starts it in the first.
export function useViewChoice(shape, views, value) {
  const game = useContext(SettingsContext)
  useSyncExternalStore(settings.subscribe, settings.snapshot, settings.snapshot)
  const list = usable(views ?? viewsFor(shape, game.views), value)
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
