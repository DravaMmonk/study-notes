// Saved progress for a game on the shared shell. It lives in this browser only, under `<game id>.v1`:
//
//   { version, solved: [levelId], flags: [flag], data: { [levelId]: anything the level keeps },
//     slots: { [levelId]: the level's other saved boards (slots.js) }, best: { [levelId]: score }, tasks: { [levelId]: tasks passed },
//     built: { [levelId]: the board that last passed a level whose board a part runs (a level of tasks: one a task) },
//
// A level of tasks keeps what each task's screen keeps, and which tasks are passed, by the task's key: in a level
// whose tasks have ids (`key`, ../engine/tasks.js) by id — data and built are { [task id]: … }, tasks is the list of
// the ids passed — so a task moved within its level or to another keeps its board; in a level whose tasks have none
// (the prototype domains, until they are redone) by place — a list a task, and how many are passed.
//     seenPower, introSeen: { [levelId]: true }, all }
//
// A game's own `progress.migrate(saved)` brings an older save (its own version numbers, or an older key it read
// before the shell existed) up to this shape; `progress.version` is the game's current version.

const blank = (version) => ({ version, solved: [], flags: [], data: {}, slots: {}, built: {}, best: {}, tasks: {}, seenPower: false, introSeen: {}, all: false })

export function createProgress({ id, version = 1, migrate = (saved) => saved, legacy = () => null }) {
  const key = `${id}.v1`
  return {
    key,
    load() {
      try {
        const stored = JSON.parse(window.localStorage.getItem(key)) ?? legacy() ?? { version }
        const saved = migrate(stored)
        return { ...blank(version), ...saved, version }
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

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
/** Whether a level keeps its tasks by id. */
const keyed = (level) => Boolean(level?.tasks?.length) && level.tasks[0].key !== undefined
/** Task k's key in its level's records: its id, or its place. */
export const taskKey = (level, k) => level.tasks[k].key ?? k

/** What a level of tasks keeps for task k, out of its record (`data[level]` or `built[level]`). */
export function taskRecord(level, record, k) {
  if (keyed(level)) return isObj(record) ? record[taskKey(level, k)] : undefined
  return Array.isArray(record) ? record[k] ?? undefined : undefined
}
/** A level's record with what task k keeps set to `value`. */
function withTask(level, record, k, value) {
  if (keyed(level)) return { ...(isObj(record) ? record : {}), [taskKey(level, k)]: value }
  const list = Array.from({ length: level.tasks.length }, (_, j) => (Array.isArray(record) ? record[j] ?? null : null))
  return Object.assign(list, { [k]: value })
}

/** Whether task k of level `id` is passed (all of them once it is solved). */
export function taskPassed(game, p, id, k) {
  if (p.solved.includes(id)) return true
  const level = game.byId[id]
  const kept = p.tasks?.[id]
  if (keyed(level)) return Array.isArray(kept) && kept.includes(taskKey(level, k))
  return k < (Number.isInteger(kept) ? kept : 0)
}

/** The task a level opens at: the first not yet passed (the last, once all are). */
export function firstTask(game, p, id) {
  const n = game.byId[id]?.tasks?.length ?? 1
  for (let k = 0; k < n; k += 1) if (!taskPassed(game, p, id, k)) return k
  return n - 1
}

/** Progress with level `id` opened at task k: the tasks before it passed, the level not solved. */
export function openAt(game, p, id, k) {
  const level = game.byId[id]
  const passedBefore = keyed(level) ? level.tasks.slice(0, k).map((_, j) => taskKey(level, j)) : k
  return { ...p, solved: p.solved.filter((x) => x !== id), tasks: { ...p.tasks, [id]: passedBefore } }
}

/** Progress with what the level's screen keeps at task `taskAt` (a level of tasks keeps one a task). */
export function saved(p, level, taskAt, data) {
  if (!level.tasks) return { ...p, data: { ...p.data, [level.id]: data } }
  return { ...p, data: { ...p.data, [level.id]: withTask(level, p.data[level.id], taskAt, data) } }
}

/** The boards kept for the parts that run them, once `level` passes at `taskAt` (`keeps`, by default a level that
 *  unlocks something; a level of tasks keeps one a task). */
function kept(p, level, taskAt) {
  const tasks = level.tasks
  const board = tasks ? taskRecord(level, p.data[level.id], taskAt) : p.data[level.id]
  if (!(level.keeps ?? level.unlocks?.length) || !board) return p.built
  if (!tasks) return { ...p.built, [level.id]: board }
  return { ...p.built, [level.id]: withTask(level, p.built[level.id], taskAt, board) }
}

/**
 * Progress once task `taskAt` of `level` passes with what the screen saved for it: a task before the last counts as
 * passed; the last (or a level without tasks) solves the level and unlocks what it unlocks. `score` is kept when the
 * game finds it better than the best so far.
 */
export function passed(game, p, level, taskAt, score = null) {
  const built = kept(p, level, taskAt)
  if (level.tasks && taskAt < level.tasks.length - 1) {
    const had = p.tasks?.[level.id]
    const now = keyed(level) ? [...new Set([...(Array.isArray(had) ? had : []), taskKey(level, taskAt)])] : Math.max(Number.isInteger(had) ? had : 0, taskAt + 1)
    return { ...p, built, tasks: { ...p.tasks, [level.id]: now } }
  }
  const best = p.best[level.id]
  return {
    ...p,
    built,
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
