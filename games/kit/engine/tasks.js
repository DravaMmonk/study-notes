// A level is a list of tasks (games/DESIGN.md 4, 6.2): what the level says once — its title, its introduction, its
// pass text, its place in the course — and its tasks, one or more, each a puzzle of the domain done in turn: its brief,
// its hints, its board's ports, its tests, its answers. A level of one task is a plain level.
//
// Every task has an id, unique in the game and never another level's id (a level's one task usually has the level's
// own). What a player keeps of a task — its board, whether it is passed — is kept by that id (the operations task.add,
// task.remove, task.move, ops/operations.js). The shell plays each task as the level with the task's
// fields over it (../shell/GameShell.jsx), and so does every domain reading one (taskLevels).
import { S } from './schema.js'
import { T as t } from '../shell/i18n.js'

export const TASK_ID = '^(?:@?[a-z][a-z0-9-]*/)?[A-Za-z0-9][A-Za-z0-9_-]*$'

/** A task's id, which every task has (a domain writing its own task schema puts this in it). */
export const TASK_ID_FIELD = S.str({ pattern: TASK_ID, about: t('任务的 id：整款游戏里唯一，玩家存下的板跟着它走（只有一个任务的关通常就用关的 id）') })

const FEATURED_PARTS = S.opt(S.list(S.ref('part'), {
  section: 'course', about: t('默认展开的可用元件，参考解所用的件会自动展开。', 'Available parts to show alongside those used by the reference answer.'),
}))

const PUBLISHES = S.opt(S.list(S.obj({ piece: S.ref('part'), variant: S.str({ pattern: '^[A-Za-z0-9][A-Za-z0-9_-]*$' }) }), {
  section: 'course', about: t('通过任务后，作品可以作为指定元件的实现。', 'Use the passing work as the implementation of a named piece variant.'),
}))

export const ITEM_REFERENCE = S.str({ reference: 'piece' })
export const TASK_ITEMS = Object.fromEntries(['adds', 'local', 'gives', 'withholds', 'opens', 'awards'].map((key) => [key, S.opt(S.list(ITEM_REFERENCE))]))

const OWN = {
  id: TASK_ID_FIELD,
  step: S.opt(S.text({ about: t('这个任务的名字，写在任务条上（一关只有一个任务时不显示）') })),
}

/** A task shape with the fields every task has: an object's own, or each shape of a by- or either-schema's. */
const owned = (s, fields) => (s.type === 'by' ? { ...s, cases: Object.fromEntries(Object.entries(s.cases).map(([k, c]) => [k, owned(c, fields)])) }
  : s.type === 'either' ? { ...s, of: s.of.map((option) => owned(option, fields)) }
    : { ...s, fields: { ...fields, ...s.fields } })

/**
 * A level's schema: the fields it says once (`once`) and its tasks, each an id, an optional name and `task`'s fields;
 * `task` may instead be a by-schema (S.by('kind', { … })), tasks of several shapes, each case an object of its fields
 * (or itself a by- or either-schema of such objects).
 */
export const taskLevel = (once, task, { parts = false } = {}) => {
  const keys = { ...OWN, ...TASK_ITEMS, ...(parts ? { publishes: PUBLISHES, featuredParts: FEATURED_PARTS } : {}) }
  return S.obj({
    ...TASK_ITEMS,
    ...(parts ? { featuredParts: FEATURED_PARTS } : {}),
    ...once,
    requires: S.opt(S.list(S.level(), { section: 'course', about: t('这关固有的知识前置', 'Knowledge prerequisites for this level') })),
    tasks: S.list(task.type === 'by' ? owned(task, keys) : S.obj({ ...keys, ...task }), { min: 1, section: 'tasks', about: t('依次做的任务，最后一个通过就通过这一关') }),
  })
}

/** The schema of a level's tasks in a vocabulary (its level a taskLevel), or null. */
export const tasksSchema = (vocabulary) => vocabulary.level?.fields?.tasks?.of ?? null

/** The task schemas of every shape a task may have (the cases of a by-schema, and theirs, and an either's shapes). */
export const taskShapes = (task) => (task.type === 'by' ? Object.values(task.cases).flatMap(taskShapes) : task.type === 'either' ? task.of.flatMap(taskShapes) : [task])

/** Each task of a level as a level of its own: the level's fields under the task's, its index `task`, its id `taskId`. */
export const taskLevels = ({ tasks, ...level }, positions = null) => tasks.map((task, k) => {
  const { step: _step, id: taskId, ...own } = task
  return { ...level, ...own, task: positions?.get(taskId) ?? k, taskId }
})

/** Every task id of a game's levels: a level of tasks, its tasks'; a level of one task, its own id. */
export const taskIdsOf = (levels) => new Set(levels.flatMap((l) => (Array.isArray(l.tasks) ? l.tasks.map((task) => task.id) : [l.id])))

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
