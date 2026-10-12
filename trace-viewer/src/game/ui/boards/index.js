// Board levels (kind: 'board') name a component here, loaded lazily. A board receives
// { level, onSolve, theme } and calls onSolve() once the player has met the level's goal.
// Add one line per board: name: lazy(() => import('./Name.jsx')),
import { lazy } from 'react'

export const BOARDS = {
}

export const boardFor = (name) => BOARDS[name] ?? null

export { lazy }
