// Saved progress for a game on the shared shell. It lives in this browser only, under `<game id>.v2`:
//
//   { version, solved: [level id], flags: [flag], passed: [task key], data: { [task key]: what its screen keeps },
//     slots: { [task key]: its other saved boards (slots.js) }, built: { [task key]: the board a part runs },
//     best: { [level id]: score }, introSeen: { [level id | task key]: true }, seenPower, all }
//
// What a level is (solved, its best score) is kept by its id; what a puzzle is — its board, its other boards, whether
// it is passed, the board a part runs — by its task's key (taskKey: the task's id, ../engine/tasks.js keyOf), so a
// task moved within its level or to another, or levels made one, keeps it all. A level once solved stays solved, even
// when it gains a task. `version` is the game's save version: its steps (saves.js, game.json `saves`) bring a save
// written before the content changed up to date. A save of any other shape (an older key) is not read: the player
// starts afresh.
import { keyOf } from '../engine/tasks.js'

const blank = (version) => ({ version, solved: [], flags: [], passed: [], data: {}, slots: {}, built: {}, best: {}, seenPower: false, introSeen: {}, all: false })

export function createProgress({ id, version = 1, migrate = (saved) => saved }) {
  const key = `${id}.v2`
  return {
    key,
    load() {
      try {
        const stored = JSON.parse(window.localStorage.getItem(key)) ?? { version }
        return { ...blank(version), ...migrate(stored), version }
      } catch {
        return blank(version)
      }
    },
    save(progress) {
      try {
        window.localStorage.setItem(key, JSON.stringify(progress))
      } catch {
        // Storage may be full or blocked; the game still works for this session.
      }
    },
    blank: () => ({ ...blank(version), seenPower: true }),
  }
}

// What playing a level does to progress, the same for the shell (GameShell.jsx) and a blind session
// (../engine/play/): pure functions of a game (defineGame), a progress and the level played.

/** A fresh progress, as a new save starts. */
export const fresh = (version = 1) => blank(version)

/** Task k's key: the task's id (the shell level's task `key`), `<level>#<k>` without one, the level's id without tasks. */
export const taskKey = (level, k = 0) => (level.tasks ? keyOf(level.id, level.tasks[k].key, k) : level.id)

/** Whether task k of level `id` is passed (all of them once it is solved). */
export const taskPassed = (game, p, id, k) => p.solved.includes(id) || p.passed.includes(taskKey(game.byId[id], k))

/** The task a level opens at: the first not yet passed (the last, once all are). */
export function firstTask(game, p, id) {
  const n = game.byId[id]?.tasks?.length ?? 1
  for (let k = 0; k < n; k += 1) if (!taskPassed(game, p, id, k)) return k
  return n - 1
}

/** Progress with level `id` opened at task k: the tasks before it passed, it and the level not. */
export function openAt(game, p, id, k) {
  const level = game.byId[id]
  const keys = (level.tasks ?? [null]).map((_, j) => taskKey(level, j))
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

/**
 * Progress once task `taskAt` of `level` passes with what the screen saved for it: a task before the last counts as
 * passed; the last (or a level without tasks) solves the level and unlocks what it unlocks. `score` is kept when the
 * game finds it better than the best so far.
 */
export function passed(game, p, level, taskAt, score = null) {
  const built = kept(p, level, taskAt)
  const now = { ...p, built, passed: [...new Set([...p.passed, taskKey(level, taskAt)])] }
  if (level.tasks && taskAt < level.tasks.length - 1) return now
  const best = p.best[level.id]
  return {
    ...now,
    solved: [...new Set([...p.solved, level.id])],
    flags: [...new Set([...p.flags, ...(level.unlocks ?? [])])],
    best: score && game.better(score, best) ? { ...p.best, [level.id]: score } : p.best,
  }
}

/**
 * The flags a level is played with at task `taskAt`: what progress has unlocked, what the level grants, what the tasks
 * before it opened (with every level open, everything before it too), less what the level or the task withholds.
 */
export function flagsIn(game, p, level, taskAt) {
  const tasks = level.tasks
  const opened = tasks ? tasks.slice(0, taskAt).flatMap((t) => t.opens ?? []) : []
  const set = new Set([...game.flagsOf(p), ...(level.grants ?? []), ...opened, ...(p.all ? game.unlocksBefore(level) : [])])
  for (const flag of (tasks?.[taskAt] ?? level).withhold ?? []) set.delete(flag)
  return set
}
