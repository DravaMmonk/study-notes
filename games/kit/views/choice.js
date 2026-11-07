import { createContext, useContext, useSyncExternalStore } from 'react'
import { usable, viewsFor } from '../engine/views.js'
import { SettingsContext } from '../shell/useSetting.js'
import { picks, viewOf } from './picks.js'

// The views a value is offered and the one it is drawn in (./picks.js). A screen says whose picks they are with
// <ViewScope.Provider value={{ scope, starts, author }}> (scope: its task; starts: { of: view } the views its ports start
// in; author(of) → set(view) | null: in the studio's editor, switching a port's view writes the view it starts in,
// in place of a pick); outside one, every value is drawn in the first view offered and nothing can be switched.

export const ViewScope = createContext({ scope: null, starts: {}, author: () => null })

/** The views among `views` (by default the game's for the shape) that can draw `value`. */
export function useOffered(shape, views, value) {
  const game = useContext(SettingsContext)
  return usable(views ?? viewsFor(shape, game.views), value)
}

/** of(of, list) → the view a value is drawn in; pick(of) → a setter for it, or null where it cannot be switched. */
export function useViewPicks() {
  const game = useContext(SettingsContext)
  const { scope, starts, author } = useContext(ViewScope)
  useSyncExternalStore(picks.subscribe, picks.snapshot, picks.snapshot)
  const kept = (of) => Boolean(scope && of) && !author(of)
  return {
    of: (of, list) => viewOf(list, kept(of) ? picks.get(game.id, scope, of) : undefined, starts[of]),
    pick: (of) => author(of) ?? (kept(of) ? (view) => picks.set(game.id, scope, of, view) : null),
  }
}
