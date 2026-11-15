import { sameJson } from '../engine/json-value.js'

/** A running board is identified by its task and saved slot. */
export const runKey = (task, no) => `${task}#${no}`

/** A slot can only restore a mark for the work it actually recorded. */
export const markForWork = (entry, workKey) => entry?.workKey === workKey ? entry?.mark : undefined

/** A completed run restores to its verdict even if more cases have since become visible. */
export const completedRun = Object.freeze({ finished: true })

/** Remember a completed run or a paused playback position. */
export function playbackMark(run) {
  if (!run || run.playing) return null
  return run.over ? completedRun : { moves: run.n }
}

/** Keep the latest run, or remove it when the board changes or is deleted. */
export function keepRunMark(runs, key, mark) {
  if (sameJson(runs[key] ?? null, mark ?? null)) return runs
  const next = { ...runs }
  if (mark == null) delete next[key]
  else next[key] = mark
  return next
}
