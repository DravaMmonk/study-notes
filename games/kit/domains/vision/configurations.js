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
