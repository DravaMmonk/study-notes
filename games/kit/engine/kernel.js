import { CHAPTERS, COURSE_OPTIONS } from './course-schema.js'
import { registerCircuitConsumers } from './circuit-bridge.js'
import { S } from './schema.js'
import { createCapabilityRegistry, registeredOperations, registeredValueTypes, selectModuleVocabulary } from './capabilities.js'
import logic from '../modules/logic/module.js'
import table from '../modules/table/module.js'

export const modules = [logic, table]
export const capabilities = createCapabilityRegistry()
for (const module of modules) module.register(capabilities)
registerCircuitConsumers()
Object.assign(registeredOperations, capabilities.operations)
Object.assign(registeredValueTypes, capabilities.tables.valueType)

export const vocabulary = {
  plugins: { tags: { key: '<member>:<namespace>/<name>', register: 'tag(fullName, member)', reserved: ['kernel'], readers: [{ name: 'kernel/studio-left', member: 'kind' }] }, core: ['play', 'kind', 'state', 'check', 'agent', 'tag', 'object'], view: ['play', 'editor', 'display'], exports: ['kernel', 'kernel/view'], declarations: 'kinds/<name>.json' },
  meanings: capabilities.meanings,
  capabilities: capabilities.tables,
  kinds: capabilities.kinds,
  languages: capabilities.languages,
  courses: capabilities.schemas,
  game: S.either(...Object.values(capabilities.schemas).map((s) => s.game)),
  level: S.either(...Object.values(capabilities.schemas).map((s) => s.level)),
}

/** Project validation schemas for the task modules used by a content. Progression has one model. */
export function vocabularyFor(course) {
  const ids = Array.isArray(course) ? course : [course]
  const choices = ids.map((id) => selectModuleVocabulary(vocabulary, id))
  const selected = !choices.length ? { ...vocabulary, game: S.obj({ title: S.opt(S.text()), kicker: S.opt(S.text()), lede: S.opt(S.text()), chapters: S.opt(CHAPTERS), ...COURSE_OPTIONS }), level: null } : choices.length === 1 ? choices[0] : {
    ...vocabulary,
    game: S.obj(Object.fromEntries([...new Set(choices.flatMap(choice => Object.keys(choice.game.fields)))].map(key => {
      const schemas = choices.map(choice => choice.game.fields[key]).filter(Boolean)
      const schema = schemas.length === 1 ? schemas[0] : key === 'chapters'
        ? S.list(S.either(...schemas.map(schema => schema.of)), { min: 1 }) : S.either(...schemas)
      return [key, schemas.length < choices.length || schemas.some(schema => schema.optional) ? S.opt(schema) : schema]
    }))),
    level: S.obj({
      ...Object.fromEntries([...new Set(choices.flatMap(choice => Object.keys(choice.level.fields)))].filter(key => key !== 'tasks').map(key => {
        const schemas = choices.map(choice => choice.level.fields[key]).filter(Boolean)
        const schema = schemas.length === 1 ? schemas[0] : S.either(...schemas)
        return [key, schemas.length < choices.length || schemas.some(schema => schema.optional) ? S.opt(schema) : schema]
      })),
      tasks: S.list(S.either(...choices.map(choice => choice.level.fields.tasks.of)), { min: 1 }),
    }),
  }
  Object.defineProperty(selected, 'description', { value: vocabulary })
  return selected
}
