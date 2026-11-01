// Saved progress for a game on the shared shell. It lives in this browser only, under `<game id>.v1`:
//
//   { version, solved: [levelId], flags: [flag], data: { [levelId]: anything the level keeps },
//     slots: { [levelId]: the level's other saved boards (slots.js) }, best: { [levelId]: score }, tasks: { [levelId]: tasks passed },
//     built: { [levelId]: the board that last passed a level whose board a part runs (a level of tasks: a list, one
//              board a task) },
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

/** How many of a level's tasks are passed (all of them once it is solved). */
export const tasksDone = (game, p, id) => (p.solved.includes(id) ? game.byId[id]?.tasks?.length ?? 1 : p.tasks?.[id] ?? 0)

/** The task a level opens at: the first not yet passed. */
export const firstTask = (game, p, id) => Math.min(tasksDone(game, p, id), (game.byId[id]?.tasks?.length ?? 1) - 1)

/** Progress with what the level's screen keeps at task `taskAt` (a level of tasks keeps a list, one entry a task). */
export function saved(p, level, taskAt, data) {
  if (!level.tasks) return { ...p, data: { ...p.data, [level.id]: data } }
  const list = Array.from({ length: level.tasks.length }, (_, k) => (Array.isArray(p.data[level.id]) ? p.data[level.id][k] ?? null : null))
  return { ...p, data: { ...p.data, [level.id]: Object.assign(list, { [taskAt]: data }) } }
}

/** The boards kept for the parts that run them, once `level` passes at `taskAt` (`keeps`, by default a level that
 *  unlocks something; a level of tasks keeps one a task). */
function kept(p, level, taskAt) {
  const tasks = level.tasks
  const board = tasks ? p.data[level.id]?.[taskAt] : p.data[level.id]
  if (!(level.keeps ?? level.unlocks?.length) || !board) return p.built
  if (!tasks) return { ...p.built, [level.id]: board }
  const list = Array.isArray(p.built[level.id]) ? p.built[level.id] : []
  return { ...p.built, [level.id]: Object.assign(Array.from({ length: tasks.length }, (_, k) => list[k] ?? null), { [taskAt]: board }) }
}

/**
 * Progress once task `taskAt` of `level` passes with what the screen saved for it: a task before the last counts as
 * passed; the last (or a level without tasks) solves the level and unlocks what it unlocks. `score` is kept when the
 * game finds it better than the best so far.
 */
export function passed(game, p, level, taskAt, score = null) {
  const built = kept(p, level, taskAt)
  if (level.tasks && taskAt < level.tasks.length - 1) return { ...p, built, tasks: { ...p.tasks, [level.id]: Math.max(tasksDone(game, p, level.id), taskAt + 1) } }
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
