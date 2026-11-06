// The view a player picked for each shape (games/DESIGN.md 6.10): one choice per game and shape, followed by every row
// that offers it and by the values on the board's cards, kept on this device as a per-viewer convenience. The game's
// own defaults (game.json `views`) come in through ViewsContext, which the shell provides (GameShell.jsx).
import { createContext, useContext, useSyncExternalStore } from 'react'
import { viewsFor } from '../engine/views.js'

export const ViewsContext = createContext({ game: '', defaults: null })

const picks = new Map()
const listeners = new Set()
let version = 0
const subscribe = (f) => {
  listeners.add(f)
  return () => listeners.delete(f)
}

function picksOf(game) {
  if (!picks.has(game)) {
    let stored = {}
    try {
      stored = JSON.parse(localStorage.getItem(`${game}.views`)) ?? {}
    } catch { /* none kept: every shape starts in its first view */ }
    picks.set(game, stored)
  }
  return picks.get(game)
}

/** Pick `view` for each of `shapes` in `game`. */
export function pickView(game, shapes, view) {
  const all = { ...picksOf(game), ...Object.fromEntries(shapes.map((s) => [s, view])) }
  picks.set(game, all)
  try {
    localStorage.setItem(`${game}.views`, JSON.stringify(all))
  } catch { /* the pick lasts this page only */ }
  version++
  listeners.forEach((f) => f())
}

/**
 * The view `shape` is drawn in among `views` (by default the game's for the shape): the one the player picked when it
 * is among them, else the first; with a setter that picks for this shape.
 */
export function useViewChoice(shape, views) {
  const { game, defaults } = useContext(ViewsContext)
  useSyncExternalStore(subscribe, () => version)
  const list = views ?? viewsFor(shape, defaults)
  const picked = picksOf(game)[shape]
  return [list.includes(picked) ? picked : list[0], (view) => pickView(game, [shape], view), list]
}

/** What a results area needs to read and set several shapes' picks at once. */
export function useViewPicks() {
  const { game } = useContext(ViewsContext)
  useSyncExternalStore(subscribe, () => version)
  const all = picksOf(game)
  return {
    of: (shape, list) => (list.includes(all[shape]) ? all[shape] : list[0]),
    pick: (shapes, view) => pickView(game, shapes, view),
  }
}
