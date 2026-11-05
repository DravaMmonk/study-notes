// What the game page's marks (../shell/edit.js) are in a level's content, for the studio editing on the page
// (games/DESIGN.md 6.7). A mark says where a field shows — `at`, a path in the level as the screen knows it, `scope`,
// the level or the task played, `task`, that task's index — and the content says where it is: in a level of tasks
// (../engine/tasks.js) a task's field is under `tasks[task]` and a field all its tasks share is on the level; a level
// that is no list of tasks has them all on itself. Domain-free: only the content and its schema are read.
import { getAt, parsePath, showPath } from '../engine/ops/edit.js'
import { sectionOf, shapeAt } from '../engine/schema.js'
import { blank, opFor } from './form.js'

const copy = (v) => JSON.parse(JSON.stringify(v))

/** The places a mark may be, the likelier first: in its scope, then the other; a paragraph of a text the screen
 *  splits (brief[1]) may be the whole text. */
function candidates(value, { at, scope, task }) {
  const all = parsePath(at)
  const forms = typeof all.at(-1) === 'number' ? [all, all.slice(0, -1)] : [all]
  const tasked = Array.isArray(value?.tasks) && Number.isInteger(task)
  return forms.flatMap((keys) => {
    const inTask = tasked ? ['tasks', task, ...keys] : null
    return (scope === 'task' ? [inTask, keys] : [keys, inTask]).filter(Boolean)
  })
}

/**
 * The path in a level's content (`value`, without its id) of the field a mark names: where it is, else where the
 * schema has room for it; null when it is in neither (a text the domain makes, not one the content holds).
 */
export function markPath(value, vocabulary, mark) {
  const places = candidates(value, mark)
  return places.find((p) => getAt(value, p) !== undefined)
    ?? places.find((p) => shapeAt(vocabulary.level, value, p, { vocabulary }))
    ?? null
}

/**
 * What a + on the page adds (a mark on a list: a hint, a page, a test, a task), as one operation on level `level`:
 * { op, at } — `at` the new item's path (to pick it). A new item of words alone (a hint, a page) starts blank, to be
 * written; any other copies its neighbour (a test), so it is whole at once; a list not there yet starts with the one
 * item. A new task copies the task played, without its id, its name and its own introduction, so the level plays on
 * at once, and goes after it (task.add). Null when the level has no room for it.
 */
export function addFor(level, value, vocabulary, mark) {
  const path = markPath(value, vocabulary, mark)
  if (!path) return null
  const schema = shapeAt(vocabulary.level, value, path, { vocabulary })
  if (schema?.type !== 'list') return null
  const ctx = { vocabulary }
  const list = getAt(value, path) ?? []
  const at = mark.index === null || mark.index === undefined ? list.length : Math.min(list.length, mark.index + 1)
  const near = list[Math.min(at, list.length) - 1] ?? list[0]
  if (path.length === 1 && path[0] === 'tasks') {
    const { id, step: _step, intro: _intro, ...task } = copy(list[mark.task] ?? near)
    return { op: { op: 'task.add', level, data: task, after: id }, at: ['tasks', mark.task + 1] }
  }
  const item = near !== undefined && sectionOf(schema.of) !== 'read' ? copy(near) : blank(schema.of, ctx)
  return { op: opFor({ level }, path, { set: [...list.slice(0, at), item, ...list.slice(at)] }, 'list'), at: [...path, at] }
}

/** The mark of a field of a level's content, to draw it picked on the page: a task's under that task (the task
 *  itself by its name), the level's own on the level; on a level that is no list of tasks, in either scope. */
export function markOf(value, path) {
  if (path[0] === 'tasks' && Number.isInteger(path[1])) return { at: path.length > 2 ? showPath(path.slice(2)) : 'step', scope: 'task', task: path[1] }
  return { at: showPath(path), scope: Array.isArray(value?.tasks) ? 'level' : null }
}
