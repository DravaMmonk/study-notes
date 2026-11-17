import { recordPass, skipOptionalTask, taskKey, taskOpen, taskPassed } from './progress.js'
import { saveSlot, slotsOf } from './slots.js'

/** The task, work and unlocks seen by browser screens and by text play. */
export function taskContext(game, progress, level, at, fails = 0) {
  progress = game.progress?.normalize?.(progress) ?? progress
  return {
    game, progress, task: at, fails,
    level: { ...level, ...level.tasks[at] },
    flags: game.progress?.context?.(progress, level, at) ?? new Set(),
    saved: progress.data[taskKey(level, at)],
    solved: taskPassed(game, progress, level.id, at),
  }
}

/** Add browser navigation and actions bound to the slot actually opened. */
export function playedTask(context, { go, update } = {}) {
  const { game, progress, task: at } = context
  const level = game.byId[context.level.id]
  const { tasks } = level
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
    screen: {
      ...context,
      level: { ...context.level, steps },
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
    },
  }
}
