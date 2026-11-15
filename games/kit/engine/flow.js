// A piece's way through the course (games/DESIGN.md 6.7, decision 23), read off the course and the content, with no
// data of its own: where the course first gives it (a primitive from the start; a level bringing it in), where a level
// or one of its tasks gives it there only or withholds it, where a part superseding it arrives, and each step of its
// upgrade chains (the task whose work runs inside it). Each event says where in the level's content it is written, so
// a tick can open that field.
import { readItem } from '../course.js'
import { builtPieces, publications } from './pieces.js'
import { findTask } from './tasks.js'

/** The path in a level's content (`value`, without its id) of the first list item naming `type` (a part, or one of
 *  its settings or values), or null. */
function named(value, type) {
  let found = null
  const walk = (v, path) => {
    if (found) return
    if (Array.isArray(v)) v.forEach((x, k) => (typeof x === 'string' && readItem(x).part === type && !found ? (found = [...path, k]) : walk(x, [...path, k])))
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, [...path, k])
  }
  walk(value, [])
  return found
}

/**
 * [{ kind, level, task?, form?, path }] in course order: kind 'start' (a primitive, level null), 'adds' (a level brings
 * it in), 'gives' / 'withholds' (a level, or a task of it, holds it there only / does not hold it), 'replaced' (a part
 * superseding it arrives), 'step' (a task whose work runs inside it, `form` its form). `path` is the field in the
 * level's content (null: none to point at). `course` is defineCourse's, `content` the game's.
 */
export function pieceFlow(course, content, type) {
  const events = []
  const levelOf = new Map(content.levels.map(({ id, ...rest }) => [id, rest]))
  const seen = new Set()
  const push = (event) => {
    const key = JSON.stringify([event.kind, event.level, event.task ?? null, event.form ?? null])
    if (!seen.has(key)) seen.add(key) && events.push(event)
  }
  if (course.primitives.has(type)) push({ kind: 'start', level: null, path: null })
  for (const l of course.levels) {
    const value = levelOf.get(l.id) ?? {}
    const tasks = Array.isArray(value.tasks) ? value.tasks : []
    const at = (task) => (task === undefined ? value : tasks[task])
    const where = (task) => {
      const inside = named(at(task), type)
      return inside && (task === undefined ? inside : ['tasks', task, ...inside])
    }
    if (course.adds(l).includes(type)) push({ kind: 'adds', level: l.id, path: where() })
    const replacing = [...course.adds(l), ...course.builds(l)].filter((p) => p !== type && course.replaces(p).includes(type))
    if (replacing.length) push({ kind: 'replaced', level: l.id, by: replacing[0], path: null })
    for (const task of [undefined, ...tasks.map((_, k) => k)]) {
      const grain = task === undefined ? { id: l.id } : { id: l.id, task }
      const scope = task === undefined ? {} : { task }
      if (course.gives(grain).some((item) => readItem(item).part === type)) push({ kind: 'gives', level: l.id, ...scope, path: where(task) })
      if (course.withholds(grain).some((item) => readItem(item).part === type)) push({ kind: 'withholds', level: l.id, ...scope, path: where(task) })
    }
  }
  const built = builtPieces(content.partDefs)
  for (const ref of publications(content.levels, built)) {
    if (ref.type !== type || !ref.task) continue
    const found = findTask(content.levels, ref.task)
    const index = levelOf.get(found.level).tasks[found.at].publishes.findIndex(
      (entry) => entry.piece === type && entry.variant === ref.variant,
    )
    push({ kind: 'step', level: found.level, task: found.at, ...(ref.form && { form: ref.form }),
      path: ['tasks', found.at, 'publishes', index] })
  }
  const order = new Map(course.levels.map((l, k) => [l.id, k]))
  const rank = (e) => (e.level === null ? -1 : order.get(e.level) ?? course.levels.length)
  return events.map((e, k) => [e, k]).sort(([a, j], [b, k]) => rank(a) - rank(b) || (a.task ?? -1) - (b.task ?? -1) || j - k).map(([e]) => e)
}
