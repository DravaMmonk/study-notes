// Native modules declare their schemas; package schemas enter through kinds/.
import { contentKinds as logic } from '../modules/logic/content.js'
import { contentKinds as image } from '../modules/image/content.js'
export { SYMBOL } from '../modules/logic/content.js'
export const CONTENT_KINDS = { ...logic, ...image }

export const contentKindSchemas = Object.fromEntries(Object.entries(CONTENT_KINDS).map(([kind, definition]) => [kind, definition.schema]))

export function registerContentKinds(registry, module) {
  for (const [kind, definition] of Object.entries(CONTENT_KINDS)) if (definition.module === module) {
    registry.add('contentKind', `${module}:${kind}`, { about: definition.about, kind, folder: definition.folder ?? kind, schema: definition.schema })
  }
}
