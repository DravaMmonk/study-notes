import { recordPass, skipOptionalTask, taskKey, taskOpen, taskPassed } from './progress.js'
import { saveSlot, slotsOf } from './slots.js'

/** Resolve the screen's task, its navigation and the work it opens on. */
export function playedTask(game, progress, level, at, { go, update } = {}) {
  const { tasks } = level
  const task = tasks[at]
  const key = taskKey(level, at)
  const slots = slotsOf(progress, key)
  const slot = slots.list[slots.at].no
  const slotIndex = (list) => list.findIndex(({ no }) => no === slot)
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
    slots,
    slot,
    played: { ...level, ...task, steps },
    saved: progress.data[key],
    solved: progress.solved.includes(level.id) || completed[at],
    save: update && ((data) => update((p) => {
      const index = slotIndex(slotsOf(p, key).list)
      return index < 0 ? p : saveSlot(p, key, index, data)
    })),
    solve: update && ((score, work) => {
      const done = update((p) => {
        const current = slotsOf(p, key)
        const index = slotIndex(current.list)
        if (index < 0) return p
        const draft = current.at === index ? p.data[key] : current.list[index].data
        const next = work === undefined ? p : saveSlot(p, key, index, work)
        return recordPass(game, next, level, at, score, work === undefined ? draft : work)
      })
      return slotIndex(slotsOf(done, key).list) < 0 ? null : done
    }),
  }
}
