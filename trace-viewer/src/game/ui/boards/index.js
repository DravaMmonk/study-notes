// Board levels (kind: 'board') name a component here, loaded lazily. A board receives
// { level, onSolve, theme } and calls onSolve() once the player has met the level's goal.
// Add one line per board: name: lazy(() => import('./Name.jsx')),
import { lazy } from 'react'

export const BOARDS = {
  GanDuel: lazy(() => import('./GanDuel.jsx')),
  OpticsObscura: lazy(() => import('./OpticsObscura.jsx')),
  AliasProbe: lazy(() => import('./AliasProbe.jsx')),
  KernelRacer: lazy(() => import('./KernelRacer.jsx')),
  EarlyStop: lazy(() => import('./EarlyStop.jsx')),
  AttendContrast: lazy(() => import('./AttendContrast.jsx')),
  HoughVote: lazy(() => import('./HoughVote.jsx')),
  RansacTrials: lazy(() => import('./RansacTrials.jsx')),
  BookCover: lazy(() => import('./BookCover.jsx')),
}

export const boardFor = (name) => BOARDS[name] ?? null

export { lazy }
