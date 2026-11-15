import { sameJson } from '../engine/json-value.js'

/** A running board is identified by its task and saved slot. */
export const runKey = (task, no) => `${task}#${no}`

/** Keep the latest run, or remove it when the board changes or is deleted. */
export function keepRunMark(runs, key, mark) {
  if (sameJson(runs[key] ?? null, mark ?? null)) return runs
  const next = { ...runs }
  if (mark == null) delete next[key]
  else next[key] = mark
  return next
}
