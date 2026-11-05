import { partDesc } from '../../engine/parts/define.js'

/** Enum capabilities follow prerequisite paths and task introductions, independent of review unlock flags. */
export function configurationPolicy(levels, course, partOf) {
  const byId = new Map(levels.map((level) => [level.id, level]))
  const guided = levels.some((level) => level.tasks.some((task) => task.configurations))
  const cache = new Map()
  return (task, type, key) => {
    const supported = partOf(type)?.settings?.[key]
    if (!supported || !guided) return supported
    const id = `${task.id}#${task.task ?? 0}`
    if (!cache.has(id)) {
      const preceding = levels.filter((level) => course.before(level.id, task.id)).flatMap((level) => level.tasks)
      const current = (byId.get(task.id)?.tasks ?? []).slice(0, (task.task ?? 0) + 1)
      const declarations = new Map()
      for (const item of [...preceding, ...current]) for (const [setting, values] of Object.entries(item.configurations ?? {})) {
        declarations.set(setting, new Set([...(declarations.get(setting) ?? []), ...values]))
      }
      cache.set(id, declarations)
    }
    const declarations = cache.get(id)
    return supported.filter((value) => declarations.get(`${type}.${key}`)?.has(value) || declarations.get(`*.${key}`)?.has(value))
  }
}

/**
 * A part's description as the components box grows it (shell/index.js textFor): the options its settings open level
 * by level in play order, a revision at each level that opens one, so an option is never described before it opens.
 * Returns { desc, revisions? }; a course that introduces no options describes every one from the start.
 */
export function optionText(levels, def) {
  const keys = (def.settings ?? []).filter((s) => s.options?.some((o) => o.about)).map((s) => s.key)
  const guided = levels.some((level) => level.tasks.some((task) => task.configurations))
  if (!keys.length || !guided) return { desc: partDesc(def) }
  const open = new Map(keys.map((key) => [key, new Set()]))
  const revisions = []
  for (const level of levels) {
    let grew = false
    for (const task of level.tasks) for (const [setting, values] of Object.entries(task.configurations ?? {})) {
      const [type, key] = setting.split('.')
      if (!open.has(key) || (type !== '*' && type !== def.type)) continue
      for (const v of values) if (!open.get(key).has(v)) { open.get(key).add(v); grew = true }
    }
    if (grew) revisions.push({ at: level.id, desc: partDesc(def, (key) => [...(open.get(key) ?? [])]) })
  }
  return { desc: partDesc(def, (key) => (open.has(key) ? [] : null)), revisions }
}
