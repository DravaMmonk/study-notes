import { S } from './schema.js'
import { createCapabilityRegistry, registeredOperations, registeredValueTypes, selectModuleVocabulary } from './capabilities.js'
import image from '../modules/image/module.js'
import logic from '../modules/logic/module.js'
import table from '../modules/table/module.js'
import circuit from '../modules/circuit/module.js'
import rows from '../modules/rows/module.js'
import tickBus from '../modules/tick-bus/module.js'

export const modules = [circuit, rows, tickBus, image, logic, table]
export const capabilities = createCapabilityRegistry()
for (const module of modules) module.register(capabilities)
Object.assign(registeredOperations, capabilities.operations)
Object.assign(registeredValueTypes, capabilities.tables.valueType)

export const vocabulary = {
  version: 3,
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
  const selected = choices.length === 1 ? choices[0] : {
    ...vocabulary,
    game: S.obj(Object.assign({}, ...choices.map((choice) => choice.game.fields))),
    level: S.obj({
      ...Object.fromEntries([...new Set(choices.flatMap(choice => Object.keys(choice.level.fields)))].filter(key => key !== 'tasks').map(key => {
        const schemas = choices.map(choice => choice.level.fields[key]).filter(Boolean)
        const schema = schemas.length === 1 ? schemas[0] : S.either(...schemas)
        return [key, schemas.length < choices.length || schemas.every(schema => schema.optional) ? S.opt(schema) : schema]
      })),
      tasks: S.list(S.either(...choices.map(choice => choice.level.fields.tasks.of)), { min: 1 }),
    }),
  }
  Object.defineProperty(selected, 'description', { value: vocabulary })
  return selected
}
