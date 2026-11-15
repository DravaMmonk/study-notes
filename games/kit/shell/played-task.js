import { passed, saved, skipOptionalTask, taskKey, taskOpen, taskPassed } from './progress.js'

/** Resolve the screen's task, its navigation and the work it opens on. */
export function playedTask(game, progress, level, at, { go, update } = {}) {
  const { tasks } = level
  const task = tasks[at]
  const key = taskKey(level, at)
  const completed = tasks.map((_, k) => taskPassed(game, progress, level.id, k))
  const steps = {
    names: tasks.map((t) => t.step),
    optional: tasks.map((t) => Boolean(t.optional)),
    at,
    passed: completed,
    open: tasks.map((_, k) => taskOpen(game, progress, level.id, k)),
    go,
    skip: update && ((k) => {
      update((p) => skipOptionalTask(p, level, k))
      go(k + 1)
    }),
  }
  return {
    key,
    played: { ...level, ...task, steps },
    saved: progress.data[key],
    solved: progress.solved.includes(level.id) || completed[at],
    save: update && ((data) => update((p) => saved(p, level, at, data))),
    solve: update && ((score, work) => update((p) => passed(game, p, level, at, score, work))),
  }
}
