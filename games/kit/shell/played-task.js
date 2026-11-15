import { taskKey, taskOpen, taskPassed } from './progress.js'

/** Resolve the screen's task, its navigation and the work it opens on. */
export function playedTask(game, progress, level, at, { go, skip }) {
  const { tasks } = level
  const task = tasks[at]
  const key = taskKey(level, at)
  const passed = tasks.map((_, k) => taskPassed(game, progress, level.id, k))
  const steps = {
    names: tasks.map((t) => t.step),
    optional: tasks.map((t) => Boolean(t.optional)),
    at,
    passed,
    open: tasks.map((_, k) => taskOpen(game, progress, level.id, k)),
    go,
    skip,
  }
  return { key, played: { ...level, ...task, steps }, saved: progress.data[key], solved: progress.solved.includes(level.id) || passed[at] }
}
