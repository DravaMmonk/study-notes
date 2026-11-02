// A level is a list of tasks (games/DESIGN.md 4, 6.2): what the level says once — its title, its introduction, its
// pass text, its place in the course — and its tasks, one or more, each a puzzle of the domain done in turn: its brief,
// its hints, its board's ports, its tests, its answers. A level of one task is a plain level.
//
// Every task has an id, unique in the game and never another level's id (a level's one task usually has the level's
// own). What a player keeps of a task — its board, whether it is passed — is kept by that id (keyOf), so a task moves
// within its level or to another level and its board goes with it, with no save migration (the operations task.add,
// task.remove, task.move, task.rename, ops/operations.js). The shell plays each task as the level with the task's fields over it
// (../shell/GameShell.jsx), and so does every domain reading one (taskLevels).
import { S } from './schema.js'

const t = (zh, en) => ({ zh, en })
export const TASK_ID = '^[A-Za-z0-9][A-Za-z0-9_-]*$'

const OWN = {
  id: S.str({ pattern: TASK_ID, about: t('任务的 id：整款游戏里唯一，玩家存下的板跟着它走（只有一个任务的关通常就用关的 id）', 'the task’s id, unique in the game; what a player keeps of it goes by it (a level’s one task usually has the level’s id)') }),
  step: S.opt(S.text({ about: t('这个任务的名字，写在任务条上（一关只有一个任务时不显示）', 'the task’s name on the strip of tasks (not shown when the level has one task)') })),
}

/**
 * A level's schema: the fields it says once (`once`) and its tasks, each an id, an optional name and `task`'s fields;
 * `task` may instead be a by-schema (S.by('kind', { … })), tasks of several shapes, each case an object of its fields.
 */
export const taskLevel = (once, task) => S.obj({
  ...once,
  tasks: S.list(task.type === 'by'
    ? { ...task, cases: Object.fromEntries(Object.entries(task.cases).map(([k, c]) => [k, { ...c, fields: { ...OWN, ...c.fields } }])) }
    : S.obj({ ...OWN, ...task }), { min: 1, section: 'tasks', about: t('依次做的任务，最后一个通过就通过这一关', 'the tasks done in turn; passing the last passes the level') }),
})

/** Whether a vocabulary's levels are lists of tasks with ids. */
export const hasTaskIds = (vocabulary) => {
  const of = vocabulary.level.fields?.tasks?.of
  return Boolean(of?.fields?.id ?? (of?.type === 'by' && Object.values(of.cases).every((c) => c.fields?.id)))
}

/**
 * A task's key in a player's saves (../shell/progress.js): its id; in a level whose tasks have none (a prototype
 * domain's) `<level>#<k>`; a level without tasks is its own one task, keyed by the level's id.
 */
export const keyOf = (level, id, k) => id ?? (k === undefined || k === null ? level : `${level}#${k}`)

/** Each task of a level as a level of its own: the level's fields under the task's, its index `task`, its id `taskId`. */
export const taskLevels = ({ tasks, ...level }) => tasks.map((task, k) => {
  const { step: _step, id: taskId, ...own } = task
  return { ...level, ...own, task: k, taskId }
})

/** The level holding task `id` and the task's place there: { level, at } (level: its id), or null. */
export function findTask(levels, id) {
  for (const l of levels) {
    const at = (l.tasks ?? []).findIndex((task) => task.id === id)
    if (at >= 0) return { level: l.id, at }
  }
  return null
}

/** A new task id for level `level`: `<level>_<n>`, the smallest n from 2 that no task or level has. */
export function newTaskId(levels, level) {
  const taken = new Set([...levels.map((l) => l.id), ...levels.flatMap((l) => (l.tasks ?? []).map((task) => task.id))])
  let n = 2
  while (taken.has(`${level}_${n}`)) n += 1
  return `${level}_${n}`
}

/** What is wrong with the task ids of a game's levels ([{ id, …level }]): [{ at, says }], `at` a file and path. */
export function taskIdProblems(levels) {
  const out = []
  const levelIds = new Set(levels.map((l) => l.id))
  const seen = new Map()
  for (const l of levels) {
    for (const [k, task] of (l.tasks ?? []).entries()) {
      if (typeof task?.id !== 'string') continue
      const at = `levels/${l.id}.json.tasks[${k}].id`
      if (seen.has(task.id)) out.push({ at, says: `task id ${task.id} is also a task of ${seen.get(task.id)}` })
      else seen.set(task.id, l.id)
      if (task.id !== l.id && levelIds.has(task.id)) out.push({ at, says: `task id ${task.id} is another level’s id` })
    }
  }
  return out
}
