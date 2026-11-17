// Circuit saved works, publications, rewards and availability derived from task progress.
import { createProgress as createProgressStore, current as currentProgress, fresh as freshProgress, taskKey, completedTask, taskPassed } from 'kernel'
import { openPackedPart, packedWorkReferences } from './board/packed-boards.js'
import { openWorkshopPart } from './board/workshop-view.js'
import { solutionStamp } from 'kernel'

/** The work kept from a prerequisite's pass. */
export function passedWork(progress, task) {
  if (!task) return undefined
  const key = task.key ?? task.taskId
  const completed = completedTask(progress, task.source?.id ?? task.id, key, task.optional ?? task.source?.optional)
  return completed ? progress.built?.[key] : undefined
}

/** A prerequisite's last passed board, or its reference when all content is open. */
export function inheritedBoard(progress, task) {
  if (!task) return undefined
  const saved = passedWork(progress, task)
  const board = saved?.nodes ? saved : progress.all ? (task.source?.solution ?? task.solution) : undefined
  return board?.nodes ? structuredClone(board) : undefined
}

function isCarried(game, level, at) {
  if (level.tasks[at + 1]?.carries) return true
  if (at !== level.tasks.length - 1) return false
  return Object.values(game.byId).some((other) => other.carry === level.id || other.tasks.some((task) => (task.carry ?? task.source?.carry) === level.id))
}


/** The boards kept for the parts that run them, once `level` passes at `taskAt` (`keeps`, by default a level that
 *  unlocks something). */
function kept(game, p, level, taskAt, board) {
  const key = taskKey(level, taskAt)
  if ((!((level.keeps ?? level.unlocks?.length)) && !isCarried(game, level, taskAt)) || !board) return p.built
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

/** The course rewards made available by this completion, in course order. */
export function completionUnlocks(game, level, before, after) {
  const wasSolved = new Set(before.solved)
  const solved = new Set(after.solved)
  const known = new Set(game.earnedParts({ ...before, all: false }).map(({ part }) => part))
  const parts = new Map()
  if (!wasSolved.has(level.id)) {
    for (const part of game.unlocked({ ...level, unlocks: earnedUnlocks(level, after) })) {
      if (part.part) parts.set(part.part, part)
    }
  }
  for (const part of game.earnedParts({ ...after, all: false })) {
    if (!known.has(part.part)) parts.set(part.part, { ...part, label: part.name })
  }
  const levels = game.levels.filter((next) => !solved.has(next.id) && !game.isOpen(next, wasSolved) && game.isOpen(next, solved))
  return { parts: [...parts.values()], levels }
}

/** The work and the exact dependencies the game selected when the task passed. */
export function recordSolution(game, p, level, taskAt, work) {
  const task = level.tasks[taskAt]
  const stamped = (entry) => ({ ...entry, puzzle: p.stamps?.[entry.key] })
  const synced = new Set()
  return solutionStamp(stamped({ key: task.key, task: task.source, work }), (entry) => {
    const at = entry.at ?? { level: entry.task, circuit: entry.work }
    const view = at.level && Array.isArray(at.circuit?.nodes) && game.circuit?.forTask(at.level)
    if (view && !synced.has(view.syncOwn)) {
      view.syncOwn(p.built)
      synced.add(view.syncOwn)
    }
    const packed = view ? packedWorkReferences(at, (node, parent) => openWorkshopPart(node, parent) ?? openPackedPart(view, node)) : []
    return [...packed, ...(game.workReferences?.(entry) ?? [])].map(stamped)
  })
}


/**
 * The flags a level is played with at task `taskAt`: what progress has unlocked and what the tasks before it opened
 * (with every level open, everything before it too). What a task holds by them, and what it gives or withholds for
 * itself, is the course's to say (../course.js holds).
 */
export function flagsIn(game, p, level, taskAt) {
  const opened = level.tasks.slice(0, taskAt).flatMap((t, k) => p.all || taskPassed(game, p, level.id, k) ? t.opens ?? [] : [])
  return new Set([...game.flagsOf(p), ...opened, ...(p.all ? game.unlocksBefore(level) : [])])
}

const initial = () => ({ flags: [], built: {}, solutions: {} })
const invalidate = (progress, gone) => ({ ...progress,
  built: Object.fromEntries(Object.entries(progress.built ?? {}).filter(([key]) => !gone.has(key))),
  solutions: Object.fromEntries(Object.entries(progress.solutions ?? {}).filter(([key]) => !gone.has(key))),
})
export const fresh = () => ({ ...freshProgress(), ...initial() })
export const current = (stored, tasks) => currentProgress(stored, tasks, invalidate)
export const createProgress = ({ restoreBuilt = value => value, ...options }) => createProgressStore({
  ...options, initial, invalidate,
  restore: progress => ({ ...progress, built: restoreBuilt(progress.built) }),
})
export const circuitProgress = game => ({
  normalize: progress => ({ ...initial(), ...progress }),
  context: (progress, level, at) => flagsIn(game, progress, level, at),
  beforePass(progress, level, taskAt, work) {
    progress = { ...initial(), ...progress }
    const key = taskKey(level, taskAt)
    const board = work == null ? work : game.bindPassingBoard?.(key, work) ?? work
    const built = kept(game, progress, level, taskAt, board)
    const solutions = board == null ? progress.solutions : { ...progress.solutions, [key]: recordSolution(game, progress, level, taskAt, board) }
    const taskRewards = level.tasks[taskAt].optional ? level.tasks[taskAt].opens ?? [] : []
    return { ...progress, built, solutions, flags: [...new Set([...progress.flags, ...taskRewards])] }
  },
  afterPass(progress, level) {
    return progress.solved.includes(level.id) ? { ...progress, flags: [...new Set([...progress.flags, ...earnedUnlocks(level, progress)])] } : progress
  },
  rewards: (level, before, after) => completionUnlocks(game, level, before, after),
})
