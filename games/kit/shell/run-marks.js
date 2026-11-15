/** A running board is identified by its task and saved slot. */
export const runKey = (task, no) => `${task}#${no}`

/** Keep the latest run, or remove it when the board changes or is deleted. */
export function keepRunMark(runs, key, mark) {
  if (JSON.stringify(runs[key] ?? null) === JSON.stringify(mark ?? null)) return runs
  const next = { ...runs }
  if (mark == null) delete next[key]
  else next[key] = mark
  return next
}
