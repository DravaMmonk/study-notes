// Browser-local task and level progress. Package-owned data is restored and invalidated
// through the callbacks supplied to createProgress. Task keys survive route changes.

/** The key a game's progress is saved under in this browser. */
export const saveKey = (id) => `${id}.v3`

/** Read another game's recorded level pass on the site's shared origin. */
export function passedLevelIn(game, level) {
  try {
    const solved = JSON.parse(window.localStorage.getItem(saveKey(game)))?.solved
    return Array.isArray(solved) && solved.includes(level)
  } catch {
    return false
  }
}

/** How many levels of game `id` this browser has solved (the hub reads it; all games share the site's origin). */
export function solvedCount(id) {
  try {
    return JSON.parse(window.localStorage.getItem(saveKey(id)))?.solved?.length ?? 0
  } catch {
    return 0
  }
}

const blank = () => ({ stamps: {}, solved: [], passed: [], skippedTasks: [], data: {}, slots: {}, best: {}, seenPower: false, introSeen: {}, all: false })

const without = (kept, gone) => Object.fromEntries(Object.entries(kept ?? {}).filter(([key]) => !gone.has(key)))

/** `stored` less what it kept of the tasks whose puzzle is no longer the one `tasks` names ({ [key]: { level, stamp } }). */
export function current(stored, tasks, invalidate = value => value) {
  const gone = new Set(Object.keys(stored.stamps).filter((key) => tasks[key]?.stamp !== stored.stamps[key]))
  if (!gone.size) return stored
  const levels = new Set([...gone].map((key) => tasks[key]?.level))
  return invalidate({
    ...stored,
    solved: stored.solved.filter((id) => !levels.has(id)),
    passed: stored.passed.filter((key) => !gone.has(key)),
    skippedTasks: (stored.skippedTasks ?? []).filter((key) => !gone.has(key)),
    data: without(stored.data, gone),
    slots: without(stored.slots, gone),
    best: without(stored.best, levels),
  }, gone)
}

/** A game's progress in this browser, kept under `id`. `tasks`: its tasks' stamps today (../engine/stamp.js taskStamps). */
export function createProgress({ id, tasks = {}, initial = () => ({}), restore = value => value, invalidate, persist = true }) {
  const key = saveKey(id)
  const stamps = Object.fromEntries(Object.entries(tasks).map(([task, { stamp }]) => [task, stamp]))
  const empty = () => ({ ...blank(), ...initial(), stamps })
  const listeners = new Set()
  let raw
  let snapshot = empty()

  function load() {
    if (!persist) return snapshot
    let latest
    try {
      latest = window.localStorage.getItem(key)
    } catch {
      return snapshot
    }
    if (latest === raw) return snapshot
    raw = latest
    try {
      const stored = JSON.parse(raw)
      if (!stored?.stamps) return (snapshot = empty())
      const progress = { ...current({ ...blank(), ...initial(), ...stored }, tasks, invalidate), stamps }
      snapshot = restore(progress)
    } catch {
      snapshot = empty()
    }
    return snapshot
  }

  function save(progress) {
    snapshot = progress
    try {
      const serialized = JSON.stringify({ ...progress, stamps })
      if (persist) window.localStorage.setItem(key, serialized)
      raw = serialized
    } catch {
      // Storage may be full or blocked; the game still works for this session.
    }
    listeners.forEach((notify) => notify())
  }

  return {
    key,
    load,
    blank: () => ({ ...empty(), seenPower: true }),
    update(change) {
      // A tab or another notes embed may have written since this screen rendered.
      const before = load()
      const after = change(before)
      if (after !== before) save(after)
      return after
    },
    subscribe(notify) {
      const onStorage = (event) => { if (event.key === key || event.key === null) notify() }
      if (persist) window.addEventListener('storage', onStorage)
      listeners.add(notify)
      return () => {
        if (persist) window.removeEventListener('storage', onStorage)
        listeners.delete(notify)
      }
    },
  }
}

// What playing a level does to progress, the same for the shell (GameShell.jsx) and a blind session
// (../engine/play/): pure functions of a game (defineGame), a progress and the level played.

/** A fresh progress, as a blind session starts (the power-ups already shown). */
export const fresh = () => ({ ...blank(), seenPower: true })

