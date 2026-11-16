// Content prototypes are declared by kernel modules and stored as named package objects.
import { S } from './schema.js'

export const CONTENT_KINDS = {
  wordset: { module: 'logic', about: { en: 'A named formula-reading dictionary' }, schema: S.map(S.text()) },
  quote: { module: 'circuit', about: { en: 'Quoted names', zh: '可引用的名字' }, schema: S.obj({ text: S.str() }) },
  power: { module: 'image', about: { en: 'Power-on introduction', zh: '上电导语' }, schema: S.obj({ title: S.text(), lines: S.list(S.text()) }) },
  box: { module: 'image', about: { en: 'Piece preview configuration', zh: '元件预览配置' }, schema: S.obj({ sample: S.level(), inLevel: S.map(S.level(), { key: S.ref('unlock') }), boards: S.opt(S.map(S.board(), { key: S.ref('unlock') })) }) },
}

export const contentKindSchemas = Object.fromEntries(Object.entries(CONTENT_KINDS).map(([kind, definition]) => [kind, definition.schema]))

export function registerContentKinds(registry, module) {
  for (const [kind, definition] of Object.entries(CONTENT_KINDS)) if (definition.module === module) {
    registry.add('contentKind', `${module}:${kind}`, { about: definition.about, kind, folder: kind, schema: definition.schema })
  }
}
