// A playable task selects a play. A derived play ID can distinguish tasks that share a content schema.
export const playKey = (task) => task.playId ?? task.kind

export function playOf(plays, task) {
  const key = playKey(task)
  if (!Object.hasOwn(plays, key)) throw new Error(`Unknown play "${key}" for task "${task.key ?? task.id}"`)
  return plays[key]
}