/** Task k's key: the task's id (the shell level's task `key`). */
export const taskKey = (level, k = 0) => level.tasks[k].key

export const completedTask = (p, id, key, optional) => p.passed.includes(key) || (!p.all && !optional && p.solved.includes(id))

/** Whether task k passed individually or is a required task in a normally completed level. */
export const taskPassed = (game, p, id, k) => {
  const task = game.byId[id].tasks[k]
  return completedTask(p, id, task.key, task.optional)
}

/** Opening tasks is separate from completing them. */
export const taskOpen = (game, p, id, k) => Boolean(p.all || taskPassed(game, p, id, k) || game.byId[id].tasks.slice(0, k).every((task, i) => task.optional || taskPassed(game, p, id, i)))

/** The task a level opens at: the first not yet passed (the last, once all are). */
export function firstTask(game, p, id) {
  const n = game.byId[id].tasks.length
  if (p.all && p.solved.includes(id)) return n - 1
  for (let k = 0; k < n; k += 1) if (!taskPassed(game, p, id, k) && !(game.byId[id].tasks[k].optional && (p.skippedTasks ?? []).includes(taskKey(game.byId[id], k)))) return k
  return n - 1
}

/** The next unfinished required task, preferring later tasks before revisiting earlier ones. */
export function nextRequiredTask(game, p, id, current) {
  const tasks = game.byId[id].tasks
  const pending = (k) => k !== current && !tasks[k].optional && !taskPassed(game, p, id, k)
  for (let k = current + 1; k < tasks.length; k += 1) if (pending(k)) return k
  if (p.all) return -1
  for (let k = 0; k < current; k += 1) if (pending(k)) return k
  return -1
}

/** Progress with level `id` opened at task k: the tasks before it passed, it and the level not. */
export function openAt(game, p, id, k) {
  const level = game.byId[id]
  const keys = level.tasks.map((task) => task.key)
  return { ...p, solved: p.solved.filter((x) => x !== id), passed: [...new Set([...p.passed.filter((x) => !keys.includes(x)), ...keys.slice(0, k)])] }
}

/** Progress with what the level's screen keeps at task `taskAt`. */
export const saved = (p, level, taskAt, data) => ({ ...p, data: { ...p.data, [taskKey(level, taskAt)]: data } })

/** Remember a skipped optional task so the next visit opens on unfinished required work. */
export function skipOptionalTask(progress, level, at) {
  if (!level.tasks[at]?.optional) return progress
  const key = taskKey(level, at)
  const skippedTasks = progress.skippedTasks ?? []
  if (skippedTasks.includes(key)) return progress
  return { ...progress, skippedTasks: [...skippedTasks, key] }
}

/** Save the judged draft and record its pass. */
export function passed(game, progress, level, taskAt, score = null, passingWork) {
  const p = passingWork === undefined ? progress : saved(progress, level, taskAt, passingWork)
  return recordPass(game, p, level, taskAt, score, p.data[taskKey(level, taskAt)])
}

/** Record the exact work judged on this pass and finish the level when its required tasks have passed. */
export function recordPass(game, p, level, taskAt, score, work) {
  const key = taskKey(level, taskAt)
  p = game.progress?.beforePass?.(p, level, taskAt, work) ?? p
  const best = taskAt === level.tasks.length - 1 && score && game.better(score, p.best[level.id])
    ? { ...p.best, [level.id]: score } : p.best
  const now = { ...p, best, passed: [...new Set([...p.passed, key])], skippedTasks: (p.skippedTasks ?? []).filter(skipped => skipped !== key) }
  const required = level.tasks.map((task, k) => task.optional ? null : k).filter((k) => k !== null)
  const allRequiredPassed = (required.length ? required : level.tasks.map((_, k) => k)).every((k) => taskPassed(game, now, level.id, k))
  const mayFinish = p.all && !level.tasks[taskAt].optional ? nextRequiredTask(game, now, level.id, taskAt) === -1 : allRequiredPassed
  if (!mayFinish) return game.progress?.afterPass?.(now, level) ?? now
  const completed = { ...now, solved: [...new Set([...p.solved, level.id])] }
  return game.progress?.afterPass?.(completed, level) ?? completed
}
