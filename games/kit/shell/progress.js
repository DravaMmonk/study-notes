// Saved progress for a game on the shared shell. It lives in this browser only, under saveKey(<game id>):
//
//   { stamp, solved: [level id], flags: [flag], passed: [task key], data: { [task key]: what its screen keeps },
//     slots: { [task key]: its other saved boards (slots.js) }, built: { [task key]: the board a part runs },
//     best: { [level id]: score }, introSeen: { [level id | task key]: true }, seenPower, all }
//
// What a level is (solved, its best score) is kept by its id; what a puzzle is — its board, its other boards, whether
// it is passed, the board a part runs — by its task's key (taskKey: the task's id, ../engine/tasks.js keyOf), so a
// task moved within its level or to another, or levels made one, keeps it all. A level once solved stays solved, even
// when it gains a task. `stamp` is the stamp of the puzzles it was made on (../engine/stamp.js): while the games are
// in development no save is carried across a change, so a save made on other puzzles (or of any other shape) is not
// read and the player starts afresh.

/** The key a game's progress is saved under in this browser. */
export const saveKey = (id) => `${id}.v2`

/** How many levels of game `id` this browser has solved (the hub reads it; all games share the site's origin). */
export function solvedCount(id) {
  try {
    return JSON.parse(window.localStorage.getItem(saveKey(id)))?.solved?.length ?? 0
  } catch {
    return 0
  }
}

const blank = (stamp = null) => ({ stamp, solved: [], flags: [], passed: [], skippedTasks: [], data: {}, slots: {}, built: {}, best: {}, seenPower: false, introSeen: {}, all: false })

/** A game's progress in this browser, kept under `id` for the puzzles `stamp` names. */
export function createProgress({ id, stamp }) {
  const key = saveKey(id)
  return {
    key,
    load() {
      try {
        const stored = JSON.parse(window.localStorage.getItem(key))
        return stored?.stamp === stamp ? { ...blank(stamp), ...stored } : blank(stamp)
      } catch {
        return blank(stamp)
      }
    },
    save(progress) {
      try {
        window.localStorage.setItem(key, JSON.stringify(progress))
      } catch {
        // Storage may be full or blocked; the game still works for this session.
      }
    },
    blank: () => ({ ...blank(stamp), seenPower: true }),
  }
}

// What playing a level does to progress, the same for the shell (GameShell.jsx) and a blind session
// (../engine/play/): pure functions of a game (defineGame), a progress and the level played.

/** A fresh progress, as a blind session starts (the power-ups already shown). */
export const fresh = () => ({ ...blank(), seenPower: true })

/** Task k's key: the task's id (the shell level's task `key`). */
export const taskKey = (level, k = 0) => level.tasks[k].key

/** Required prerequisites, passing through optional levels without counting them as completed. */
export function requiredLevels(level, byId, requiresOf) {
  return [...new Set(requiresOf(level).flatMap((id) => byId[id]?.optional ? requiredLevels(byId[id], byId, requiresOf) : [id]))]
}

/** Whether task k of level `id` is passed (all of them once it is solved). */
export const taskPassed = (game, p, id, k) => p.passed.includes(taskKey(game.byId[id], k)) || (!game.byId[id].tasks[k].optional && p.solved.includes(id))

/** Opening tasks is separate from completing them. */
export const taskOpen = (game, p, id, k) => Boolean(p.all || taskPassed(game, p, id, k) || game.byId[id].tasks.slice(0, k).every((task, i) => task.optional || taskPassed(game, p, id, i)))

/** The task a level opens at: the first not yet passed (the last, once all are). */
export function firstTask(game, p, id) {
  const n = game.byId[id].tasks.length
  for (let k = 0; k < n; k += 1) if (!taskPassed(game, p, id, k) && !(game.byId[id].tasks[k].optional && (p.skippedTasks ?? []).includes(taskKey(game.byId[id], k)))) return k
  return n - 1
}

/** The next unfinished required task, preferring later tasks before revisiting earlier ones. */
export function nextRequiredTask(game, p, id, current) {
  const tasks = game.byId[id].tasks
  const pending = (k) => k !== current && !tasks[k].optional && !taskPassed(game, p, id, k)
  for (let k = current + 1; k < tasks.length; k += 1) if (pending(k)) return k
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

/** The boards kept for the parts that run them, once `level` passes at `taskAt` (`keeps`, by default a level that
 *  unlocks something). */
function kept(p, level, taskAt) {
  const key = taskKey(level, taskAt)
  const board = p.data[key]
  if (!(level.keeps ?? level.unlocks?.length) || !board) return p.built
  return { ...p.built, [key]: board }
}

/** Level rewards from an optional task require that task to have actually been passed. */
export function earnedUnlocks(level, progress) {
  return (level.unlocks ?? []).filter((flag) => {
    if (level.levelUnlocks?.includes(flag)) return true
    const owners = level.tasks.filter((task) => (task.opens ?? []).includes(flag))
    return !owners.length || owners.some((task) => !task.optional || progress.passed.includes(task.key))
  })
}

/** Record the task and its board; solve the level once every task has actually passed. */
export function passed(game, p, level, taskAt, score = null) {
  const built = kept(p, level, taskAt)
  const best = taskAt === level.tasks.length - 1 && score && game.better(score, p.best[level.id])
    ? { ...p.best, [level.id]: score } : p.best
  const taskRewards = level.tasks[taskAt].optional ? level.tasks[taskAt].opens ?? [] : []
  const now = { ...p, built, best, flags: [...new Set([...p.flags, ...taskRewards])], passed: [...new Set([...p.passed, taskKey(level, taskAt)])], skippedTasks: (p.skippedTasks ?? []).filter((key) => key !== taskKey(level, taskAt)) }
  const required = level.tasks.map((task, k) => task.optional ? null : k).filter((k) => k !== null)
  if (!(required.length ? required : level.tasks.map((_, k) => k)).every((k) => taskPassed(game, now, level.id, k))) return now
  return {
    ...now,
    solved: [...new Set([...p.solved, level.id])],
    flags: [...new Set([...now.flags, ...earnedUnlocks(level, now)])],
  }
}

/**
 * The flags a level is played with at task `taskAt`: what progress has unlocked, what the level grants, what the tasks
 * before it opened (with every level open, everything before it too), less what the level or the task withholds.
 */
export function flagsIn(game, p, level, taskAt) {
  const { tasks } = level
  const opened = tasks.slice(0, taskAt).flatMap((t, k) => p.all || taskPassed(game, p, level.id, k) ? t.opens ?? [] : [])
  const set = new Set([...game.flagsOf(p), ...(level.grants ?? []), ...opened, ...(p.all ? game.unlocksBefore(level) : [])])
  for (const flag of tasks[taskAt].withhold ?? []) set.delete(flag)
  return set
}
