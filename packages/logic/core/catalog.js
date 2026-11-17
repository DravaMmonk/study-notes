import { createCapabilityRegistry, S } from 'kernel'
import module from './module.js'
import { logicReports } from './baseline.js'

export const registry = createCapabilityRegistry()
module.register(registry)

const vocabularyProjection = Symbol.for('study-notes.logic-vocabulary')

export const meaning = {
  type: 'level', read: value => value, baselineReports: logicReports,
  configuration: { words: 'course.json' },
  blueprintRules: ({ objects }) => Object.entries(objects['circuit/part'] ?? {}).filter(([, part]) => part.inside && ['logic:family-lemma', 'logic:family-rule'].includes(part.family)).map(([id]) => id.split('/').at(-1)),
  baselineStructure: ({ content }) => Object.keys(content.registries['logic/symbol'] ?? {}).length ? { symbols: content.registries['logic/symbol'] } : {},
  vocabulary(base) {
    if (base[vocabularyProjection]) return base
    const stripGrants = schema => !schema || typeof schema !== 'object' ? schema : Array.isArray(schema) ? schema.map(stripGrants) : Object.fromEntries(Object.entries(schema).map(([key, value]) => [key, key === 'fields' ? Object.fromEntries(Object.entries(value).filter(([name]) => !['adds', 'tray'].includes(name)).map(([name, field]) => [name, stripGrants(field)])) : stripGrants(value)]))
    const own = { ...registry.schemas.logic, level: stripGrants(registry.schemas.logic.level) }
    const level = base.level ? S.obj({ ...base.level.fields, ...Object.fromEntries(Object.entries(own.level.fields).filter(([key]) => key !== 'tasks').map(([key, field]) => [key, base.level.fields[key] ? S.opt(S.either(base.level.fields[key], field)) : S.opt(field)])), tasks: S.list(S.either(own.level.fields.tasks.of, base.level.fields.tasks.of), { min: 1 }) }) : own.level
    const game = S.obj({ ...base.game.fields, ...Object.fromEntries(Object.entries(own.game.fields).filter(([key]) => !['title', 'kicker', 'lede', 'chapters'].includes(key)).map(([key, field]) => [key, S.opt(field)])) })
    return { ...base, [vocabularyProjection]: true, level, game,
      kinds: Object.fromEntries([...new Set([...Object.keys(base.kinds), ...Object.keys(registry.kinds)])].map(kind => [kind, { ...base.kinds[kind], ...registry.kinds[kind] }])),
      capabilities: Object.fromEntries(Object.entries(registry.tables).map(([kind, items]) => [kind, { ...base.capabilities[kind], ...items }])),
      languages: { ...base.languages, ...registry.languages },
    }
  },
}

