// Generated package courses use the same registries, relations and domain readers as authored games.
import { referenceResolver } from './objects.js'

// Presentation defaults come from the current schema while the domains still have separate course shapes.
function emptyValue(schema) {
  if (schema.type === 'either') return emptyValue(schema.of.find((s) => s.type === 'oneOf' && s.values?.includes(null)) ?? schema.of[0])
  if (schema.type === 'obj') return Object.fromEntries(Object.entries(schema.fields).filter(([, s]) => !s.optional).map(([key, s]) => [key, emptyValue(s)]))
  if (schema.type === 'list') return []
  if (schema.type === 'map') return {}
  if (schema.type === 'oneOf') return schema.values[0]
  if (['num', 'int'].includes(schema.type)) return schema.min ?? 0
  if (schema.type === 'bool') return false
  return ''
}

/** Each level tag becomes a chapter. Overlapping tags claim levels in full-name order. */
export function packageCourse(id, registries, configuration, schemas) {
  const expand = referenceResolver(registries)
  const claimed = new Set()
  const fields = schemas.game.fields
  const chapterSchema = fields.chapters.of
  const chapter = (name, title, levels, layout) => {
    const defaults = emptyValue(chapterSchema)
    return { ...defaults, id: chapterSchema.fields.id.type === 'int' ? chapters.length : name,
      ...(chapterSchema.fields.title && { title }),
      ...(chapterSchema.fields.chapter && { chapter: { ...defaults.chapter, title } }),
      levels, ...(layout && { layout }),
    }
  }
  const chapters = []
  for (const [name, tag] of Object.entries(registries.tag).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) {
    if (tag.kind !== 'level') continue
    const levels = expand(`#${name}`, 'level').filter((level) => !claimed.has(level))
    levels.forEach((level) => claimed.add(level))
    const layout = Object.keys(registries.layout).sort().find((key) => registries.layout[key].of === `#${name}`)
    chapters.push(chapter(name, tag.title ?? name, levels, layout))
  }
  const remaining = Object.keys(registries.level).sort().filter((level) => !claimed.has(level))
  if (remaining.length || !chapters.length) chapters.push(chapter(`@${id}/untagged`, id, remaining))
  const defaults = emptyValue(schemas.game)
  // Package configuration is authored data. Fill only runtime defaults needed by the generated course.
  const course = { ...defaults, ...configuration, title: id, chapters, primitives: [...new Set([...Object.keys(schemas.kinds?.part ?? {}), ...Object.keys(registries.piece)])] }
  for (const kind of ['power', 'box']) if (Object.keys(registries[kind] ?? {}).length) course[kind] = Object.keys(registries[kind]).sort()[0]
  if (fields.words) course.words = Object.keys(registries.wordset ?? {}).sort()
  return course
}
