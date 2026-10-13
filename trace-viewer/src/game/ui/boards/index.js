// Board levels (kind: 'board') name a component here, loaded lazily. A board receives
// { level, onSolve, theme } and calls onSolve() once the player has met the level's goal.
// Add one line per board: name: lazy(() => import('./Name.jsx')),
import { lazy } from 'react'

export const BOARDS = {
  EpipolarSearch: lazy(() => import('./EpipolarSearch.jsx')),
  GanDuel: lazy(() => import('./GanDuel.jsx')),
  OpticsObscura: lazy(() => import('./OpticsObscura.jsx')),
  LightTile: lazy(() => import('./LightTile.jsx')),
  ColorMatch: lazy(() => import('./ColorMatch.jsx')),
  NormalProbe: lazy(() => import('./NormalProbe.jsx')),
  GradientProbe: lazy(() => import('./GradientProbe.jsx')),
  LightChange: lazy(() => import('./LightChange.jsx')),
  OpticsRange: lazy(() => import('./OpticsRange.jsx')),
  WaveTuner: lazy(() => import('./WaveTuner.jsx')),
  WaveMixer: lazy(() => import('./WaveMixer.jsx')),
  SpectrumMatch: lazy(() => import('./SpectrumMatch.jsx')),
  Equalizer: lazy(() => import('./Equalizer.jsx')),
  AliasProbe: lazy(() => import('./AliasProbe.jsx')),
  KernelRacer: lazy(() => import('./KernelRacer.jsx')),
  Descent: lazy(() => import('./Descent.jsx')),
  Neuron: lazy(() => import('./Neuron.jsx')),
  SlideWindow: lazy(() => import('./SlideWindow.jsx')),
  EarlyStop: lazy(() => import('./EarlyStop.jsx')),
  AttendContrast: lazy(() => import('./AttendContrast.jsx')),
  MatchRatio: lazy(() => import('./MatchRatio.jsx')),
  HoughVote: lazy(() => import('./HoughVote.jsx')),
  RansacTrials: lazy(() => import('./RansacTrials.jsx')),
  BookCover: lazy(() => import('./BookCover.jsx')),
}

export const boardFor = (name) => BOARDS[name] ?? null

export { lazy }
