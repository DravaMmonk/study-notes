import { S } from './schema.js'
import { createCapabilityRegistry, registeredOperations, registeredValueTypes, selectCourseVocabulary } from './capabilities.js'
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
  version: 1,
  capabilities: capabilities.tables,
  kinds: capabilities.kinds,
  languages: capabilities.languages,
  courses: capabilities.schemas,
  game: S.either(...Object.values(capabilities.schemas).map((s) => s.game)),
  level: S.either(...Object.values(capabilities.schemas).map((s) => s.level)),
}

/** Course schemas remain separate until the course-model integration. */
export function vocabularyFor(course) {
  const selected = selectCourseVocabulary(vocabulary, course)
  Object.defineProperty(selected, 'description', { value: vocabulary })
  return selected
}
